from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import get_current_user, require_any_role, require_role
from app.services.team_service import TeamService
from app.schemas.teams import TeamCreate, TeamResponse, AddMemberRequest, AllocateGuideRequest
from app.models.users import User

router = APIRouter(prefix="/api/v1/teams", tags=["Teams"])

@router.get("", response_model=List[TeamResponse])
async def list_teams(
    batch_id: Optional[UUID] = None,
    section_id: Optional[UUID] = None,
    guide_id: Optional[UUID] = None,
    user: User = Depends(require_any_role(["admin", "advisor", "guide", "hod"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = TeamService(db)
    return await service.list_teams(batch_id=batch_id, section_id=section_id, guide_id=guide_id)

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    service = TeamService(db)
    return await service.get_team_by_id(team_id, user)

@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    data: TeamCreate,
    advisor_user: User = Depends(require_any_role(["admin", "advisor"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = TeamService(db)
    return await service.create_team(data, advisor_user)

@router.post("/{team_id}/members", response_model=TeamResponse)
async def add_member(
    team_id: UUID,
    req: AddMemberRequest,
    advisor_user: User = Depends(require_any_role(["admin", "advisor"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = TeamService(db)
    return await service.add_member(team_id, req)

@router.delete("/{team_id}/members/{student_id}", response_model=TeamResponse)
async def remove_member(
    team_id: UUID,
    student_id: UUID,
    advisor_user: User = Depends(require_any_role(["admin", "advisor"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = TeamService(db)
    return await service.remove_member(team_id, student_id)

@router.post("/{team_id}/allocate-guide", response_model=TeamResponse)
async def allocate_guide(
    team_id: UUID,
    req: AllocateGuideRequest,
    advisor_user: User = Depends(require_any_role(["admin", "advisor", "hod"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = TeamService(db)
    return await service.allocate_guide(team_id, req)
