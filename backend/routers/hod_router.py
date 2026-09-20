"""HOD router - department-wide advisors, students, teams, faculty, history."""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.hod_service import HODService
from schemas import HodHistoryRequest

router = APIRouter(prefix="/api/v1/hod", tags=["HOD"])


def get_hod_service(db: AsyncSession = Depends(get_db)) -> HODService:
    return HODService(db)


@router.get("/advisors")
async def get_advisors(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_advisors(batch, className)


@router.get("/students")
async def get_students(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_students(batch, className)


@router.get("/teams")
async def get_teams(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_teams(batch, className, search)


@router.get("/faculty-list")
async def get_faculty_list(
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_faculty_list()


@router.get("/history")
async def get_history(
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_history()


@router.post("/history")
async def log_history(
    req: HodHistoryRequest,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    return await service.log_history(
        req.actionType,
        req.target,
        req.details,
        req.classSection,
        req.batch,
        req.performedBy or user.email,
    )
