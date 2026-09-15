from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_role
from app.services.admin_service import AdminService
from app.schemas.portals import AdminUserResponse, UpdateFacultyRequest, CsvImportResponse
from app.schemas.audit_notifications import AuditLogResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Portal"])

@router.get("/users")
async def get_users(
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdminService(db)
    items, total = await service.get_users_paginated(role_filter=role, search_query=search, page=page, page_size=pageSize)
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize
    }

@router.put("/faculty/{faculty_id}", response_model=AdminUserResponse)
async def update_faculty_profile(
    faculty_id: UUID,
    req: UpdateFacultyRequest,
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdminService(db)
    return await service.update_faculty_profile(faculty_id, req, admin_user)

@router.post("/students/import-csv", response_model=CsvImportResponse)
async def import_students_csv(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db_session)
):
    contents = await file.read()
    csv_str = contents.decode("utf-8")
    service = AdminService(db)
    return await service.import_students_csv(csv_str, admin_user)

@router.get("/audit-logs")
async def get_audit_logs(
    actionType: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdminService(db)
    items, total = await service.get_audit_logs(action_type=actionType, search_query=search, page=page, page_size=pageSize)
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize
    }
