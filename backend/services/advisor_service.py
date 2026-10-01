"""Advisor service - manages class teams, student assignments, and guide allocation."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models import Team, TeamMember, Student, User, AdvisorHistory
from repositories.team_repository import TeamRepository
from repositories.student_repository import StudentRepository
from repositories.faculty_repository import FacultyRepository
from repositories.audit_repository import AuditRepository

def _ser_team(t: Team) -> Dict[str, Any]:
    members = []
    if t.members:
        for m in t.members:
            members.append({
                "rollNo": m.roll_no,
                "name": m.name,
                "email": m.email,
                "isLead": bool(m.is_lead),
            })
    lead_m = next((m for m in members if m["isLead"]), members[0] if members else None)
    lead_display = ""
    if t.lead_student and t.lead_roll_no and str(t.lead_roll_no) not in str(t.lead_student):
        lead_display = f"{t.lead_student} ({t.lead_roll_no})"
    elif t.lead_student:
        lead_display = str(t.lead_student)
    elif lead_m:
        lead_display = f"{lead_m['name']} ({lead_m['rollNo']})"

    return {
        "id": str(t.id),
        "teamId": t.team_id,
        "teamNo": t.team_no,
        "class": t.class_name,
        "batch": t.batch,
        "title": t.project_title or "",
        "guide": t.guide_name or "",
        "guideEmail": t.guide_email or "",
        "guideDesignation": t.guide_designation or "",
        "guideDepartment": t.guide_department or "",
        "domain": t.domain or "",
        "lastModified": t.last_modified.isoformat() if t.last_modified else "",
        "status": t.status or "Pending",
        "capacity": t.capacity or 4,
        "membersCount": t.members_count or len(members),
        "leadStudent": lead_display,
        "members": members,
    }


class AdvisorService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.student_repo = StudentRepository(session)
        self.faculty_repo = FacultyRepository(session)

    async def get_available_guides(self) -> List[Dict[str, Any]]:
        rows = await self.faculty_repo.list_all()
        return [
            {
                "id": str(f.id),
                "name": f.name,
                "email": f.email,
                "designation": f.designation or "Faculty",
                "role": f.role or "Guide",
                "advisorBatch": f.advisor_batch or "",
                "advisorClass": f.advisor_class or "",
                "specialization": f.specialization or "",
                "teamsCount": f.teams_count or 0,
                "maxQuota": f.max_quota or 5,
                "status": f.status or "Active",
            }
            for f in rows
        ]

    async def get_teams_for_class(self, class_name: str = "") -> List[Dict[str, Any]]:
        if not class_name:
            return []
        rows = await self.team_repo.list_by_class(class_name)
        return [_ser_team(t) for t in rows]

    async def get_class_students(
        self, class_name: str = "", batch: str = ""
    ) -> List[Dict[str, Any]]:
        if not class_name:
            return []
        rows = await self.student_repo.list_by_class_section(class_name)
        if batch and batch.strip().upper() != "ALL":
            target_norm = batch.strip().lower()
            filtered = [
                s for s in rows
                if s.batch and (s.batch.strip().lower() == target_norm or target_norm in s.batch.strip().lower() or s.batch.strip().lower() in target_norm)
            ]
            if filtered:
                rows = filtered
        teams = await self.get_teams_for_class(class_name)
        team_map = {}
        for t in teams:
            for m in t["members"]:
                team_map[m["rollNo"]] = t
        result = []
        for s in rows:
            at = team_map.get(s.roll_no)
            result.append({
                "rollNo": s.roll_no,
                "name": s.name,
                "email": s.email,
                "batch": s.batch or batch,
                "classSection": s.class_section or class_name,
                "teamNo": at["teamNo"] if at else (s.team_no or "Unassigned"),
                "projectTitle": at["title"] if at else (s.project_title or ""),
                "guide": at["guide"] if at else (s.guide or "Unassigned"),
            })
        return result

    async def create_team(
        self,
        class_name: str,
        batch: str,
        capacity: int,
        team_no: str,
        title: str,
        guide_name: str,
        guide_email: str,
        lead_roll_no: str,
        member_roll_nos: List[str],
    ) -> Dict[str, Any]:
        clean_class = class_name.replace(" ", "").upper()
        digits = "".join(c for c in team_no if c.isdigit())
        code_no = f"T{digits.zfill(2)}" if digits else team_no.replace(" ", "")
        team_id_str = f"TEAM-{clean_class}-{code_no}"

        # Check if team already exists by team_id or team_no
        existing_team = await self.team_repo.get_by_team_id_string(team_id_str)
        if not existing_team:
            existing_team = await self.team_repo.get_by_team_id_string(team_no)

        members_data = []
        for rno in member_roll_nos:
            s = await self.student_repo.get_by_roll_no(rno)
            if not s:
                s = Student(
                    id=uuid.uuid4(),
                    roll_no=rno,
                    name=f"Student ({rno})",
                    email=f"{rno}@srishakthi.ac.in",
                    class_section=class_name,
                    batch=batch,
                    team_no=team_no,
                    guide=guide_name,
                    project_title=title or "",
                )
                await self.student_repo.create(s)
                await self.session.flush()
            else:
                s.team_no = team_no
                s.guide = guide_name
                if title:
                    s.project_title = title
            members_data.append({
                "student_id": s.id,
                "roll_no": s.roll_no,
                "name": s.name,
                "email": s.email,
                "is_lead": s.roll_no == lead_roll_no,
            })

        lead = next((m for m in members_data if m["is_lead"]), members_data[0] if members_data else None)

        if existing_team and existing_team.class_name == class_name:
            tid = existing_team.id
            existing_team.team_no = team_no
            existing_team.batch = batch
            existing_team.project_title = title or existing_team.project_title or ""
            existing_team.guide_name = guide_name
            existing_team.guide_email = guide_email
            existing_team.capacity = capacity
            existing_team.members_count = len(members_data)
            existing_team.lead_student = lead["name"] if lead else ""
            existing_team.lead_roll_no = lead["roll_no"] if lead else ""
            existing_team.status = "Approved"
            from sqlalchemy import delete
            await self.session.execute(delete(TeamMember).where(TeamMember.team_id == tid))
            team = existing_team
        else:
            tid = uuid.uuid4()
            team = Team(
                id=tid,
                team_id=team_id_str,
                team_no=team_no,
                class_name=class_name,
                batch=batch,
                project_title=title,
                guide_name=guide_name,
                guide_email=guide_email,
                status="Approved",
                capacity=capacity,
                members_count=len(members_data),
                lead_student=lead["name"] if lead else "",
                lead_roll_no=lead["roll_no"] if lead else "",
            )
            await self.team_repo.create(team)

        for md in members_data:
            tm = TeamMember(
                id=uuid.uuid4(),
                team_id=tid,
                student_id=md["student_id"],
                roll_no=md["roll_no"],
                name=md["name"],
                email=md["email"],
                is_lead=md["is_lead"],
                member_role="Team Lead" if md["is_lead"] else "Team Member",
            )
            await self.team_repo.add_member(tm)
        await self.session.commit()
        saved_team = await self.team_repo.get_with_members(tid)
        return {
            "success": True,
            "message": f"Team {team_no} created",
            "teamId": team_id_str,
            "team": _ser_team(saved_team) if saved_team else None
        }

    async def create_teams_bulk(
        self,
        class_name: str,
        batch: str,
        capacity: int,
        teams_list: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        created_count = 0
        for t in teams_list:
            team_no = t.get("teamNo", "")
            title = t.get("title", "")
            guide = t.get("guide", "")
            guide_email = t.get("guideEmail", "")
            lead_roll_no = t.get("leadRollNo", "")
            member_roll_nos = t.get("memberRollNos", [])
            if not member_roll_nos and "members" in t:
                member_roll_nos = [m["rollNo"] for m in t["members"] if isinstance(m, dict) and "rollNo" in m]

            await self.create_team(
                class_name=class_name,
                batch=batch,
                capacity=capacity,
                team_no=team_no,
                title=title,
                guide_name=guide,
                guide_email=guide_email,
                lead_roll_no=lead_roll_no,
                member_roll_nos=member_roll_nos,
            )
            created_count += 1

        return {
            "success": True,
            "message": f"Successfully created {created_count} teams for class {class_name}",
            "count": created_count,
        }

    async def move_student(
        self, class_name: str, student_roll_no: str, target_team_id: str
    ) -> Dict[str, Any]:
        target = await self.team_repo.get_with_members(target_team_id)
        if not target:
            return {"success": False, "message": "Target team not found"}
        cap = target.capacity or 4
        current_target_count = len(target.members) if target.members is not None else (target.members_count or 0)
        if current_target_count >= cap:
            return {"success": False, "message": f"Team at capacity ({current_target_count}/{cap})"}

        # Find all existing memberships for this student
        existing_res = await self.session.execute(
            select(TeamMember).where(TeamMember.roll_no == student_roll_no.strip())
        )
        existing_tms = list(existing_res.scalars().all())

        if any(tm.team_id == target.id for tm in existing_tms) and len(existing_tms) == 1:
            return {"success": False, "message": "Already in this team"}

        source_team_ids = {tm.team_id for tm in existing_tms if tm.team_id != target.id}

        # Remove existing memberships
        for tm in existing_tms:
            await self.session.delete(tm)
        await self.session.flush()

        # Update affected source teams
        for sid in source_team_ids:
            source = await self.team_repo.get_with_members(sid)
            if source:
                remaining = [m for m in (source.members or []) if m.roll_no != student_roll_no]
                source.members_count = len(remaining)
                if remaining:
                    if source.lead_roll_no == student_roll_no:
                        remaining[0].is_lead = True
                        remaining[0].member_role = "Team Lead"
                        source.lead_student = remaining[0].name
                        source.lead_roll_no = remaining[0].roll_no
                else:
                    source.lead_student = "Unassigned"
                    source.lead_roll_no = ""

        s_obj = await self.student_repo.get_by_roll_no(student_roll_no)
        if not s_obj:
            s_obj = Student(
                id=uuid.uuid4(),
                roll_no=student_roll_no,
                name=f"Student ({student_roll_no})",
                email=f"{student_roll_no}@srishakthi.ac.in",
                class_section=class_name,
                team_no=target.team_no,
            )
            await self.student_repo.create(s_obj)
            await self.session.flush()
        else:
            s_obj.team_no = target.team_no
        name = s_obj.name
        email = s_obj.email

        is_first_member = current_target_count == 0
        tm_new = TeamMember(
            id=uuid.uuid4(),
            team_id=target.id,
            student_id=(s_obj.id if s_obj else uuid.uuid4()),
            roll_no=student_roll_no,
            name=name,
            email=email,
            is_lead=is_first_member,
            member_role="Team Lead" if is_first_member else "Team Member",
        )
        await self.team_repo.add_member(tm_new)
        target.members_count = current_target_count + 1
        if is_first_member:
            target.lead_student = name
            target.lead_roll_no = student_roll_no
        if s_obj:
            s_obj.team_no = target.team_no
            s_obj.project_title = target.project_title
            s_obj.guide = target.guide_name

        # Also synchronize user table if account exists
        u_res = await self.session.execute(select(User).where(User.roll_no == student_roll_no))
        u_obj = u_res.scalar_one_or_none()
        if u_obj:
            u_obj.team_id = target.team_id
            u_obj.team_no = target.team_no
            u_obj.project_title = target.project_title
            u_obj.guide_name = target.guide_name

        await self.session.commit()
        return {"success": True, "message": f"{name} moved to {target.team_no}"}

    async def reassign_guide(
        self, class_name: str, team_id: str, guide_name: str, guide_email: str = ""
    ) -> Dict[str, Any]:
        team = await self.team_repo.get_with_members(team_id)
        if not team:
            team = await self.team_repo.get_by_team_id_string(team_id)
        if not team:
            return {"success": False, "message": "Team not found"}

        clean_guide_name = guide_name.strip()
        if (team.guide_name or "").strip().lower() == clean_guide_name.lower():
            return {"success": False, "message": f"{clean_guide_name} is already assigned to this team."}

        # Validate maximum guide workload: max 5 teams in class
        existing_guide_teams = await self.team_repo.list_by_guide(guide_name=clean_guide_name)
        target_class = class_name or team.class_name
        class_teams = [
            t for t in existing_guide_teams 
            if t.class_name and t.class_name.strip().lower() == target_class.strip().lower() and str(t.id) != str(team.id)
        ]
        if len(class_teams) >= 5:
            return {
                "success": False, 
                "message": f"Cannot assign {clean_guide_name}. Maximum quota of 5 teams in class {target_class} has been reached."
            }

        # Lookup faculty details from User table
        resolved_email = guide_email.strip() if guide_email else ""
        resolved_desig = team.guide_designation or ""
        resolved_dept = team.guide_department or ""

        user_query = select(User).where(User.name.ilike(clean_guide_name))
        if resolved_email:
            user_query = select(User).where(or_(User.name.ilike(clean_guide_name), User.email.ilike(resolved_email)))
        
        fac_res = await self.session.execute(user_query)
        faculty = fac_res.scalars().first()
        if faculty:
            if not resolved_email and faculty.email:
                resolved_email = faculty.email
            if hasattr(faculty, "designation") and faculty.designation:
                resolved_desig = faculty.designation
            if hasattr(faculty, "department") and faculty.department:
                resolved_dept = faculty.department

        team.guide_name = clean_guide_name
        team.guide_email = resolved_email
        team.guide_designation = resolved_desig
        team.guide_department = resolved_dept
        team.last_modified = datetime.now(timezone.utc)

        # Synchronize all students in the team
        if team.team_no:
            stu_res = await self.session.execute(
                select(Student).where(Student.team_no == team.team_no)
            )
            for s in stu_res.scalars().all():
                s.guide = clean_guide_name

        # Synchronize User accounts for team members
        if team.members:
            for m in team.members:
                if m.roll_no:
                    u_res = await self.session.execute(
                        select(User).where(User.roll_no == m.roll_no)
                    )
                    u = u_res.scalars().first()
                    if u:
                        u.guide_name = clean_guide_name

        await self.session.commit()
        return {
            "success": True, 
            "message": f"Guide {clean_guide_name} successfully assigned to {team.team_no}",
            "team": _ser_team(team)
        }

    async def update_team(
        self, class_name: str, batch: str, team_id: str, updates: dict
    ) -> Dict[str, Any]:
        team = await self.team_repo.get_with_members(team_id)
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
            for tm in (team.members or []):
                tm.is_lead = tm.roll_no == updates["leadRollNo"]
                tm.member_role = "Team Lead" if tm.is_lead else "Team Member"
        team.last_modified = datetime.now(timezone.utc)
        await self.session.commit()
        return {"success": True, "message": f"Team {team.team_no} updated"}

    async def delete_team(self, team_id: str) -> Dict[str, Any]:
        team = await self.team_repo.get_by_team_id_string(team_id)
        if not team:
            return {"success": False, "message": "Team not found"}
        team_no = team.team_no
        members = await self.team_repo.list_members_by_team_id(team.id)
        for tm in members:
            await self.team_repo.remove_member(tm)
        await self.team_repo.delete(team)
        await self.session.commit()
        return {"success": True, "message": f"Team {team_no} deleted"}

    async def get_advisor_history(self, class_section: str = "") -> List[Dict[str, Any]]:
        if not class_section:
            return []
        audit_repo = AuditRepository(self.session)
        logs = await audit_repo.list_advisor_history(class_section)
        return [
            {
                "id": str(log.id),
                "timestamp": log.timestamp.isoformat() if log.timestamp else "",
                "date": log.date.isoformat() if log.date else "",
                "dateFormatted": log.date_formatted,
                "role": log.role.value if hasattr(log.role, "value") else (str(log.role) if log.role else "Class Advisor"),
                "actorName": log.actor_name or "Class Advisor",
                "advisorName": log.actor_name or "Class Advisor",
                "actionType": log.action_type.value if hasattr(log.action_type, "value") else str(log.action_type),
                "target": log.target,
                "details": log.details,
                "classSection": log.class_section,
            }
            for log in logs
        ]

    async def log_advisor_history(
        self,
        class_section: str,
        action_type: str,
        target: str,
        details: str,
        actor_name: str,
        role: str = "Class Advisor",
    ) -> Dict[str, Any]:
        audit_repo = AuditRepository(self.session)
        now = datetime.now(timezone.utc)
        date_formatted = now.strftime("%d %b %Y, %I:%M %p")
        entry = AdvisorHistory(
            id=uuid.uuid4(),
            timestamp=now,
            date=now.date(),
            date_formatted=date_formatted,
            role=role or "Class Advisor",
            actor_name=actor_name or "Class Advisor",
            action_type=action_type,
            target=target,
            details=details,
            class_section=class_section,
        )
        await audit_repo.create_advisor_history(entry)
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
