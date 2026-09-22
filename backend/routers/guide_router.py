"""
Guide endpoints — matches frontend apiClient.ts:
  GET  /api/v1/guide/teams
  GET  /api/v1/guide/dashboard
  GET  /api/v1/guide/submissions/weekly
  POST /api/v1/guide/submissions/{submissionId}/review
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from auth import require_roles
from schemas import ReviewSubmissionRequest
from services.guide_service import GuideService

router = APIRouter(prefix="/api/v1/guide", tags=["Guide"])


def get_guide_service(db: AsyncSession = Depends(get_db)) -> GuideService:
    return GuideService(db)


@router.get("/teams")
async def get_guide_teams(
    user: User = Depends(require_roles("guide")),
    service: GuideService = Depends(get_guide_service),
):
    return await service.get_guide_teams(user)


@router.get("/dashboard")
async def get_guide_dashboard(
    user: User = Depends(require_roles("guide")),
    service: GuideService = Depends(get_guide_service),
):
    return await service.get_guide_dashboard(user)


@router.get("/submissions/weekly")
async def get_weekly_submissions(
    user: User = Depends(require_roles("guide")),
    service: GuideService = Depends(get_guide_service),
):
    return await service.get_weekly_submissions(user)


@router.post("/submissions/{submission_id}/review")
async def review_submission(
    submission_id: str,
    req: ReviewSubmissionRequest,
    user: User = Depends(require_roles("guide")),
    service: GuideService = Depends(get_guide_service),
):
    return await service.review_submission(submission_id, req, user)


@router.post("/teams/{team_id}/submissions/{week}/review")
async def review_team_submission(
    team_id: str,
    week: int,
    req: ReviewSubmissionRequest,
    user: User = Depends(require_roles("guide")),
    service: GuideService = Depends(get_guide_service),
):
    return await service.review_team_submission(team_id, week, req, user)
