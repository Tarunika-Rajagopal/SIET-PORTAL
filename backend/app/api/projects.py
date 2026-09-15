from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import get_current_user, require_any_role
from app.services.project_service import ProjectService
from app.schemas.projects import ProjectResponse, UpdateTitleRequest, TitleApprovalRequest, ProjectTitleHistoryResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])

@router.get("/team/{team_id}", response_model=ProjectResponse)
async def get_project_by_team(
    team_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    service = ProjectService(db)
    return await service.get_project_by_team_id(team_id, user)

@router.put("/team/{team_id}/title", response_model=ProjectResponse)
async def update_project_title(
    team_id: UUID,
    req: UpdateTitleRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    service = ProjectService(db)
    return await service.update_title(team_id, req, user)

@router.post("/{project_id}/title-approval", response_model=ProjectResponse)
async def approve_project_title(
    project_id: UUID,
    req: TitleApprovalRequest,
    guide_user: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = ProjectService(db)
    return await service.approve_title(project_id, req, guide_user)

@router.get("/{project_id}/title-history", response_model=List[ProjectTitleHistoryResponse])
async def get_title_history(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    service = ProjectService(db)
    return await service.get_title_history(project_id, user)
