"""HOD router - department-wide advisors, students, teams, faculty, history."""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.hod_service import HODService
from schemas import HodHistoryRequest, DeleteWeeklySubmissionsRequest, UpdateWeekReleaseRequest

router = APIRouter(prefix="/api/v1/hod", tags=["HOD"])


def get_hod_service(db: AsyncSession = Depends(get_db)) -> HODService:
    return HODService(db)


@router.get("/weekly-submissions/summary")
async def get_weekly_submissions_summary(
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_weekly_submissions_summary()


@router.delete("/weekly-submissions")
async def delete_weekly_submissions(
    req: DeleteWeeklySubmissionsRequest,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    return await service.delete_weekly_submissions(req.weeks, user.email)


@router.delete("/weekly-submissions/{week}")
async def delete_single_week_submissions(
    week: int,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    return await service.delete_weekly_submissions([week], user.email)


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


@router.get("/statistics")
async def get_statistics(
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_statistics()


@router.get("/filter-options")
async def get_filter_options(
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    return await service.get_filter_options()


@router.get("/week-releases")
async def get_week_releases(
    service: HODService = Depends(get_hod_service),
):
    releases = await service.get_week_releases()
    return {"releases": releases}


@router.put("/week-releases/{week}")
async def update_week_release(
    week: int,
    req: UpdateWeekReleaseRequest,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    return await service.update_week_release(week, req.released, user.name or user.email)

