from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_role, require_any_role
from app.services.advisor_portal_service import AdvisorPortalService
from app.schemas.portals import AdvisorDashboardResponse, StudentInspectionResponse, AutoGenerateTeamsRequest
from app.schemas.teams import TeamCreate, TeamResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/advisor", tags=["Advisor Portal"])

@router.get("/dashboard", response_model=AdvisorDashboardResponse)
async def get_advisor_dashboard(
    advisor_user: User = Depends(require_any_role(["advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdvisorPortalService(db)
    return await service.get_dashboard(advisor_user)

@router.get("/teams", response_model=List[TeamResponse])
async def get_advisor_teams(
    advisor_user: User = Depends(require_any_role(["advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdvisorPortalService(db)
    return await service.get_teams(advisor_user)

@router.post("/teams/create-manual", response_model=TeamResponse, status_code=201)
async def create_manual_team(
    data: TeamCreate,
    advisor_user: User = Depends(require_any_role(["advisor", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdvisorPortalService(db)
    return await service.create_manual_team(data, advisor_user)

@router.post("/teams/auto-generate", response_model=List[TeamResponse], status_code=201)
async def auto_generate_teams(
    req: AutoGenerateTeamsRequest,
    advisor_user: User = Depends(require_any_role(["advisor", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdvisorPortalService(db)
    return await service.auto_generate_teams(req, advisor_user)

@router.get("/students/inspection", response_model=List[StudentInspectionResponse])
async def get_student_inspection(
    advisor_user: User = Depends(require_any_role(["advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = AdvisorPortalService(db)
    return await service.get_student_inspection(advisor_user)
