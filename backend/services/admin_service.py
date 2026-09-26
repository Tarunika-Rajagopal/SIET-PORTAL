"""Admin service - manages faculties, students, and audit logs using repositories."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Faculty, Student, AuditLog
from auth.auth import hash_password
from repositories.faculty_repository import FacultyRepository
from repositories.user_repository import UserRepository
from repositories.student_repository import StudentRepository
from repositories.audit_repository import AuditRepository
from repositories.team_repository import TeamRepository

class AdminService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.faculty_repo = FacultyRepository(session)
        self.user_repo = UserRepository(session)
        self.student_repo = StudentRepository(session)
        self.audit_repo = AuditRepository(session)
        self.team_repo = TeamRepository(session)
    # ── Faculties ───────────────────────────────────────────────────
    async def get_faculties(self) -> List[Dict[str, Any]]:
        rows = await self.faculty_repo.list_all()
        return [
            {
                "id": str(f.id),
                "name": f.name,
                "email": f.email,
                "designation": f.designation,
                "role": f.role or "None",
                "advisorBatch": f.advisor_batch or "",
                "advisorClass": f.advisor_class or "",
                "specialization": f.specialization or "",
                "teamsCount": f.teams_count or 0,
                "maxQuota": f.max_quota or 5,
                "status": f.status or "Active",
            }
            for f in rows
        ]

    async def add_faculty(
        self,
        name: str,
        email: str,
        designation: str,
        role: str,
        specialization: str = "",
        advisor_batch: Optional[str] = None,
        advisor_class: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Check if email already exists

        existing_fac = await self.faculty_repo.get_by_email(email)
        if existing_fac:
            return {"success": False, "message": f"Faculty with email {email} already exists"}
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            return {"success": False, "message": f"User account with email {email} already exists"}

        # Create corresponding User record so faculty can authenticate
        uid = uuid.uuid4()

        user_role = "advisor" if "advisor" in (role or "").lower() else "guide"
        active_role = "advisor" if (role or "").lower() == "advisor" else "guide"
        u = User(
            id=uid,
            email=email,
            password=hash_password("faculty@123"),
            name=name,
            designation=designation,
            role=user_role,
            active_role=active_role,
            advisor_class=advisor_class,
            advisor_batch=advisor_batch,
            department="Computer Science and Engineering",
        )
        await self.user_repo.create(u)
        
        # This error must be corrected by flushing this . Without flushing creates a proxy object in memory which is not persisted to the database and causes the following error:
        # sqlalchemy.orm.exc.DetachedInstanceError: Instance <User at 0x...> is not bound to a Session;

        await self.session.flush()


        fid = uuid.uuid4()
        f = Faculty(
            id=fid,
            user_id=uid,
            name=name,
            email=email,
            designation=designation,
            role=role,
            specialization=specialization,
            advisor_batch=advisor_batch,
            advisor_class=advisor_class,
        )
        await self.faculty_repo.create(f)
        await self.session.commit()
        return {"id": str(fid), "name": name, "email": email, "success": True}

    async def update_faculty(self, faculty_id: str, updates: dict) -> Dict[str, Any]:
        f = await self.faculty_repo.get_by_id(faculty_id)
        if not f:
            return {"success": False, "message": "Faculty not found"}
        for key, val in updates.items():
            col = key.replace("camelCase", "").replace("_", "")
            attr_map = {
                "name": "name",
                "email": "email",
                "designation": "designation",
                "role": "role",
                "specialization": "specialization",
                "advisorbatch": "advisor_batch",
                "advisorclass": "advisor_class",
                "teamscount": "teams_count",
                "maxquota": "max_quota",
                "status": "status",
            }
            attr = attr_map.get(col.lower())
            if attr and hasattr(f, attr):
                setattr(f, attr, val)
        f.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        return {"success": True, "message": f"Faculty {f.name} updated"}

    async def delete_faculty(self, faculty_email: str) -> Dict[str, Any]:
        f = await self.faculty_repo.get_by_email(faculty_email)
        if not f:
            return {"success": False, "message": "Faculty not found"}

        # Delete corresponding User record if present

        teams = await self.team_repo.list_by_guide_name(f.name)
        
        for team in teams:
            team.guide_email = None
            team.guide_designation = None
            team.guide_department = None

        if f.advisor_batch or f.advisor_class:
            advisor_teams = await self.team_repo.list_by_advisor_name(f.name)
            for team in advisor_teams:
                team.advisor_email = None
                team.advisor_designation = None
                team.advisor_department = None
            
        u = await self.user_repo.get_by_email(f.email)
        if u:
            await self.user_repo.delete(u)
        else:
            return {"success": False, "message": "Error while deleting the User. Please try again later."}

        await self.faculty_repo.delete(f)
        await self.session.commit()
        return {"success": True, "message": "Faculty deleted"}

    async def assign_guide(self, faculty_id: str) -> Dict[str, Any]:
        f = await self.faculty_repo.get_by_id(faculty_id)
        if not f:
            return {"success": False, "message": "Faculty not found"}
        if f.role in ("Guide", "Advisor & Guide"):
            return {"success": False, "message": "Already a guide"}
        f.role = "Advisor & Guide" if (f.advisor_class or f.advisor_batch) else "Guide"
        f.status = "Active"
        await self.session.commit()
        return {"success": True, "message": f"{f.name} assigned as Guide"}

    async def remove_guide(self, faculty_id: str) -> Dict[str, Any]:
        f = await self.faculty_repo.get_by_id(faculty_id)
        if not f:
            return {"success": False, "message": "Faculty not found"}
        f.role = "Advisor" if f.advisor_class else "None"
        f.teams_count = 0
        await self.session.commit()
        return {"success": True, "message": f"Guide role removed from {f.name}"}

    async def assign_advisor(self, faculty_id: str, batch: str, className: str) -> Dict[str, Any]:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = await self.faculty_repo.get_by_id(fid)
        if not f:
            return {"success": False, "message": "Faculty not found"}
        existing = await self.faculty_repo.get_advisor_for_class(batch, className, exclude_id=fid)
        if existing:
            if existing.role == "Advisor & Guide":
                existing.role = "Guide"
            else:
                existing.role = "None"
            existing.advisor_batch = None
            existing.advisor_class = None
        f.role = "Advisor & Guide" if f.role == "Guide" else "Advisor"
        f.advisor_batch = batch
        f.advisor_class = className
        f.status = "Active"
        await self.session.commit()
        return {"success": True, "message": f"{f.name} assigned as Advisor for {className}"}

    async def remove_advisor(self, faculty_id: str) -> Dict[str, Any]:
        f = await self.faculty_repo.get_by_id(faculty_id)
        if not f:
            return {"success": False, "message": "Faculty not found"}
        f.role = "Guide" if (f.teams_count or 0) > 0 else "None"
        f.advisor_batch = None
        f.advisor_class = None
        await self.session.commit()
        return {"success": True, "message": f"Advisor role removed from {f.name}"}

    # ── Students ────────────────────────────────────────────────────
    async def get_students(self) -> List[Dict[str, Any]]:
        rows = await self.student_repo.list_all()
        return [
            {
                "rollNo": s.roll_no,
                "name": s.name,
                "email": s.email,
                "batch": s.batch,
                "classSection": s.class_section,
                "teamNo": s.team_no,
                "projectTitle": s.project_title,
                "guide": s.guide,
            }
            for s in rows
        ]

    async def add_student(
        self,
        name: str,
        roll_no: str,
        email: str,
        password: str,
        batch: str,
        class_section: str,
        guide: Optional[str],
    ) -> Dict[str, Any]:
        existing = await self.student_repo.get_by_roll_no(roll_no)
        if existing:
            return {"success": False, "message": f"Student {roll_no} already exists"}
        sid = uuid.uuid4()
        pwd_hash = hash_password(password or "student@123")
        s = Student(
            id=sid,
            roll_no=roll_no,
            name=name,
            email=email,
            password=pwd_hash,
            batch=batch,
            class_section=class_section,
            guide=guide or "Unassigned",
        )
        await self.student_repo.create(s)
        u = User(
            id=uuid.uuid4(),
            email=email,
            password=pwd_hash,
            name=name,
            roll_no=roll_no,
            department="Computer Science and Engineering",
            role="student",
            class_name=class_section,
            batch=batch,
        )
        await self.user_repo.create(u)
        await self.session.commit()
        return {"success": True, "message": f"Student {name} enrolled", "rollNo": roll_no}

    async def delete_student(self, roll_no: str) -> Dict[str, Any]:
        s = await self.student_repo.get_by_roll_no(roll_no)
        if not s:
            return {"success": False, "message": "Student not found"}
        await self.student_repo.delete(s)
        u = await self.user_repo.get_by_roll_no(roll_no)
        if u:
            await self.user_repo.delete(u)
        await self.session.commit()
        return {"success": True, "message": f"Student {roll_no} removed"}

    async def import_students(self, students: list) -> Dict[str, Any]:
        added = 0
        errors = []

        for st in students:
            if not st.name or not st.rollNo or not st.email:
                errors.append("Missing required fields")
                continue

            existing = await self.student_repo.get_by_roll_no(st.rollNo)
            if existing:
                errors.append(f"Duplicate {st.rollNo}")
                continue

            sid = uuid.uuid4()

            raw_pwd = st.password or "student@123"
            pwd_hash = hash_password(raw_pwd)

            s = Student(
                id=sid,
                roll_no=st.rollNo,
                name=st.name,
                email=st.email,
                password=pwd_hash,
                batch=st.batch or "2023-2027 (III Year)",
                class_section=st.classSection or "CSE-B",
            )

            await self.student_repo.create(s)

            u = User(
            id=uuid.uuid4(),
            email=st.email,
            password=pwd_hash,
            name=st.name,
            roll_no=st.rollNo,
            department="Computer Science and Engineering",
            role="student",
            class_name=st.classSection or "CSE-B",
            batch=st.batch or "2023-2027 (III Year)",
            )

            await self.user_repo.create(u)

            added += 1

        await self.session.commit()
        return {"addedCount": added, "errors": errors}

    # ── Audit Logs ──────────────────────────────────────────────────
    async def get_audit_logs(self) -> List[Dict[str, Any]]:
        rows = await self.audit_repo.list_audit_logs()
        return [
            {
                "id": str(l.id),
                "timestamp": l.timestamp.isoformat() if l.timestamp else "",
                "dateFormatted": l.date_formatted or "",
                "dateKey": l.date_key.isoformat() if l.date_key else "",
                "monthKey": l.month_key or "",
                "actionType": l.action_type or "",
                "target": l.target or "",
                "details": l.details or "",
                "reason": l.reason or "",
                "admin": l.admin_email or "",
            }
            for l in rows
        ]

    async def add_audit_log(
        self,
        action_type: str,
        target: str,
        details: str,
        reason: str = "",
        admin: str = "admin@siet.ac.in",
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        lid = uuid.uuid4()
        log = AuditLog(
            id=lid,
            timestamp=now,
            date_formatted=now.strftime("%d %b %Y, %I:%M %p"),
            date_key=now.date(),
            month_key=now.strftime("%Y-%m"),
            action_type=action_type,
            target=target,
            details=details,
            reason=reason,
            admin_email=admin,
        )
        await self.audit_repo.create_audit_log(log)
        await self.session.commit()
        return {"id": str(lid), "success": True}
    
    async def reassign(
        self,
        currentEmail:str
    ) -> Dict[str,Any]:
        result = await self.faculty_repo.get_by_email(currentEmail);

        if result.role == "Advisor":
            result.role = "None"
        if result.role == "Advisor & Guide":
            result.role = "Guide"

        
        result.advisor_class = None
        result.advisor_batch = None 
        await self.session.commit()
        return {"message":"Removed as an advisor "}

    async def delete_guide(
        self,
        email:str
    ) -> Dict[str,Any]:
        
        result = await self.faculty_repo.get_by_email(email)
        
        if result.role == "Guide":
            result.role = "None"
        if result.role == "Advisor & Guide":
            result.role = "Advisor"

        result.teams_count = 0

        await self.session.commit()

        return {"message":"Removed as a guide "}
        
    

