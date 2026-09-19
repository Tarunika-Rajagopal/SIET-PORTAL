"""Marks router - weekly marks CRUD for advisors."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String

from database import get_db
from auth import get_current_user
from models import User, Team
from services.marks_service import MarksService
from schemas import SaveWeeklyMarksRequest

router = APIRouter(prefix="/api/v1/marks", tags=["Marks"])


async def _find_team_db_id(db, team_id: str):
    result = await db.execute(
        select(Team).where((Team.team_id == team_id) | (cast(Team.id, String) == team_id))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Team not found")
    return team.id


@router.get("/{team_id}/weekly")
async def get_all_weekly_marks(team_id: str,
                               user: User = Depends(get_current_user),
                               db: AsyncSession = Depends(get_db)):
    db_id = await _find_team_db_id(db, team_id)
    return await MarksService.get_all_team_marks(db, db_id)


@router.get("/{team_id}/weekly/{week_number}")
async def get_weekly_marks(team_id: str, week_number: int,
                           user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    db_id = await _find_team_db_id(db, team_id)
    marks = await MarksService.get_weekly_marks(db, db_id, week_number)
    if not marks:
        raise HTTPException(404, "No marks found for this week")
    return marks


@router.post("/{team_id}/weekly/{week_number}")
async def save_weekly_marks(team_id: str, week_number: int,
                            req: SaveWeeklyMarksRequest,
                            user: User = Depends(get_current_user),
                            db: AsyncSession = Depends(get_db)):
    db_id = await _find_team_db_id(db, team_id)
    return await MarksService.save_weekly_marks(
        db, db_id, week_number, req.memberMarks,
        req.remarks or "", req.gradedBy or "Class Advisor",
    )


@router.delete("/{team_id}/weekly/{week_number}")
async def delete_weekly_marks(team_id: str, week_number: int,
                              user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)):
    db_id = await _find_team_db_id(db, team_id)
    return await MarksService.delete_weekly_marks(db, db_id, week_number)
