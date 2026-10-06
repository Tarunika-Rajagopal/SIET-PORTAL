"""Guide service handling business logic and authorization for guide operations."""
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import User, Team, WeeklySubmission, TeamMember
from schemas import ReviewSubmissionRequest
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from repositories.project_repository import ProjectRepository
from repositories.marks_repository import MarksRepository


def _normalize_faculty_name(name: Optional[str]) -> str:
    if not name:
        return ""
    cleaned = name.lower().strip()
    for prefix in ["dr.", "dr ", "prof.", "prof ", "mr.", "mr ", "mrs.", "mrs ", "ms.", "ms "]:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return " ".join(cleaned.split())


def _is_guide_for_team(user: User, team: Optional[Team]) -> bool:
    if not team:
        return False
    if team.guide_email and user.email:
        return team.guide_email.strip().lower() == user.email.strip().lower()
    if team.guide_name and user.name:
        return _normalize_faculty_name(team.guide_name) == _normalize_faculty_name(user.name)
    return False


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
        "problemStatement": t.problem_statement or "",
        "proposedSolution": t.proposed_solution or "",
        "abstract": t.abstract or "",
        "githubUrl": t.repo_url or "",
        "liveDemoUrl": t.demo_url or "",
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
            is_approved = status_val == "Approved"

            member_marks = {}
            if wm and wm.member_marks:
                for mm in wm.member_marks:
                    member_marks[mm.roll_no] = float(mm.mark) if mm.mark is not None else 0

            score_val = float(s.score) if s.score is not None else (float(wm.team_average) if wm and wm.team_average else None)

            if is_approved:
                evaluation_status_val = "Approved"
            elif status_val == "Submitted":
                evaluation_status_val = "Pending"
            else:
                evaluation_status_val = status_val

            has_content = bool(
                (s.abstract and s.abstract.strip()) or
                (s.problem_statement and s.problem_statement.strip()) or
                (s.solution and s.solution.strip()) or
                (s.technology_used and s.technology_used.strip()) or
                (s.obstacles_faced and s.obstacles_faced.strip()) or
                (s.repo_url and s.repo_url.strip()) or
                (s.demo_url and s.demo_url.strip())
            )

            tech_used = s.technology_used or ""
            tech_list = [x.strip() for x in tech_used.split(",") if x.strip()] if tech_used else []

            out.append({
                "id": str(s.id),
                "weekNumber": s.week,
                "teamDbId": str(t.id) if t else "",
                "teamId": t.team_id if t else "",
                "teamNo": t.team_no if t else "",
                "teamNumber": team_number,
                "classSection": t.class_name if t else "",
                "teamLeader": t.lead_student if t else "",
                "projectTitle": s.project_title or (t.project_title if t else ""),
                "status": status_val,
                "hasContent": has_content,
                "evaluationStatus": evaluation_status_val,
                "submissionDate": s.submission_date or "",
                "score": score_val,
                "memberMarks": member_marks,
                "abstractSummary": s.abstract or "",
                "problemStatement": s.problem_statement or "",
                "proposedSolution": s.solution or "",
                "technologyUsed": tech_used,
                "technologiesUsed": tech_list,
                "techStack": tech_used,
                "obstaclesFaced": s.obstacles_faced or "",
                "githubUrl": s.repo_url or (t.repo_url if t else ""),
                "liveDemoUrl": s.demo_url or (t.demo_url if t else ""),
                "comments": (s.comments or (wm.remarks if wm else "")) or "",
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
        if not _is_guide_for_team(user, team):
            raise HTTPException(403, "You are not authorized to review submissions for this team")

        status_upper = (req.status or "").strip().upper()
        if status_upper == "APPROVED":
            s.status = "Approved"
            s.is_completed = True
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
        if team and (req.memberMarks or avg_score is not None):
            final_member_marks = dict(req.memberMarks or {})
            if not final_member_marks and avg_score is not None:
                from models import TeamMember
                res_m = await self.session.execute(select(TeamMember).where(TeamMember.team_id == team.id))
                for tm in res_m.scalars().all():
                    if tm.roll_no:
                        final_member_marks[tm.roll_no.strip()] = float(avg_score)

            from services.marks_service import MarksService as DbMarksService
            marks_svc = DbMarksService(self.session)
            await marks_svc.save_weekly_marks(
                str(team.id),
                s.week,
                final_member_marks,
                req.comments or s.comments or "",
                req.gradedBy or user.name or "Faculty Guide",
            )

        # Update title approval and team status if milestone 1 is approved
        if status_upper == "APPROVED" and s.week == 1 and team:
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

        if not _is_guide_for_team(user, team):
            raise HTTPException(403, "You are not authorized to review submissions for this team")

        s = await self.sub_repo.get_by_team_and_week(team.id, week)
        if not s:
            raise HTTPException(400, f"Cannot review: Team has not submitted deliverables for Week {week} yet.")

        return await self.review_submission(str(s.id), req, user)

    async def get_guide_history(self, user: User, class_name: Optional[str] = None) -> List[Dict[str, Any]]:
        from repositories.audit_repository import AuditRepository
        from models import AdvisorHistoryRoleEnum
        audit_repo = AuditRepository(self.session)
        logs = await audit_repo.list_guide_history(class_name if class_name and class_name != "ALL" else None)
        
        guide_name = (user.name or "").lower().replace("dr.", "").replace("mr.", "").replace("mrs.", "").replace("ms.", "").replace("prof.", "").strip()
        
        guide_logs = []
        for log in logs:
            role_val = log.role.value if hasattr(log.role, "value") else str(log.role or "")
            if role_val != AdvisorHistoryRoleEnum.faculty_guide.value and role_val != "Faculty Guide":
                continue
            
            actor = (log.actor_name or "").lower().replace("dr.", "").replace("mr.", "").replace("mrs.", "").replace("ms.", "").replace("prof.", "").strip()
            if guide_name and actor:
                if not (guide_name in actor or actor in guide_name):
                    continue
            
            guide_logs.append({
                "id": str(log.id),
                "timestamp": log.timestamp.isoformat() if log.timestamp else "",
                "date": log.date.isoformat() if log.date else "",
                "dateFormatted": log.date_formatted,
                "role": role_val,
                "actorName": log.actor_name or (user.name or "Faculty Guide"),
                "advisorName": log.actor_name or (user.name or "Faculty Guide"),
                "actionType": log.action_type.value if hasattr(log.action_type, "value") else str(log.action_type),
                "target": log.target,
                "details": log.details,
                "classSection": log.class_section,
            })
        
        return guide_logs

    async def log_guide_history(
        self,
        user: User,
        class_section: str,
        action_type: str,
        target: str,
        details: str,
        actor_name: Optional[str] = None,
        role: str = "Faculty Guide",
    ) -> Dict[str, Any]:
        from datetime import timezone
        from models import AdvisorHistory, AdvisorHistoryRoleEnum
        from repositories.audit_repository import AuditRepository
        
        audit_repo = AuditRepository(self.session)
        now = datetime.now(timezone.utc)
        date_formatted = now.strftime("%d %b %Y, %I:%M %p")
        
        actual_actor = actor_name or user.name or "Faculty Guide"
        
        entry = AdvisorHistory(
            id=uuid.uuid4(),
            timestamp=now,
            date=now.date(),
            date_formatted=date_formatted,
            role=AdvisorHistoryRoleEnum.faculty_guide if role == "Faculty Guide" else role,
            actor_name=actual_actor,
            action_type=action_type,
            target=target,
            details=details,
            class_section=class_section or user.class_name or "",
        )
        await audit_repo.create_guide_history(entry)
        await self.session.commit()
        return {
            "id": str(entry.id),
            "timestamp": entry.timestamp.isoformat(),
            "date": entry.date.isoformat(),
            "dateFormatted": entry.date_formatted,
            "role": entry.role.value if hasattr(entry.role, "value") else str(entry.role),
            "actorName": entry.actor_name,
            "advisorName": entry.actor_name,
            "actionType": entry.action_type.value if hasattr(entry.action_type, "value") else str(entry.action_type),
            "target": entry.target,
            "details": entry.details,
            "classSection": entry.class_section,
        }

