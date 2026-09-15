from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.portal_repository import PortalRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.services.team_service import TeamService
from app.schemas.portals import GuideDashboardResponse
from app.schemas.teams import TeamResponse
from app.schemas.submissions import SubmissionResponse
from app.exceptions.custom import NotFoundException, BadRequestException, ForbiddenException
from app.models.users import User

class GuidePortalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.portal_repo = PortalRepository(db)
        self.team_repo = TeamRepository(db)
        self.sub_repo = SubmissionRepository(db)
        self.proj_repo = ProjectRepository(db)
        self.audit_repo = AuditNotificationRepository(db)
        self.team_service = TeamService(db)

    async def get_dashboard(self, guide_user: User) -> GuideDashboardResponse:
        teams = await self.portal_repo.get_guide_assigned_teams(guide_user.id)
        team_resps = [self.team_service._build_team_response(t) for t in teams]

        pending_subs = await self.portal_repo.get_pending_weekly_submissions_for_guide(guide_user.id)
        
        pending_approvals = 0
        total_progress = 0
        for t in teams:
            if t.project and t.project.guide_approval_status in ["Pending Review", "PENDING"]:
                pending_approvals += 1
            total_progress += t.progress

        avg_progress = int(total_progress / len(teams)) if teams else 0

        return GuideDashboardResponse(
            assigned_teams_count=len(teams),
            pending_reviews_count=len(pending_subs),
            pending_approvals_count=pending_approvals,
            overall_progress=avg_progress,
            teams=team_resps
        )

    async def get_assigned_teams(self, guide_user: User) -> List[TeamResponse]:
        teams = await self.portal_repo.get_guide_assigned_teams(guide_user.id)
        return [self.team_service._build_team_response(t) for t in teams]

    async def get_pending_weekly_submissions(self, guide_user: User) -> List[dict]:
        subs = await self.portal_repo.get_pending_weekly_submissions_for_guide(guide_user.id)
        res = []
        for s in subs:
            res.append({
                "submissionId": str(s.id),
                "teamId": str(s.team_id),
                "teamNo": s.team.team_no if s.team else "",
                "weekNumber": s.week_number,
                "title": s.title,
                "submissionDate": s.submission_date,
                "status": s.status,
                "problemStatement": s.problem_statement,
                "solution": s.solution,
                "technologyUsed": s.technology_used,
                "repoUrl": s.repo_url,
                "demoUrl": s.demo_url,
                "filesCount": len(s.files)
            })
        return res

    async def review_submission(
        self,
        submission_id: UUID,
        status: str,
        comments: Optional[str],
        score: Optional[int],
        guide_user: User
    ):
        sub = await self.sub_repo.get_submission_by_id(submission_id)
        if not sub:
            raise NotFoundException("Submission record not found.")

        team = sub.team
        if not team or team.guide_id != guide_user.id:
            roles = [r.name.lower() for r in guide_user.roles]
            if "admin" not in roles and "advisor" not in roles and "hod" not in roles:
                raise ForbiddenException("Access denied. You can only review submissions for your assigned teams.")

        status_clean = status.strip().upper()
        if status_clean not in ["APPROVED", "REVISION_REQUESTED", "SUBMITTED", "UNDER_REVIEW"]:
            raise BadRequestException("Invalid review status. Allowed: APPROVED, REVISION_REQUESTED.")

        sub.status = status_clean
        if comments is not None:
            sub.comments = comments.strip()
        if score is not None:
            if score < 0 or score > 100:
                raise BadRequestException("Score must be between 0 and 100.")
            sub.score = score
        sub.guide_review_date = datetime.now(timezone.utc)

        # Recalculate team progress based on approved deliverables
        subs = await self.sub_repo.get_submissions_by_team_id(team.id)
        approved_count = len([s for s in subs if s.status in ["SUBMITTED", "APPROVED"]])
        team.progress = min(100, int((approved_count / 6.0) * 100))

        await self.audit_repo.create_notification(
            team_id=team.id,
            title=f"Week {sub.week_number} Reviewed",
            message=f"Guide reviewed Week {sub.week_number} deliverable: Status is {status_clean}.",
            notification_type="INFO"
        )

        await self.db.commit()
        return {"success": True, "status": sub.status, "progress": team.progress}
