"""Advisor service - manages class teams, student assignments, and guide allocation."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, String
from sqlalchemy.orm import selectinload

from models import User, Faculty, Student, Team, TeamMember, WeeklyMark, WeeklyMemberMark


def _ser_team(t):
    members = []
    if t.members:
        for m in t.members:
            members.append({
                "rollNo": m.roll_no, "name": m.name, "email": m.email,
                "isLead": m.is_lead,
            })
    return {
        "id": str(t.id), "teamId": t.team_id, "teamNo": t.team_no,
        "class": t.class_name, "batch": t.batch,
        "title": t.project_title or "", "guide": t.guide_name or "",
        "guideEmail": t.guide_email or "",
        "guideDesignation": t.guide_designation or "",
        "guideDepartment": t.guide_department or "",
        "domain": t.domain or "",
        "lastModified": t.last_modified.isoformat() if t.last_modified else "",
        "status": t.status or "Pending", "capacity": t.capacity or 4,
        "membersCount": t.members_count or len(members),
        "leadStudent": f"{t.lead_student} ({t.lead_roll_no})" if t.lead_student else "",
        "members": members,
    }


class AdvisorService:

    @staticmethod
    async def get_teams_for_class(db, class_name="CSE-B"):
        rows = (await db.execute(
            select(Team).options(selectinload(Team.members))
            .where(Team.class_name == class_name)
        )).scalars().all()
        return [_ser_team(t) for t in rows]

    @staticmethod
    async def get_class_students(db, class_name="CSE-B", batch="2023-2027 (III Year)"):
        rows = (await db.execute(
            select(Student).where(Student.class_section == class_name)
        )).scalars().all()
        teams = await AdvisorService.get_teams_for_class(db, class_name)
        team_map = {}
        for t in teams:
            for m in t["members"]:
                team_map[m["rollNo"]] = t
        result = []
        for s in rows:
            at = team_map.get(s.roll_no)
            result.append({
                "rollNo": s.roll_no, "name": s.name, "email": s.email,
                "batch": s.batch or batch, "classSection": s.class_section or class_name,
                "teamNo": at["teamNo"] if at else (s.team_no or "Unassigned"),
                "projectTitle": at["title"] if at else (s.project_title or ""),
                "guide": at["guide"] if at else (s.guide or "Unassigned"),
            })
        return result

    @staticmethod
    async def create_team(db, class_name, batch, capacity, team_no, title,
                          guide_name, guide_email, lead_roll_no, member_roll_nos):
        code_no = team_no.replace("Team ", "B").replace(" ", "")
        team_id_str = f"TEAM-CSE-Y3-{code_no}"
        tid = uuid.uuid4()
        members_data = []
        for rno in member_roll_nos:
            s = (await db.execute(select(Student).where(Student.roll_no == rno))).scalar_one_or_none()
            name = s.name if s else f"Student ({rno})"
            email = s.email if s else f"{rno}@srishakthi.ac.in"
            members_data.append({"roll_no": rno, "name": name, "email": email,
                                 "is_lead": rno == lead_roll_no})
        lead = next((m for m in members_data if m["is_lead"]),
                    members_data[0] if members_data else None)
        team = Team(
            id=tid, team_id=team_id_str, team_no=team_no,
            class_name=class_name, batch=batch, project_title=title,
            guide_name=guide_name, guide_email=guide_email,
            status="Approved", capacity=capacity, members_count=len(members_data),
            lead_student=lead["name"] if lead else "",
            lead_roll_no=lead["roll_no"] if lead else "",
        )
        db.add(team)
        for md in members_data:
            tm = TeamMember(
                id=uuid.uuid4(), team_id=tid, student_id=uuid.uuid4(),
                roll_no=md["roll_no"], name=md["name"], email=md["email"],
                is_lead=md["is_lead"],
                member_role="Team Lead" if md["is_lead"] else "Team Member",
            )
            db.add(tm)
        await db.commit()
        return {"success": True, "message": f"Team {team_no} created", "teamId": team_id_str}

    @staticmethod
    async def move_student(db, class_name, student_roll_no, target_team_id):
        target = (await db.execute(
            select(Team).options(selectinload(Team.members))
            .where((Team.team_id == target_team_id) | (cast(Team.id, String) == target_team_id))
        )).scalar_one_or_none()
        if not target:
            return {"success": False, "message": "Target team not found"}
        cap = target.capacity or 4
        if (target.members_count or 0) >= cap:
            return {"success": False, "message": f"Team at capacity ({target.members_count}/{cap})"}
        source = None
        for t in (await db.execute(
            select(Team).options(selectinload(Team.members))
        )).scalars().all():
            if any(m.roll_no == student_roll_no for m in (t.members or [])):
                source = t
                break
        if source and source.id == target.id:
            return {"success": False, "message": "Already in this team"}
        s_obj = (await db.execute(
            select(Student).where(Student.roll_no == student_roll_no)
        )).scalar_one_or_none()
        name = s_obj.name if s_obj else f"Student ({student_roll_no})"
        email = s_obj.email if s_obj else f"{student_roll_no}@srishakthi.ac.in"
        if source:
            for tm in (await db.execute(
                select(TeamMember).where(TeamMember.team_id == source.id)
            )).scalars().all():
                if tm.roll_no == student_roll_no:
                    await db.delete(tm)
            source.members_count = max(0, (source.members_count or 1) - 1)
        tm_new = TeamMember(
            id=uuid.uuid4(), team_id=target.id,
            student_id=(s_obj.id if s_obj else uuid.uuid4()),
            roll_no=student_roll_no, name=name, email=email,
            is_lead=(target.members_count or 0) == 0,
            member_role="Team Lead" if (target.members_count or 0) == 0 else "Team Member",
        )
        db.add(tm_new)
        target.members_count = (target.members_count or 0) + 1
        if target.members_count == 1:
            target.lead_student = name
            target.lead_roll_no = student_roll_no
        if s_obj:
            s_obj.team_no = target.team_no
            s_obj.project_title = target.project_title
            s_obj.guide = target.guide_name
        await db.commit()
        return {"success": True, "message": f"{name} moved to {target.team_no}"}

    @staticmethod
    async def reassign_guide(db, class_name, team_id, guide_name, guide_email=""):
        team = (await db.execute(
            select(Team).where((Team.team_id == team_id) | (cast(Team.id, String) == team_id))
        )).scalar_one_or_none()
        if not team:
            return {"success": False, "message": "Team not found"}
        team.guide_name = guide_name
        if guide_email:
            team.guide_email = guide_email
        await db.commit()
        return {"success": True, "message": f"Guide assigned to {guide_name}"}

    @staticmethod
    async def update_team(db, class_name, batch, team_id, updates):
        team = (await db.execute(
            select(Team).options(selectinload(Team.members))
            .where((Team.team_id == team_id) | (cast(Team.id, String) == team_id))
        )).scalar_one_or_none()
        if not team:
            return {"success": False, "message": "Team not found"}
        if "teamNo" in updates:
            team.team_no = updates["teamNo"]
        if "guide" in updates:
            team.guide_name = updates["guide"]
        if "guideEmail" in updates:
            team.guide_email = updates["guideEmail"]
        if "title" in updates:
            team.project_title = updates["title"]
        if "leadRollNo" in updates:
            for tm in team.members:
                tm.is_lead = tm.roll_no == updates["leadRollNo"]
                tm.member_role = "Team Lead" if tm.is_lead else "Team Member"
        team.last_modified = datetime.now(timezone.utc)
        await db.commit()
        return {"success": True, "message": f"Team {team.team_no} updated"}

    @staticmethod
    async def delete_team(db, team_id):
        team = (await db.execute(
            select(Team).where((Team.team_id == team_id) | (cast(Team.id, String) == team_id))
        )).scalar_one_or_none()
        if not team:
            return {"success": False, "message": "Team not found"}
        team_no = team.team_no
        for tm in (await db.execute(
            select(TeamMember).where(TeamMember.team_id == team.id)
        )).scalars().all():
            await db.delete(tm)
        await db.delete(team)
        await db.commit()
        return {"success": True, "message": f"Team {team_no} deleted"}
