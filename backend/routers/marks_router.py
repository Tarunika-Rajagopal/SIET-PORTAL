"""Marks router - weekly marks CRUD for advisors."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.marks_service import MarksService
from schemas import SaveWeeklyMarksRequest

router = APIRouter(prefix="/api/v1/marks", tags=["Marks"])


def get_marks_service(db: AsyncSession = Depends(get_db)) -> MarksService:
    return MarksService(db)


@router.get("/{team_id}/weekly")
async def get_all_weekly_marks(
    team_id: str,
    user: User = Depends(require_roles("advisor", "hod", "guide", "student", "admin")),
    service: MarksService = Depends(get_marks_service),
):
    return await service.get_all_team_marks(team_id, user)


@router.get("/{team_id}/weekly/{week_number}")
async def get_weekly_marks(
    team_id: str,
    week_number: int,
    user: User = Depends(require_roles("advisor", "hod", "guide", "student", "admin")),
    service: MarksService = Depends(get_marks_service),
):
    return await service.get_weekly_marks(team_id, week_number, user)


@router.post("/{team_id}/weekly/{week_number}")
async def save_weekly_marks(
    team_id: str,
    week_number: int,
    req: SaveWeeklyMarksRequest,
    user: User = Depends(require_roles("advisor", "admin", "guide", "hod")),
    service: MarksService = Depends(get_marks_service),
):
    return await service.save_weekly_marks(
        team_id,
        week_number,
        req.memberMarks,
        req.remarks or "",
        req.gradedBy or user.name or "Head of Department",
    )


@router.delete("/{team_id}/weekly/{week_number}")
async def delete_weekly_marks(
    team_id: str,
    week_number: int,
    user: User = Depends(require_roles("advisor", "admin", "guide", "hod")),
    service: MarksService = Depends(get_marks_service),
):
    return await service.delete_weekly_marks(team_id, week_number)

