from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_role, require_any_role
from app.services.hod_portal_service import HodPortalService
from app.schemas.portals import HodAnalyticsResponse, FacultyWorkloadResponse, AssignAdvisorRequest
from app.models.users import User

router = APIRouter(prefix="/api/v1/hod", tags=["HOD Portal"])

@router.get("/analytics", response_model=HodAnalyticsResponse)
async def get_hod_analytics(
    hod_user: User = Depends(require_any_role(["hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = HodPortalService(db)
    return await service.get_analytics(hod_user)

@router.get("/faculty-workload", response_model=List[FacultyWorkloadResponse])
async def get_faculty_workload(
    hod_user: User = Depends(require_any_role(["hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = HodPortalService(db)
    return await service.get_faculty_workload(hod_user)

@router.post("/assign-advisor")
async def assign_advisor(
    req: AssignAdvisorRequest,
    hod_user: User = Depends(require_any_role(["hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = HodPortalService(db)
    return await service.assign_advisor(hod_user, req)
