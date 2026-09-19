"""Admin router - CRUD for faculties, students, audit logs."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import get_current_user
from models import User
from services.admin_service import AdminService
from schemas import (
    AddFacultyRequest, UpdateFacultyRequest, AddStudentRequest,
    ImportStudentsRequest, AuditLogRequest,
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/faculties")
async def get_faculties(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await AdminService.get_faculties(db)


@router.post("/faculties")
async def add_faculty(req: AddFacultyRequest, user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await AdminService.add_faculty(
        db, req.name, req.email, req.designation, req.role,
        req.specialization, req.advisorBatch, req.advisorClass,
    )


@router.put("/faculties/{faculty_id}")
async def update_faculty(faculty_id: str, req: UpdateFacultyRequest,
                         user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdminService.update_faculty(db, faculty_id, req.dict(exclude_unset=True))


@router.delete("/faculties/{faculty_id}")
async def delete_faculty(faculty_id: str, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdminService.delete_faculty(db, faculty_id)


@router.post("/faculties/{faculty_id}/assign-guide")
async def assign_guide(faculty_id: str, user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    return await AdminService.assign_guide(db, faculty_id)


@router.post("/faculties/{faculty_id}/remove-guide")
async def remove_guide(faculty_id: str, user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    return await AdminService.remove_guide(db, faculty_id)


@router.post("/faculties/{faculty_id}/assign-advisor")
async def assign_advisor(faculty_id: str, batch: str = "2023-2027 (III Year)",
                         className: str = "CSE-B",
                         user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdminService.assign_advisor(db, faculty_id, batch, className)


@router.post("/faculties/{faculty_id}/remove-advisor")
async def remove_advisor(faculty_id: str, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdminService.remove_advisor(db, faculty_id)


# ── Students ────────────────────────────────────────────────────
@router.get("/students")
async def get_students(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await AdminService.get_students(db)


@router.post("/students")
async def add_student(req: AddStudentRequest, user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await AdminService.add_student(
        db, req.name, req.rollNo, req.email,
        req.password or "student@123",
        req.batch or "2023-2027 (III Year)",
        req.classSection or "CSE-B",
    )


@router.post("/students/import")
async def import_students(req: ImportStudentsRequest,
                          user: User = Depends(get_current_user),
                          db: AsyncSession = Depends(get_db)):
    return await AdminService.import_students(db, req.students)


@router.delete("/students/{roll_no}")
async def delete_student(roll_no: str, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdminService.delete_student(db, roll_no)


# ── Audit Logs ──────────────────────────────────────────────────
@router.get("/audit-logs")
async def get_audit_logs(user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdminService.get_audit_logs(db)


@router.post("/audit-logs")
async def add_audit_log(req: AuditLogRequest, user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    return await AdminService.add_audit_log(
        db, req.actionType, req.target, req.details,
        req.reason or "", req.admin or "admin@siet.ac.in",
    )
