"""Marks router - weekly marks CRUD for advisors."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.marks_service import MarksService
from schemas import SaveWeeklyMarksRequest

router = APIRouter(prefix="/api/v1/marks", tags=["Marks"])


from services.cache_service import cache_service


def get_marks_service(db: AsyncSession = Depends(get_db)) -> MarksService:
    return MarksService(db)


@router.get("/all")
async def get_all_marks(
    user: User = Depends(require_roles("advisor", "advisor & guide", "hod", "guide", "student", "admin")),
    service: MarksService = Depends(get_marks_service),
):
    cache_key = "cache:marks:all"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached
    data = await service.get_all_marks()
    await cache_service.set_json(cache_key, data, expire_seconds=300)
    return data


@router.get("/{team_id}/weekly")
async def get_all_weekly_marks(
    team_id: str,
    user: User = Depends(require_roles("advisor", "advisor & guide", "hod", "guide", "student", "admin")),
    service: MarksService = Depends(get_marks_service),
):
    return await service.get_all_team_marks(team_id, user)


@router.get("/{team_id}/weekly/{week_number}")
async def get_weekly_marks(
    team_id: str,
    week_number: int,
    user: User = Depends(require_roles("advisor", "advisor & guide", "hod", "guide", "student", "admin")),
    service: MarksService = Depends(get_marks_service),
):
    return await service.get_weekly_marks(team_id, week_number, user)


@router.post("/{team_id}/weekly/{week_number}")
async def save_weekly_marks(
    team_id: str,
    week_number: int,
    req: SaveWeeklyMarksRequest,
    user: User = Depends(require_roles("advisor", "advisor & guide", "admin", "guide", "hod")),
    service: MarksService = Depends(get_marks_service),
):
    res = await service.save_weekly_marks(
        team_id,
        week_number,
        req.memberMarks,
        req.remarks or "",
        req.gradedBy or user.name or "Head of Department",
    )
    await cache_service.invalidate_team(team_id)
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:advisor:")
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:hod:")
    await cache_service.delete_prefix("cache:admin:")
    await cache_service.delete_prefix("cache:teams")
    await cache_service.delete_prefix("cache:marks:")
    return res


@router.delete("/{team_id}/weekly/{week_number}")
async def delete_weekly_marks(
    team_id: str,
    week_number: int,
    user: User = Depends(require_roles("advisor", "admin", "guide", "hod")),
    service: MarksService = Depends(get_marks_service),
):
    res = await service.delete_weekly_marks(team_id, week_number)
    await cache_service.invalidate_team(team_id)
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:advisor:")
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:hod:")
    await cache_service.delete_prefix("cache:admin:")
    await cache_service.delete_prefix("cache:teams")
    await cache_service.delete_prefix("cache:marks:")
    return res

