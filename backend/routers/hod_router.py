"""HOD router - department-wide advisors, students, teams, faculty, history."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.hod_service import HODService
from schemas import HodHistoryRequest, DeleteWeeklySubmissionsRequest, UpdateWeekReleaseRequest

from services.cache_service import cache_service
from job_queue.producer import enqueue_job

router = APIRouter(prefix="/api/v1/hod", tags=["HOD"])


def get_hod_service(db: AsyncSession = Depends(get_db)) -> HODService:
    return HODService(db)


@router.get("/weekly-submissions/summary")
async def get_weekly_submissions_summary(
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    cache_key = "cache:hod:submissions:summary"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_weekly_submissions_summary()
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.delete("/weekly-submissions")
async def delete_weekly_submissions(
    req: DeleteWeeklySubmissionsRequest,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    res = await service.delete_weekly_submissions(req.weeks, user.email)
    await cache_service.delete_prefix("cache:hod:")
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:advisor:")
    return res


@router.delete("/weekly-submissions/{week}")
async def delete_single_week_submissions(
    week: int,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    res = await service.delete_weekly_submissions([week], user.email)
    await cache_service.delete_prefix("cache:hod:")
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:advisor:")
    return res


@router.get("/advisors")
async def get_advisors(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    cache_key = f"cache:hod:advisors:{batch}:{className}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_advisors(batch, className)
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.get("/students")
async def get_students(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    cache_key = f"cache:hod:students:{batch}:{className}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_students(batch, className)
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.get("/teams")
async def get_teams(
    batch: Optional[str] = None,
    className: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    if search:
        return await service.get_teams(batch, className, search)
    cache_key = f"cache:hod:teams:{batch}:{className}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_teams(batch, className, search)
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.get("/teams/{team_id}/submission/{week}")
@router.get("/teams/{team_id}/submissions/{week}")
async def get_team_submission(
    team_id: str,
    week: int,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    sub = await service.get_submission_detail(team_id, week)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission for team '{team_id}' week {week} not found",
        )
    return sub


@router.get("/faculty-list")
async def get_faculty_list(
    user: User = Depends(require_roles("hod")),
    service: HODService = Depends(get_hod_service),
):
    cache_key = "cache:hod:faculty_list"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_faculty_list()
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


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
    res = await service.log_history(
        req.actionType,
        req.target,
        req.details,
        req.classSection,
        req.batch,
        req.performedBy or user.email,
    )
    await cache_service.delete("cache:hod:history")
    return res


@router.get("/statistics")
async def get_statistics(
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    cache_key = "cache:hod:statistics"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_statistics()
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


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
    cache_key = "cache:hod:week_releases"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    releases = await service.get_week_releases()
    data = {"releases": releases}
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data


@router.put("/week-releases/{week}")
async def update_week_release(
    week: int,
    req: UpdateWeekReleaseRequest,
    user: User = Depends(require_roles("hod", "admin")),
    service: HODService = Depends(get_hod_service),
):
    # 1. Critical DB update runs immediately
    res = await service.update_week_release(week, req.released, user.name or user.email)

    # 2. Invalidate relevant caches in Redis
    await cache_service.delete("cache:hod:week_releases")
    await cache_service.delete("cache:student:week_releases")
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:hod:")

    # 3. Enqueue notification job to Redis queue without blocking response
    job_info = enqueue_job(
        job_type="SEND_WEEKLY_RELEASE_NOTIFICATION",
        payload={
            "week": week,
            "released": req.released,
            "performed_by": user.name or user.email,
        },
        idempotency_key=f"week_release_{week}_{req.released}",
    )

    # 4. Return response immediately
    return {
        "success": True,
        "week": res["week"],
        "released": res["released"],
        "releases": res["releases"],
        "job_id": job_info.get("job_id"),
        "message": f"Week {week} release status updated successfully.",
    }

