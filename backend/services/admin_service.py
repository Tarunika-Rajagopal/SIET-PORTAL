"""Admin service - manages faculties, students, and audit logs."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from models import User, Faculty, Student, Team, TeamMember, AuditLog


class AdminService:

    @staticmethod
    async def get_faculties(db: AsyncSession) -> List[dict]:
        rows = (await db.execute(select(Faculty))).scalars().all()
        return [
            {
                "id": str(f.id), "name": f.name, "email": f.email,
                "designation": f.designation, "role": f.role or "None",
                "advisorBatch": f.advisor_batch or "", "advisorClass": f.advisor_class or "",
                "specialization": f.specialization or "", "teamsCount": f.teams_count or 0,
                "maxQuota": f.max_quota or 5, "status": f.status or "Active",
            }
            for f in rows
        ]

    @staticmethod
    async def add_faculty(db: AsyncSession, name: str, email: str, designation: str,
                          role: str, specialization: str = "", advisor_batch: str = None,
                          advisor_class: str = None) -> dict:
        fid = uuid.uuid4()
        f = Faculty(id=fid, name=name, email=email, designation=designation,
                    role=role, specialization=specialization,
                    advisor_batch=advisor_batch, advisor_class=advisor_class)
        db.add(f)
        await db.commit()
        return {"id": str(fid), "name": name, "email": email, "success": True}

    @staticmethod
    async def update_faculty(db: AsyncSession, faculty_id: str, updates: dict) -> dict:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = (await db.execute(select(Faculty).where(Faculty.id == fid))).scalar_one_or_none()
        if not f:
            return {"success": False, "message": "Faculty not found"}
        for key, val in updates.items():
            col = key.replace("camelCase", "").replace("_", "")
            attr_map = {
                "name": "name", "email": "email", "designation": "designation",
                "role": "role", "specialization": "specialization",
                "advisorbatch": "advisor_batch", "advisorclass": "advisor_class",
                "teamscount": "teams_count", "maxquota": "max_quota", "status": "status",
            }
            attr = attr_map.get(col.lower())
            if attr and hasattr(f, attr):
                setattr(f, attr, val)
        f.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return {"success": True, "message": f"Faculty {f.name} updated"}

    @staticmethod
    async def delete_faculty(db: AsyncSession, faculty_id: str) -> dict:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = (await db.execute(select(Faculty).where(Faculty.id == fid))).scalar_one_or_none()
        if not f:
            return {"success": False, "message": "Faculty not found"}
        await db.delete(f)
        await db.commit()
        return {"success": True, "message": "Faculty deleted"}

    @staticmethod
    async def assign_guide(db: AsyncSession, faculty_id: str) -> dict:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = (await db.execute(select(Faculty).where(Faculty.id == fid))).scalar_one_or_none()
        if not f:
            return {"success": False, "message": "Faculty not found"}
        if f.role in ("Guide", "Advisor & Guide"):
            return {"success": False, "message": "Already a guide"}
        f.role = "Advisor & Guide" if (f.advisor_class or f.advisor_batch) else "Guide"
        f.status = "Active"
        await db.commit()
        return {"success": True, "message": f"{f.name} assigned as Guide"}

    @staticmethod
    async def remove_guide(db: AsyncSession, faculty_id: str) -> dict:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = (await db.execute(select(Faculty).where(Faculty.id == fid))).scalar_one_or_none()
        if not f:
            return {"success": False, "message": "Faculty not found"}
        f.role = "Advisor" if f.advisor_class else "None"
        f.teams_count = 0
        await db.commit()
        return {"success": True, "message": f"Guide role removed from {f.name}"}

    @staticmethod
    async def assign_advisor(db: AsyncSession, faculty_id: str, batch: str, className: str) -> dict:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = (await db.execute(select(Faculty).where(Faculty.id == fid))).scalar_one_or_none()
        if not f:
            return {"success": False, "message": "Faculty not found"}
        existing = (await db.execute(
            select(Faculty).where(Faculty.id != fid, Faculty.advisor_batch == batch, Faculty.advisor_class == className)
        )).scalar_one_or_none()
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
        await db.commit()
        return {"success": True, "message": f"{f.name} assigned as Advisor for {className}"}

    @staticmethod
    async def remove_advisor(db: AsyncSession, faculty_id: str) -> dict:
        try:
            fid = uuid.UUID(faculty_id)
        except Exception:
            return {"success": False, "message": "Invalid faculty ID"}
        f = (await db.execute(select(Faculty).where(Faculty.id == fid))).scalar_one_or_none()
        if not f:
            return {"success": False, "message": "Faculty not found"}
        f.role = "Guide" if f.teams_count > 0 else "None"
        f.advisor_batch = None
        f.advisor_class = None
        await db.commit()
        return {"success": True, "message": f"Advisor role removed from {f.name}"}

    # ── Students ────────────────────────────────────────────────────
    @staticmethod
    async def get_students(db: AsyncSession) -> List[dict]:
        rows = (await db.execute(select(Student))).scalars().all()
        return [
            {
                "rollNo": s.roll_no, "name": s.name, "email": s.email,
                "batch": s.batch or "2023-2027 (III Year)",
                "classSection": s.class_section or "CSE-B",
                "teamNo": s.team_no or "Unassigned",
                "projectTitle": s.project_title or "", "guide": s.guide or "Unassigned",
            }
            for s in rows
        ]

    @staticmethod
    async def add_student(db: AsyncSession, name: str, roll_no: str, email: str,
                          password: str = "student@123", batch: str = "2023-2027 (III Year)",
                          class_section: str = "CSE-B") -> dict:
        existing = (await db.execute(select(Student).where(Student.roll_no == roll_no))).scalar_one_or_none()
        if existing:
            return {"success": False, "message": f"Student {roll_no} already exists"}
        sid = uuid.uuid4()
        s = Student(id=sid, roll_no=roll_no, name=name, email=email, password=password,
                    batch=batch, class_section=class_section)
        db.add(s)
        u = User(id=uuid.uuid4(), email=email, password=password, name=name,
                 roll_no=roll_no, department="Computer Science and Engineering",
                 role="student", class_name=class_section, batch=batch)
        db.add(u)
        await db.commit()
        return {"success": True, "message": f"Student {name} enrolled", "rollNo": roll_no}

    @staticmethod
    async def delete_student(db: AsyncSession, roll_no: str) -> dict:
        s = (await db.execute(select(Student).where(Student.roll_no == roll_no))).scalar_one_or_none()
        if not s:
            return {"success": False, "message": "Student not found"}
        await db.delete(s)
        u = (await db.execute(select(User).where(User.roll_no == roll_no))).scalar_one_or_none()
        if u:
            await db.delete(u)
        await db.commit()
        return {"success": True, "message": f"Student {roll_no} removed"}

    @staticmethod
    async def import_students(db: AsyncSession, students: list) -> dict:
        added = 0
        errors = []
        for st in students:
            if not st.get("name") or not st.get("rollNo") or not st.get("email"):
                errors.append("Missing required fields")
                continue
            existing = (await db.execute(
                select(Student).where(Student.roll_no == st["rollNo"])
            )).scalar_one_or_none()
            if existing:
                errors.append(f"Duplicate {st['rollNo']}")
                continue
            sid = uuid.uuid4()
            s = Student(id=sid, roll_no=st["rollNo"], name=st["name"], email=st["email"],
                        password=st.get("password", "student@123"),
                        batch=st.get("batch", "2023-2027 (III Year)"),
                        class_section=st.get("classSection", "CSE-B"))
            db.add(s)
            u = User(id=uuid.uuid4(), email=st["email"], password=st.get("password", "student@123"),
                     name=st["name"], roll_no=st["rollNo"],
                     department="Computer Science and Engineering", role="student",
                     class_name=st.get("classSection", "CSE-B"), batch=st.get("batch", "2023-2027 (III Year)"))
            db.add(u)
            added += 1
        await db.commit()
        return {"addedCount": added, "errors": errors}

    # ── Audit Logs ──────────────────────────────────────────────────
    @staticmethod
    async def get_audit_logs(db: AsyncSession) -> List[dict]:
        rows = (await db.execute(
            select(AuditLog).order_by(AuditLog.created_at.desc())
        )).scalars().all()
        return [
            {
                "id": str(l.id), "timestamp": l.timestamp.isoformat() if l.timestamp else "",
                "dateFormatted": l.date_formatted or "",
                "dateKey": l.date_key.isoformat() if l.date_key else "",
                "monthKey": l.month_key or "", "actionType": l.action_type or "",
                "target": l.target or "", "details": l.details or "",
                "reason": l.reason or "", "admin": l.admin_email or "",
            }
            for l in rows
        ]

    @staticmethod
    async def add_audit_log(db: AsyncSession, action_type: str, target: str,
                            details: str, reason: str = "",
                            admin: str = "admin@siet.ac.in") -> dict:
        now = datetime.now(timezone.utc)
        lid = uuid.uuid4()
        log = AuditLog(
            id=lid, timestamp=now,
            date_formatted=now.strftime("%d %b %Y, %I:%M %p"),
            date_key=now.date(), month_key=now.strftime("%Y-%m"),
            action_type=action_type, target=target, details=details,
            reason=reason, admin_email=admin,
        )
        db.add(log)
        await db.commit()
        return {"id": str(lid), "success": True}
