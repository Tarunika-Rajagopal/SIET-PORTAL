"""
Student endpoints — matches frontend apiClient.ts:
  GET  /api/v1/student/team
  GET  /api/v1/student/submissions
  GET  /api/v1/student/submissions/{week}
  POST /api/v1/student/submissions/{week}
  DELETE /api/v1/student/submissions/{week}
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from auth import require_roles
from schemas import SubmitDeliverablesRequest
from services.student_service import StudentService
from services.cache_service import cache_service

router = APIRouter(prefix="/api/v1/student", tags=["Student"])


def get_student_service(db: AsyncSession = Depends(get_db)) -> StudentService:
    return StudentService(db)


@router.get("/team")
async def get_team(
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    cache_key = f"cache:student:team:{user.id}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached

    data = await service.get_team(user)
    await cache_service.set_json(cache_key, data, expire_seconds=45)
    return data


@router.get("/submissions")
async def get_submissions(
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    cache_key = f"cache:student:submissions:{user.id}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached

    data = await service.get_submissions(user)
    await cache_service.set_json(cache_key, data, expire_seconds=45)
    return data


@router.get("/submissions/{week}")
async def get_submission_by_week(
    week: int,
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    cache_key = f"cache:student:sub:{user.id}:{week}"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached

    data = await service.get_submission_by_week(user, week)
    await cache_service.set_json(cache_key, data, expire_seconds=45)
    return data


@router.post("/submissions/{week}")
async def submit_deliverables(
    week: int,
    req: SubmitDeliverablesRequest,
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    res = await service.submit_deliverables(user, week, req)
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:advisor:")
    await cache_service.delete_prefix("cache:hod:")
    await cache_service.delete_prefix("cache:admin:")
    await cache_service.delete_prefix("cache:teams")
    return res


@router.delete("/submissions/{week}")
async def delete_submission(
    week: int,
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    res = await service.delete_submission(user, week)
    await cache_service.delete_prefix("cache:student:")
    await cache_service.delete_prefix("cache:guide:")
    await cache_service.delete_prefix("cache:advisor:")
    await cache_service.delete_prefix("cache:hod:")
    await cache_service.delete_prefix("cache:admin:")
    await cache_service.delete_prefix("cache:teams")
    return res


@router.get("/week-releases")
async def get_student_week_releases(
    service: StudentService = Depends(get_student_service),
):
    cache_key = "cache:student:week_releases"
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        return cached

    releases = await service.get_week_releases()
    data = {"releases": releases}
    await cache_service.set_json(cache_key, data, expire_seconds=60)
    return data

