"""HOD router - department-wide advisors, students, teams, faculty, history."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import get_current_user
from models import User
from services.hod_service import HODService
from schemas import HodHistoryRequest

router = APIRouter(prefix="/api/v1/hod", tags=["HOD"])


@router.get("/advisors")
async def get_advisors(batch: str = None, className: str = None,
                       user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    return await HODService.get_advisors(db, batch, className)


@router.get("/students")
async def get_students(batch: str = None, className: str = None,
                       user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    return await HODService.get_students(db, batch, className)


@router.get("/teams")
async def get_teams(batch: str = None, className: str = None,
                    search: str = None,
                    user: User = Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    return await HODService.get_teams(db, batch, className, search)


@router.get("/faculty-list")
async def get_faculty_list(user: User = Depends(get_current_user),
                           db: AsyncSession = Depends(get_db)):
    return await HODService.get_faculty_list(db)


@router.get("/history")
async def get_history(user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await HODService.get_history(db)


@router.post("/history")
async def log_history(req: HodHistoryRequest,
                      user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await HODService.log_history(
        db, req.actionType, req.target, req.details,
        req.classSection, req.batch, req.performedBy,
    )
