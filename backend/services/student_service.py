"""Student service for managing student team queries and deliverable submissions."""
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import User, Team, TeamMember, WeeklySubmission, Setting
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from schemas import SubmitDeliverablesRequest


class StudentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.sub_repo = SubmissionRepository(session)

    @staticmethod
    def _format_team(t: Team) -> dict:
        members = []
        if t.members:
            for m in t.members:
                members.append({
                    "name": m.name,
                    "rollNo": m.roll_no,
                    "email": m.email,
                    "phone": m.phone or "",
                    "isLead": m.is_lead,
                    "role": m.member_role or ("Team Lead" if m.is_lead else "Team Member"),
                })
        return {
            "id": t.team_id or str(t.id),
            "teamId": t.team_id,
            "teamNo": t.team_no,
            "projectTitle": t.project_title or "",
            "submittedTitle": t.submitted_title or t.project_title or "",
            "isTitleApproved": bool(t.is_title_approved),
            "guideApprovalStatus": t.guide_approval_status or "Pending",
            "rejectionReason": t.rejection_reason or "",
            "guideName": t.guide_name or "",
            "advisorName": t.advisor_name or "",
            "batch": t.batch,
            "section": t.class_name,
            "status": t.status or "In Progress",
            "progress": t.progress or 0,
            "problemStatement": t.problem_statement or "",
            "proposedSolution": t.proposed_solution or "",
            "abstract": t.abstract or "",
            "repoUrl": t.repo_url or "",
            "demoUrl": t.demo_url or "",
            "members": members,
        }

    @staticmethod
    def _format_sub(s: WeeklySubmission) -> dict:
        return {
            "id": str(s.id),
            "week": s.week,
            "title": s.title or f"Week {s.week} Deliverables",
            "dueDate": s.due_date or "",
            "status": s.status or "Pending",
            "submissionDate": s.submission_date or "",
            "fileName": s.file_name or "",
            "fileSize": s.file_size or "",
            "comments": s.comments or "",
            "score": float(s.score) if s.score is not None else None,
            "maxScore": float(s.max_score) if s.max_score is not None else 100.0,
            "projectTitle": s.project_title or "",
            "problemStatement": s.problem_statement or "",
            "solution": s.solution or "",
            "technologyUsed": s.technology_used or "",
            "obstaclesFaced": s.obstacles_faced or "",
            "abstract": s.abstract or "",
            "presentationFile": s.presentation_file or "",
            "pdfFile": s.pdf_file or "",
            "repoUrl": s.repo_url or "",
            "demoUrl": s.demo_url or "",
            "screenshotFile": s.screenshot_file or "",
            "guideName": s.guide_name or "",
            "guideReviewDate": s.guide_review_date or "",
        }

    async def _find_team(self, user: User, with_members: bool = False) -> Team:
        team = None
        if user.team_id:
            if with_members:
                team = await self.team_repo.get_with_members(user.team_id)
            else:
                team = await self.team_repo.get_by_team_id_string(user.team_id)

        if not team:
            clauses = []
            if user.roll_no:
                clauses.append(TeamMember.roll_no == user.roll_no)
            if user.email:
                clauses.append(TeamMember.email == user.email)
            if clauses:
                from sqlalchemy import or_
                res = await self.session.execute(select(TeamMember).where(or_(*clauses)))
                tm = res.scalar_one_or_none()
                if tm and tm.team_id:
                    if with_members:
                        team = await self.team_repo.get_with_members(tm.team_id)
                    else:
                        team = await self.team_repo.get_by_id(tm.team_id)

        if not team:
            raise HTTPException(404, "Student is not assigned to any team")
        return team

    async def get_team(self, user: User) -> dict:
        team = await self._find_team(user, with_members=True)
        return self._format_team(team)

    async def get_submissions(self, user: User) -> List[dict]:
        team = await self._find_team(user, with_members=False)
        rows = await self.sub_repo.list_by_team(team.id)
        return [self._format_sub(s) for s in rows]

    async def get_submission_by_week(self, user: User, week: int) -> dict:
        team = await self._find_team(user, with_members=False)
        s = await self.sub_repo.get_by_team_and_week(team.id, week)
        if not s:
            return {
                "week": week,
                "title": f"Week {week} Deliverables",
                "status": "Pending",
                "projectTitle": team.project_title or "",
                "problemStatement": team.problem_statement or "",
                "solution": team.proposed_solution or "",
                "technologyUsed": "",
                "obstaclesFaced": "",
                "abstract": team.abstract or "",
                "repoUrl": team.repo_url or "",
                "demoUrl": team.demo_url or "",
            }
        return self._format_sub(s)

    async def get_week_releases(self) -> dict:
        """Return release status for all 4 weekly submissions from database."""
        res = await self.session.execute(select(Setting).where(Setting.key == "week_release_status"))
        setting = res.scalar_one_or_none()
        default_status = {"1": True, "2": True, "3": False, "4": False}
        if not setting or not isinstance(setting.value, dict):
            return default_status
        return {
            "1": bool(setting.value.get("1", setting.value.get(1, True))),
            "2": bool(setting.value.get("2", setting.value.get(2, True))),
            "3": bool(setting.value.get("3", setting.value.get(3, False))),
            "4": bool(setting.value.get("4", setting.value.get(4, False))),
        }

    async def submit_deliverables(self, user: User, week: int, req: SubmitDeliverablesRequest) -> dict:
        # Strict server-side verification: reject submission if week is locked by HOD
        releases = await self.get_week_releases()
        is_rel = bool(releases.get(str(week), False) or releases.get(int(week), False))
        if not is_rel:
            raise HTTPException(
                status_code=403,
                detail=f"Week {week} submissions are locked and have not been released by the Head of Department."
            )

        team = await self._find_team(user, with_members=False)
        s = await self.sub_repo.get_by_team_and_week(team.id, week)

        today = datetime.now().strftime("%d %b %Y")
        status = "Submitted" if req.isSubmit else "Draft"

        if not s:
            s = WeeklySubmission(
                id=uuid.uuid4(),
                team_id=team.id,
                week=week,
                title=f"Week {week} Deliverables",
                status=status,
                submission_date=today,
                problem_statement=req.problemStatement,
                solution=req.solution,
                technology_used=req.technologyUsed,
                obstacles_faced=req.obstaclesFaced,
                abstract=req.abstract,
                repo_url=req.repoUrl,
                demo_url=req.demoUrl,
                project_title=team.project_title or "",
                guide_name=team.guide_name or "",
            )
            await self.sub_repo.create(s)
        else:
            s.status = status
            s.submission_date = today
            for attr, val in [
                ("problem_statement", req.problemStatement),
                ("solution", req.solution),
                ("technology_used", req.technologyUsed),
                ("obstacles_faced", req.obstaclesFaced),
                ("abstract", req.abstract),
                ("repo_url", req.repoUrl),
                ("demo_url", req.demoUrl),
            ]:
                if val is not None:
                    setattr(s, attr, val)

        await self.session.commit()
        return self._format_sub(s)

    async def delete_submission(self, user: User, week: int) -> dict:
        team = await self._find_team(user)
        s = await self.sub_repo.get_by_team_and_week(team.id, week)
        if s:
            await self.sub_repo.delete(s)
            await self.session.commit()
        return {"success": True, "message": f"Week {week} submission deleted."}
