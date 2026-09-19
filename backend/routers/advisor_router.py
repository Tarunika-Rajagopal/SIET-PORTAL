"""Advisor router - teams, students, guide assignment for a class."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from auth import get_current_user
from models import User, Team
from services.advisor_service import AdvisorService
from schemas import (
    CreateTeamRequest, MoveStudentRequest, ReassignGuideRequest,
    UpdateTeamRequest,
)

router = APIRouter(prefix="/api/v1/advisor", tags=["Advisor"])


@router.get("/teams")
async def get_teams(className: str = "CSE-B",
                    user: User = Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    return await AdvisorService.get_teams_for_class(db, className)


@router.get("/students")
async def get_students(className: str = "CSE-B", batch: str = "2023-2027 (III Year)",
                       user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    return await AdvisorService.get_class_students(db, className, batch)


@router.post("/teams")
async def create_team(req: CreateTeamRequest,
                      user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await AdvisorService.create_team(
        db, req.className, req.batch, req.capacity,
        req.teamNo, req.title, req.guide, req.guideEmail,
        req.leadRollNo, req.memberRollNos,
    )


@router.post("/move-student")
async def move_student(req: MoveStudentRequest,
                       user: User = Depends(get_current_user),
                       db: AsyncSession = Depends(get_db)):
    return await AdvisorService.move_student(
        db, req.className, req.studentRollNo, req.targetTeamId,
    )


@router.post("/reassign-guide")
async def reassign_guide(req: ReassignGuideRequest,
                         user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    return await AdvisorService.reassign_guide(
        db, req.className, req.teamId, req.guideName, req.guideEmail or "",
    )


@router.put("/teams/{team_id}")
async def update_team(team_id: str, req: UpdateTeamRequest,
                      user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await AdvisorService.update_team(
        db, req.className, req.batch, team_id, req.dict(exclude_unset=True),
    )


@router.delete("/teams/{team_id}")
async def delete_team(team_id: str,
                      user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await AdvisorService.delete_team(db, team_id)
