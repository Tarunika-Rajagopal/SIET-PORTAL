"""Guide service handling business logic and authorization for guide operations."""
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Team, WeeklySubmission
from schemas import ReviewSubmissionRequest
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from repositories.project_repository import ProjectRepository


def _team_brief(t: Team) -> Dict[str, Any]:
    return {
        "id": str(t.id),
        "teamId": t.team_id,
        "teamNo": t.team_no,
        "projectTitle": t.project_title or "",
        "status": t.status or "In Progress",
        "progress": t.progress or 0,
        "batch": t.batch,
        "section": t.class_name,
        "guideName": t.guide_name or "",
        "advisorName": t.advisor_name or "",
        "isTitleApproved": bool(t.is_title_approved),
        "guideApprovalStatus": t.guide_approval_status or "Pending",
        "memberCount": len(t.members) if t.members else 0,
    }


class GuideService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.sub_repo = SubmissionRepository(session)
        self.project_repo = ProjectRepository(session)

    async def get_guide_teams(self, user: User) -> List[Dict[str, Any]]:
        guide_name = user.name or ""
        teams = await self.team_repo.list_by_guide(user.email, guide_name if guide_name else None)
        return [_team_brief(t) for t in teams]

    async def get_guide_dashboard(self, user: User) -> Dict[str, Any]:
        guide_name = user.name or ""
        teams = await self.team_repo.list_by_guide(user.email, guide_name if guide_name else None)
        team_ids = [t.id for t in teams]

        total_submissions = 0
        pending_reviews = 0
        approved_titles = 0
        pending_titles = 0

        if team_ids:
            total_submissions = await self.sub_repo.count_by_teams(team_ids)
            pending_reviews = await self.sub_repo.count_by_teams(team_ids, status="Submitted")
            approved_titles = await self.project_repo.count_title_approvals_by_teams(team_ids, status="Approved")
            pending_titles = await self.project_repo.count_title_approvals_by_teams(team_ids, status="Pending")

        return {
            "totalTeams": len(teams),
            "totalSubmissions": total_submissions,
            "pendingReviews": pending_reviews,
            "approvedTitles": approved_titles,
            "pendingTitles": pending_titles,
            "teams": [_team_brief(t) for t in teams],
        }

    async def get_weekly_submissions(self, user: User) -> List[Dict[str, Any]]:
        guide_name = user.name or ""
        teams = await self.team_repo.list_by_guide(user.email, guide_name if guide_name else None)
        team_ids = [t.id for t in teams]
        if not team_ids:
            return []

        team_map = {t.id: t for t in teams}
        subs = await self.sub_repo.list_by_teams(team_ids)
        out = []
        for s in subs:
            t = team_map.get(s.team_id)
            out.append({
                "id": str(s.id),
                "submissionId": str(s.id),
                "week": s.week,
                "teamId": t.team_id if t else "",
                "teamNo": t.team_no if t else "",
                "projectTitle": s.project_title or (t.project_title if t else ""),
                "status": s.status or "Pending",
                "submissionDate": s.submission_date or "",
                "score": float(s.score) if s.score is not None else None,
            })
        return out

    async def review_submission(self, submission_id: str, req: ReviewSubmissionRequest, user: User) -> Dict[str, Any]:
        try:
            sid = uuid.UUID(submission_id)
        except ValueError:
            raise HTTPException(400, "Invalid submission ID format")

        s = await self.sub_repo.get_by_id(sid)
        if not s:
            raise HTTPException(404, "Submission not found")

        # Authorize: submission must belong to a team supervised by this guide
        team = await self.team_repo.get_by_id(s.team_id)
        guide_name = user.name or ""
        is_guide = False
        if team:
            if team.guide_email and team.guide_email.lower() == user.email.lower():
                is_guide = True
            elif team.guide_name and guide_name and guide_name.lower() in team.guide_name.lower():
                is_guide = True
        if not is_guide:
            raise HTTPException(403, "You are not authorized to review submissions for this team")

        s.status = "Approved" if req.status.upper() == "APPROVED" else "Revision Requested"
        s.comments = req.comments or s.comments
        if req.score is not None:
            s.score = req.score
        s.guide_review_date = datetime.now().strftime("%d %b %Y")

        await self.session.commit()
        await self.session.refresh(s)
        return {"success": True, "message": f"Submission reviewed: {s.status}", "id": str(s.id)}
