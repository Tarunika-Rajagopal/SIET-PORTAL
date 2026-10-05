from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from auth import require_roles
from schemas import UpdateTitleRequest, TitleApprovalRequest
from services.project_service import ProjectService
from services.cache_service import cache_service

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
    res = await service.update_project_title(team_id, req, current_user)
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:advisor:")
    await cache_service.delete_prefix("cache:hod:")
    return res


@router.post("/{project_id}/title-approval")
async def review_title_approval(
    project_id: str,
    req: TitleApprovalRequest,
    current_user: User = Depends(require_roles("guide", "advisor & guide", "admin")),
    service: ProjectService = Depends(get_project_service),
):
    res = await service.review_title_approval(project_id, req, current_user)
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:advisor:")
    await cache_service.delete_prefix("cache:hod:")
    return res
