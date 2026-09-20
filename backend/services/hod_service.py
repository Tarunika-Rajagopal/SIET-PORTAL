"""HOD service - provides department-wide views using repositories."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from models import Team, TeamMember, HodHistory
from repositories.user_repository import UserRepository
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from repositories.audit_repository import AuditRepository


def _ser_hod_team(t: Team, members: Optional[List[TeamMember]] = None) -> Dict[str, Any]:
    mbrs = members or []
    return {
        "id": t.team_id or str(t.id),
        "teamNo": t.team_no,
        "projectTitle": t.project_title or "",
        "batch": t.batch,
        "classSection": t.class_name,
        "status": t.status or "In Progress",
        "progress": t.progress or 0,
        "rejectionReason": t.rejection_reason or "",
        "guideApprovalStatus": t.guide_approval_status or "Pending",
        "advisor": {
            "name": t.advisor_name or "",
            "email": t.advisor_email or "",
            "designation": "Professor",
        },
        "guide": {
            "name": t.guide_name or "",
            "email": t.guide_email or "",
            "designation": t.guide_designation or "Associate Professor",
            "specialization": t.domain or "AI & Deep Learning",
        },
        "members": [
            {
                "rollNo": m.roll_no,
                "name": m.name,
                "email": m.email,
                "isLead": m.is_lead,
            }
            for m in mbrs
        ],
    }


class HODService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.team_repo = TeamRepository(session)
        self.sub_repo = SubmissionRepository(session)
        self.audit_repo = AuditRepository(session)

    async def get_advisors(
        self, batch_filter: Optional[str] = None, class_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        rows = await self.user_repo.list_by_roles(["advisor"])
        result = []
        for u in rows:
            if batch_filter and batch_filter != "ALL" and u.advisor_batch and u.advisor_batch != batch_filter:
                continue
            if class_filter and class_filter != "ALL" and u.advisor_class and u.advisor_class != class_filter:
                continue
            tc = await self.team_repo.list_by_advisor_name(u.name or "")
            result.append({
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "designation": u.designation or "Professor",
                "batch": u.advisor_batch or "2023-2027 (III Year)",
                "assignedClass": u.advisor_class or "CSE-B",
                "teamsCount": len(tc),
                "studentsCount": sum(t.members_count or 0 for t in tc),
                "status": "Active",
            })
        return result

    async def get_students(
        self, batch_filter: Optional[str] = None, class_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        teams = await self.team_repo.list_all(batch=batch_filter, class_name=class_filter)
        students = []
        for t in teams:
            for m in (t.members or []):
                students.append({
                    "rollNo": m.roll_no,
                    "name": m.name,
                    "email": m.email,
                    "batch": t.batch,
                    "classSection": t.class_name,
                    "teamNo": t.team_no,
                    "teamId": t.team_id or str(t.id),
                    "projectTitle": t.project_title or "",
                    "status": t.status or "In Progress",
                    "guide": t.guide_name or "",
                    "advisor": t.advisor_name or "",
                })
        return students

    async def get_teams(
        self,
        batch_filter: Optional[str] = None,
        class_filter: Optional[str] = None,
        search_term: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        teams = await self.team_repo.list_all(batch=batch_filter, class_name=class_filter)
        result = []
        for t in teams:
            mbrs = t.members or []
            team_dict = _ser_hod_team(t, mbrs)
            if search_term:
                sq = search_term.lower()
                in_title = sq in (t.project_title or "").lower()
                in_team = sq in (t.team_no or "").lower()
                in_members = any(sq in (m.name or "").lower() or sq in (m.roll_no or "").lower() for m in mbrs)
                in_guide = sq in (t.guide_name or "").lower()
                in_advisor = sq in (t.advisor_name or "").lower()
                if not (in_title or in_team or in_members or in_guide or in_advisor):
                    continue
            subs = await self.sub_repo.list_by_team(t.id)
            team_dict["submissions"] = [
                {
                    "week": s.week,
                    "title": s.title or f"Week {s.week}",
                    "status": s.status or "Pending",
                    "comments": s.comments or "",
                }
                for s in subs
            ]
            result.append(team_dict)
        return result

    async def get_faculty_list(self) -> List[Dict[str, Any]]:
        users = await self.user_repo.list_by_roles(["guide", "advisor"])
        result = []
        for u in users:
            tc = await self.team_repo.list_by_guide_name(u.name or "")
            result.append({
                "id": str(u.id),
                "name": u.name,
                "designation": u.designation or "",
                "email": u.email,
                "phone": u.phone or "",
                "role": (u.role or "").capitalize(),
                "teamsCount": len(tc),
                "avgStudentProgress": 70,
                "status": "Normal",
            })
        return result

    async def log_history(
        self,
        action_type: str,
        target: str,
        details: str,
        class_section: str,
        batch: str,
        performed_by: str,
    ) -> Dict[str, Any]:
        hid = uuid.uuid4()
        h = HodHistory(
            id=hid,
            date=datetime.now(timezone.utc).strftime("%d %b %Y"),
            action_type=action_type,
            target=target,
            class_section=class_section,
            batch=batch,
            details=details,
            performed_by=performed_by,
        )
        await self.audit_repo.create_hod_history(h)
        await self.session.commit()
        return {"id": str(hid), "success": True}

    async def get_history(self) -> List[Dict[str, Any]]:
        rows = await self.audit_repo.list_hod_history()
        return [
            {
                "id": str(h.id),
                "timestamp": h.timestamp.isoformat() if h.timestamp else "",
                "date": h.date or "",
                "actionType": h.action_type or "",
                "target": h.target or "",
                "classSection": h.class_section or "",
                "batch": h.batch or "",
                "details": h.details or "",
                "performedBy": h.performed_by or "",
            }
            for h in rows
        ]
