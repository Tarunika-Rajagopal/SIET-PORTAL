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
from repositories.marks_repository import MarksRepository


def _team_brief(t: Team) -> Dict[str, Any]:
    digits = "".join(filter(str.isdigit, t.team_no or ""))
    team_number = int(digits) if digits else 1

    members_list = [
        {
            "name": m.name,
            "rollNo": m.roll_no,
            "email": m.email,
            "isLead": m.is_lead,
            "role": m.member_role,
        }
        for m in (t.members or [])
    ]

    status_val = t.status.value if hasattr(t.status, "value") else (t.status or "In Progress")
    guide_status_val = t.guide_approval_status.value if hasattr(t.guide_approval_status, "value") else (t.guide_approval_status or "Pending")

    return {
        "id": str(t.id),
        "teamId": t.team_id,
        "teamNo": t.team_no,
        "teamNumber": team_number,
        "projectTitle": t.project_title or "",
        "status": status_val,
        "progress": t.progress or 0,
        "batch": t.batch,
        "classSection": t.class_name,
        "guideName": t.guide_name or "",
        "advisorName": t.advisor_name or "",
        "isTitleApproved": bool(t.is_title_approved),
        "guideApprovalStatus": guide_status_val,
        "teamLeader": t.lead_student or "",
        "leaderRollNo": t.lead_roll_no or "",
        "memberCount": len(t.members) if t.members else 0,
        "members": members_list,
    }


class GuideService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.sub_repo = SubmissionRepository(session)
        self.project_repo = ProjectRepository(session)
        self.marks_repo = MarksRepository(session)

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
            sub_counts = await self.sub_repo.get_submission_counts(team_ids)
            total_submissions = sub_counts["total"]
            pending_reviews = sub_counts["pending"]
            title_counts = await self.project_repo.get_title_counts(team_ids)
            approved_titles = title_counts["approved"]
            pending_titles = title_counts["pending"]

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

        marks_map = {}
        for tid in team_ids:
            t_marks = await self.marks_repo.list_by_team(tid)
            for wm in t_marks:
                marks_map[(wm.team_id, wm.week_number)] = wm

        out = []
        for s in subs:
            t = team_map.get(s.team_id)
            digits = "".join(filter(str.isdigit, t.team_no or "")) if t else ""
            team_number = int(digits) if digits else 1
            status_val = s.status.value if hasattr(s.status, "value") else (s.status or "Pending")

            wm = marks_map.get((s.team_id, s.week))
            member_marks = {}
            if wm:
                for mm in (wm.member_marks or []):
                    member_marks[mm.roll_no] = float(mm.mark) if mm.mark is not None else 0

            score_val = float(s.score) if s.score is not None else (float(wm.team_average) if wm and wm.team_average else None)

            if status_val in ("Submitted", "Pending") and (wm and wm.team_average and wm.team_average > 0):
                status_val = "Approved"
                evaluation_status_val = "Approved"
            elif status_val == "Submitted":
                evaluation_status_val = "Pending"
            else:
                evaluation_status_val = status_val

            out.append({
                "id": str(s.id),
                "weekNumber": s.week,
                "teamId": t.team_id if t else "",
                "teamNo": t.team_no if t else "",
                "teamNumber": team_number,
                "classSection": t.class_name if t else "",
                "teamLeader": t.lead_student if t else "",
                "projectTitle": s.project_title or (t.project_title if t else ""),
                "status": status_val,
                "evaluationStatus": evaluation_status_val,
                "submissionDate": s.submission_date or "",
                "score": score_val,
                "memberMarks": member_marks,
                "abstractSummary": s.abstract or "",
                "problemStatement": s.problem_statement or "",
                "proposedSolution": s.solution or "",
                "technologyUsed": s.technology_used or "",
                "obstaclesFaced": s.obstacles_faced or "",
                "pptUrl": s.presentation_file or "",
                "presentationFileName": s.presentation_file or "",
                "reportUrl": s.pdf_file or "",
                "githubUrl": s.repo_url or (t.repo_url if t else ""),
                "liveDemoUrl": s.demo_url or (t.demo_url if t else ""),
                "images": [s.screenshot_file] if s.screenshot_file else [],
                "comments": s.comments or (wm.remarks if wm else ""),
                "guideReviewDate": s.guide_review_date or "",
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

        status_upper = (req.status or "").strip().upper()
        if status_upper == "APPROVED":
            s.status = "Approved"
        elif status_upper in ("REVISION_REQUESTED", "REVISION REQUIRED"):
            s.status = "Revision Required"
        elif status_upper == "REJECTED":
            s.status = "Rejected"
        else:
            s.status = "Revision Required"

        s.comments = req.comments or s.comments
        s.guide_review_date = datetime.now().strftime("%d %b %Y")

        avg_score = req.score
        if req.memberMarks:
            valid_marks = [v for v in req.memberMarks.values() if isinstance(v, (int, float))]
            if valid_marks:
                avg_score = round(sum(valid_marks) / len(valid_marks), 1)

        if avg_score is not None:
            s.score = avg_score

        # Persist individual marks to WeeklyMark in database
        if req.memberMarks and team:
            from services.marks_service import MarksService as DbMarksService
            marks_svc = DbMarksService(self.session)
            await marks_svc.save_weekly_marks(
                str(team.id),
                s.week,
                req.memberMarks,
                req.comments or s.comments or "",
                req.gradedBy or user.name or "Faculty Guide",
            )
            if s.week == 1:
                await marks_svc.save_weekly_marks(
                    str(team.id),
                    0,
                    req.memberMarks,
                    req.comments or s.comments or "",
                    req.gradedBy or user.name or "Faculty Guide",
                )

        # Update title approval and team status if milestone 1 is approved
        if status_upper == "APPROVED" and (s.week == 1 or s.week == 0) and team:
            team.is_title_approved = True
            team.guide_approval_status = "Approved"
            team.status = "Approved"
            approval = await self.project_repo.get_title_approval_by_team_id(team.id)
            if approval:
                approval.status = "Approved"

        # Advance progress if approved
        if team and status_upper == "APPROVED":
            team.progress = max(team.progress or 0, min(100, s.week * 25))

        await self.session.commit()
        status_label = s.status.value if hasattr(s.status, "value") else str(s.status)
        return {
            "success": True,
            "message": f"Submission reviewed: {status_label}",
            "id": str(s.id),
            "status": status_label,
            "score": s.score,
        }

    async def review_team_submission(
        self, team_id: str, week: int, req: ReviewSubmissionRequest, user: User
    ) -> Dict[str, Any]:
        team = await self.team_repo.get_by_team_id_string(team_id)
        if not team:
            try:
                t_uuid = uuid.UUID(team_id)
                team = await self.team_repo.get_by_id(t_uuid)
            except Exception:
                pass
        if not team:
            raise HTTPException(404, "Team not found")

        guide_name = user.name or ""
        is_guide = False
        if team.guide_email and team.guide_email.lower() == user.email.lower():
            is_guide = True
        elif team.guide_name and guide_name and guide_name.lower() in team.guide_name.lower():
            is_guide = True
        if not is_guide:
            raise HTTPException(403, "You are not authorized to review submissions for this team")

        s = await self.sub_repo.get_by_team_and_week(team.id, week)
        today = datetime.now().strftime("%d %b %Y")
        if not s:
            s = WeeklySubmission(
                id=uuid.uuid4(),
                team_id=team.id,
                week=week,
                title=f"Week {week} Deliverables",
                status="Submitted",
                submission_date=today,
                project_title=team.project_title or "",
                guide_name=team.guide_name or user.name or "",
            )
            await self.sub_repo.create(s)

        return await self.review_submission(str(s.id), req, user)

