"""HOD service - provides department-wide views."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import User, Faculty, Student, Team, TeamMember, WeeklySubmission, HodHistory


def _ser_hod_team(t, members=None):
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
        "advisor": {"name": t.advisor_name or "", "email": t.advisor_email or "", "designation": "Professor"},
        "guide": {"name": t.guide_name or "", "email": t.guide_email or "",
                  "designation": t.guide_designation or "Associate Professor",
                  "specialization": t.domain or "AI & Deep Learning"},
        "members": [{"rollNo": m.roll_no, "name": m.name, "email": m.email, "isLead": m.is_lead}
                    for m in mbrs],
    }


class HODService:

    @staticmethod
    async def get_advisors(db, batch_filter=None, class_filter=None):
        rows = (await db.execute(select(User).where(User.role.in_(["advisor"])))).scalars().all()
        result = []
        for u in rows:
            if batch_filter and batch_filter != "ALL" and u.advisor_batch and u.advisor_batch != batch_filter:
                continue
            if class_filter and class_filter != "ALL" and u.advisor_class and u.advisor_class != class_filter:
                continue
            tc = (await db.execute(select(Team).where(Team.advisor_name.ilike(f"%{u.name}%")))).scalars().all()
            result.append({
                "id": str(u.id), "name": u.name, "email": u.email,
                "designation": u.designation or "Professor",
                "batch": u.advisor_batch or "2023-2027 (III Year)",
                "assignedClass": u.advisor_class or "CSE-B",
                "teamsCount": len(tc),
                "studentsCount": sum(t.members_count or 0 for t in tc),
                "status": "Active",
            })
        return result

    @staticmethod
    async def get_students(db, batch_filter=None, class_filter=None):
        teams_q = select(Team).options(selectinload(Team.members))
        if class_filter and class_filter != "ALL":
            teams_q = teams_q.where(Team.class_name == class_filter)
        if batch_filter and batch_filter != "ALL":
            teams_q = teams_q.where(Team.batch == batch_filter)
        teams = (await db.execute(teams_q)).scalars().all()
        students = []
        for t in teams:
            for m in (t.members or []):
                students.append({
                    "rollNo": m.roll_no, "name": m.name, "email": m.email,
                    "batch": t.batch, "classSection": t.class_name,
                    "teamNo": t.team_no, "teamId": t.team_id or str(t.id),
                    "projectTitle": t.project_title or "",
                    "status": t.status or "In Progress",
                    "guide": t.guide_name or "",
                    "advisor": t.advisor_name or "",
                })
        return students

    @staticmethod
    async def get_teams(db, batch_filter=None, class_filter=None, search_term=None):
        q = select(Team).options(selectinload(Team.members))
        if class_filter and class_filter != "ALL":
            q = q.where(Team.class_name == class_filter)
        if batch_filter and batch_filter != "ALL":
            q = q.where(Team.batch == batch_filter)
        teams = (await db.execute(q)).scalars().all()
        result = []
        for t in teams:
            mbrs = t.members or []
            team_dict = _ser_hod_team(t, mbrs)
            if search_term:
                sq = search_term.lower()
                in_title = sq in (t.project_title or "").lower()
                in_team = sq in (t.team_no or "").lower()
                in_members = any(sq in m.name.lower() or sq in m.roll_no for m in mbrs)
                in_guide = sq in (t.guide_name or "").lower()
                in_advisor = sq in (t.advisor_name or "").lower()
                if not (in_title or in_team or in_members or in_guide or in_advisor):
                    continue
            subs = (await db.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t.id)
            )).scalars().all()
            team_dict["submissions"] = [
                {"week": s.week, "title": s.title or f"Week {s.week}",
                 "status": s.status or "Pending", "comments": s.comments or ""}
                for s in subs
            ]
            result.append(team_dict)
        return result

    @staticmethod
    async def get_faculty_list(db):
        users = (await db.execute(select(User).where(User.role.in_(["guide", "advisor"])))).scalars().all()
        result = []
        for u in users:
            tc = (await db.execute(select(Team).where(Team.guide_name.ilike(f"%{u.name}%")))).scalars().all()
            result.append({
                "id": str(u.id), "name": u.name, "designation": u.designation or "",
                "email": u.email, "phone": u.phone or "",
                "role": u.role.capitalize(), "teamsCount": len(tc),
                "avgStudentProgress": 70, "status": "Normal",
            })
        return result

    @staticmethod
    async def log_history(db, action_type, target, details, class_section,
                          batch, performed_by):
        hid = uuid.uuid4()
        h = HodHistory(
            id=hid, date=datetime.now(timezone.utc).strftime("%d %b %Y"),
            action_type=action_type, target=target, class_section=class_section,
            batch=batch, details=details, performed_by=performed_by,
        )
        db.add(h)
        await db.commit()
        return {"id": str(hid), "success": True}

    @staticmethod
    async def get_history(db):
        rows = (await db.execute(
            select(HodHistory).order_by(HodHistory.created_at.desc())
        )).scalars().all()
        return [
            {"id": str(h.id), "timestamp": h.timestamp.isoformat() if h.timestamp else "",
             "date": h.date or "", "actionType": h.action_type or "",
             "target": h.target or "", "classSection": h.class_section or "",
             "batch": h.batch or "", "details": h.details or "",
             "performedBy": h.performed_by or ""}
            for h in rows
        ]
