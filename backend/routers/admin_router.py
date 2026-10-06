from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


from database import get_db
from auth import require_roles
from models import User
from services.admin_service import AdminService
from services.cache_service import cache_service
from schemas import (
    AddFacultyRequest,
    UpdateFacultyRequest,
    AddStudentRequest,
    ImportStudentsRequest,
    AuditLogRequest,
    ReassignRequest,
    AssignAdvisorModel,
    deleteFaculty
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    return AdminService(db)


@router.get("/faculties")
async def get_faculties(
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    cache_key = "cache:admin:faculties"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_faculties()
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.post("/faculties")
async def add_faculty(
    req: AddFacultyRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.add_faculty(
        req.name,
        req.email,
        req.designation,
        req.role,
        req.specialization,
        req.advisorBatch,
        req.advisorClass,
    )
    await cache_service.invalidate_faculties()
    return res


@router.put("/faculties/{faculty_id}")
async def update_faculty(
    faculty_id: str,
    req: UpdateFacultyRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.update_faculty(faculty_id, req.dict(exclude_unset=True))
    await cache_service.invalidate_faculties()
    return res


@router.post("/faculties/remove-faculty")
async def delete_faculty(
    req: deleteFaculty,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.delete_faculty(req.faculty_email)
    await cache_service.invalidate_faculties()
    return res


@router.delete("/faculties/{faculty_id}")
async def delete_faculty_by_id(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.delete_faculty(faculty_id)
    await cache_service.invalidate_faculties()
    return res


@router.post("/faculties/{faculty_id}/assign-guide")
async def assign_guide(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.assign_guide(faculty_id)
    await cache_service.invalidate_faculties()
    return res


@router.post("/faculties/{faculty_id}/remove-guide")
async def remove_guide(
    faculty_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.remove_guide(faculty_id)
    await cache_service.invalidate_faculties()
    return res


@router.post("/faculties/assign-advisor")
async def assign_advisor(
    data:AssignAdvisorModel, 
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.assign_advisor(data.faculty_id, data.batch, data.className)
    await cache_service.invalidate_faculties()
    return res


@router.post("/faculties/{faculty_id}/remove-advisor")
async def remove_advisor(
    faculty_name: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.remove_advisor(faculty_name)
    await cache_service.invalidate_faculties()
    return res


# ── Students ────────────────────────────────────────────────────
@router.get("/students")
async def get_students(
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    cache_key = "cache:admin:students"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_students()
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.post("/students")
async def add_student(
    req: AddStudentRequest,
    user: User = Depends(require_roles("admin", "advisor", "advisor & guide", "hod")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.add_student(
        req.name,
        req.rollNo,
        req.email,
        req.password or "student@123",
        req.batch or "2023-2027 (III Year)",
        req.classSection or "CSE-B",
        req.guide or "Unassigned"
    )
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to enroll student")
        )
    await cache_service.invalidate_students()
    return res


@router.post("/students/import")
async def import_students(
    req: ImportStudentsRequest,
    user: User = Depends(require_roles("admin", "advisor", "advisor & guide", "hod")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.import_students(req.students)
    await cache_service.invalidate_students()
    return res


@router.delete("/students/{roll_no}")
async def delete_student(
    roll_no: str,
    user: User = Depends(require_roles("admin", "advisor", "advisor & guide", "hod")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.delete_student(roll_no)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to delete student")
        )
    await cache_service.invalidate_students()
    await cache_service.invalidate_teams()
    return res


# ── Teams ───────────────────────────────────────────────────────
@router.get("/teams")
async def get_teams(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    return await service.get_teams(batch=batch, class_name=className, search=search)


@router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.delete_team(team_id)
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Failed to delete team")
        )
    await cache_service.invalidate_teams()
    await cache_service.invalidate_students()
    await cache_service.invalidate_faculties()
    return res



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
    res = await service.reassign(request.email_one)
    await cache_service.invalidate_faculties()
    return res

@router.post("/delete-guide")
async def delete_guide(
    request: ReassignRequest,
    user: User = Depends(require_roles("admin")),
    service: AdminService = Depends(get_admin_service),
):
    res = await service.delete_guide(request.email_one)
    await cache_service.invalidate_faculties()
    return res
    