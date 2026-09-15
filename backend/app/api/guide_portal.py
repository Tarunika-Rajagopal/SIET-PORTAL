from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_role, require_any_role
from app.services.guide_portal_service import GuidePortalService
from app.schemas.portals import GuideDashboardResponse
from app.schemas.teams import TeamResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/guide", tags=["Guide Portal"])

@router.get("/dashboard", response_model=GuideDashboardResponse)
async def get_guide_dashboard(
    guide_user: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = GuidePortalService(db)
    return await service.get_dashboard(guide_user)

@router.get("/teams", response_model=List[TeamResponse])
async def get_guide_teams(
    guide_user: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = GuidePortalService(db)
    return await service.get_assigned_teams(guide_user)

@router.get("/submissions/weekly")
async def get_pending_weekly_submissions(
    guide_user: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = GuidePortalService(db)
    return await service.get_pending_weekly_submissions(guide_user)

@router.post("/submissions/{submission_id}/review")
async def review_submission(
    submission_id: UUID,
    status: str = Body(..., embed=True),
    comments: Optional[str] = Body(None, embed=True),
    score: Optional[int] = Body(None, embed=True),
    guide_user: User = Depends(require_any_role(["guide", "advisor", "hod", "admin"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = GuidePortalService(db)
    return await service.review_submission(submission_id, status, comments, score, guide_user)
