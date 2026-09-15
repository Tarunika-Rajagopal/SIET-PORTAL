from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_role
from app.services.student_portal_service import StudentPortalService
from app.schemas.student_portal import StudentDashboardResponse
from app.schemas.teams import TeamResponse
from app.schemas.projects import ProjectResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/student", tags=["Student Portal"])

@router.get("/dashboard", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = StudentPortalService(db)
    return await service.get_dashboard(student_user)

@router.get("/team", response_model=TeamResponse)
async def get_student_team(
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = StudentPortalService(db)
    return await service.get_my_team(student_user)

@router.get("/project", response_model=ProjectResponse)
async def get_student_project(
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = StudentPortalService(db)
    return await service.get_my_project(student_user)
