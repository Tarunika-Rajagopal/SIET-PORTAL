from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import get_current_user, require_role, require_any_role
from app.services.evaluation_service import EvaluationService
from app.schemas.evaluations import (
    EvaluationCreate, EvaluationResponse, RevisionRequestCreate, RevisionRequestResponse
)
from app.models.users import User

router = APIRouter(prefix="/api/v1/evaluations", tags=["Evaluations & Marks"])

@router.post("/team/{team_id}", response_model=EvaluationResponse, status_code=201)
async def create_evaluation(
    team_id: UUID,
    data: EvaluationCreate,
    evaluator: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = EvaluationService(db)
    return await service.create_evaluation(team_id, data, evaluator)

@router.get("/team/{team_id}", response_model=List[EvaluationResponse])
async def get_team_evaluations(
    team_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    service = EvaluationService(db)
    return await service.get_team_evaluations(team_id, user)

@router.get("/student/marks", response_model=List[EvaluationResponse])
async def get_student_marks(
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = EvaluationService(db)
    return await service.get_student_marks(student_user)

@router.post("/team/{team_id}/revision", response_model=RevisionRequestResponse)
async def request_revision(
    team_id: UUID,
    data: RevisionRequestCreate,
    user: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = EvaluationService(db)
    return await service.request_revision(team_id, data, user)
