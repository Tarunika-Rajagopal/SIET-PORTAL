"""Advisor router - teams, students, guide assignment for a class."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_roles
from models import User
from services.advisor_service import AdvisorService
from schemas import (
    CreateTeamRequest,
    MoveStudentRequest,
    ReassignGuideRequest,
    UpdateTeamRequest,
)

router = APIRouter(prefix="/api/v1/advisor", tags=["Advisor"])


def get_advisor_service(db: AsyncSession = Depends(get_db)) -> AdvisorService:
    return AdvisorService(db)


@router.get("/teams")
async def get_teams(
    className: str = "CSE-B",
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.get_teams_for_class(className)


@router.get("/students")
async def get_students(
    className: str = "CSE-B",
    batch: str = "2023-2027 (III Year)",
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.get_class_students(className, batch)


@router.post("/teams")
async def create_team(
    req: CreateTeamRequest,
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.create_team(
        req.className,
        req.batch,
        req.capacity,
        req.teamNo,
        req.title,
        req.guide,
        req.guideEmail,
        req.leadRollNo,
        req.memberRollNos,
    )


@router.post("/move-student")
async def move_student(
    req: MoveStudentRequest,
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.move_student(
        req.className,
        req.studentRollNo,
        req.targetTeamId,
    )


@router.post("/reassign-guide")
async def reassign_guide(
    req: ReassignGuideRequest,
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.reassign_guide(
        req.className,
        req.teamId,
        req.guideName,
        req.guideEmail or "",
    )


@router.put("/teams/{team_id}")
async def update_team(
    team_id: str,
    req: UpdateTeamRequest,
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.update_team(
        req.className,
        req.batch,
        team_id,
        req.dict(exclude_unset=True),
    )


@router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    user: User = Depends(require_roles("advisor")),
    service: AdvisorService = Depends(get_advisor_service),
):
    return await service.delete_team(team_id)
