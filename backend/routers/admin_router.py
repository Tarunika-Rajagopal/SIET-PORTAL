"""Admin router - CRUD for faculties, students, audit logs."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.admin_service import AdminService
from schemas import (
    AddFacultyRequest,
    UpdateFacultyRequest,
    AddStudentRequest,
    ImportStudentsRequest,
    AuditLogRequest,
    ReassignRequest,
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    return AdminService(db)


@router.get("/faculties")
async def get_faculties(
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.get_faculties()


@router.post("/faculties")
async def add_faculty(
    req: AddFacultyRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.add_faculty(
        req.name,
        req.email,
        req.designation,
        req.role,
        req.specialization,
        req.advisorBatch,
        req.advisorClass,
    )


@router.put("/faculties/{faculty_id}")
async def update_faculty(
    faculty_id: str,
    req: UpdateFacultyRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.update_faculty(faculty_id, req.dict(exclude_unset=True))


@router.delete("/faculties/{faculty_id}")
async def delete_faculty(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.delete_faculty(faculty_id)


@router.post("/faculties/{faculty_id}/assign-guide")
async def assign_guide(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.assign_guide(faculty_id)


@router.post("/faculties/{faculty_id}/remove-guide")
async def remove_guide(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.remove_guide(faculty_id)


@router.post("/faculties/{faculty_id}/assign-advisor")
async def assign_advisor(
    faculty_id: str,
    batch: str = "2023-2027 (III Year)",
    className: str = "CSE-B",
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.assign_advisor(faculty_id, batch, className)


@router.post("/faculties/{faculty_id}/remove-advisor")
async def remove_advisor(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.remove_advisor(faculty_id)


# ── Students ────────────────────────────────────────────────────
@router.get("/students")
async def get_students(
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.get_students()


@router.post("/students")
async def add_student(
    req: AddStudentRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.add_student(
        req.name,
        req.rollNo,
        req.email,
        req.password or "student@123",
        req.batch or "2023-2027 (III Year)",
        req.classSection or "CSE-B",
    )


@router.post("/students/import")
async def import_students(
    req: ImportStudentsRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.import_students(req.students)


@router.delete("/students/{roll_no}")
async def delete_student(
    roll_no: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.delete_student(roll_no)


# ── Audit Logs ──────────────────────────────────────────────────
@router.get("/audit-logs")
async def get_audit_logs(
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.get_audit_logs()


@router.post("/audit-logs")
async def add_audit_log(
    req: AuditLogRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.add_audit_log(
        req.actionType,
        req.target,
        req.details,
        req.reason or "",
        req.admin or user.email,
    )

@router.post("/reassign")
async def reassign(
    request: ReassignRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.reassign(request.email_one,request.email_two)

