from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from auth import require_roles
from schemas import UpdateTitleRequest, TitleApprovalRequest
from services.project_service import ProjectService

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(db)


@router.put("/team/{team_id}/title")
async def update_project_title(
    team_id: str,
    req: UpdateTitleRequest,
    current_user: User = Depends(require_roles("student", "advisor", "admin")),
    service: ProjectService = Depends(get_project_service),
):
    return await service.update_project_title(team_id, req, current_user)


@router.post("/{project_id}/title-approval")
async def review_title_approval(
    project_id: str,
    req: TitleApprovalRequest,
    current_user: User = Depends(require_roles("guide", "admin")),
    service: ProjectService = Depends(get_project_service),
):
    return await service.review_title_approval(project_id, req, current_user)
