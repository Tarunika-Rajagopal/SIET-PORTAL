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

router = APIRouter(prefix="/api/v1/student", tags=["Student"])


def get_student_service(db: AsyncSession = Depends(get_db)) -> StudentService:
    return StudentService(db)


@router.get("/team")
async def get_team(
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    return await service.get_team(user)




@router.get("/submissions")
async def get_submissions(
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    return await service.get_submissions(user)


@router.get("/submissions/{week}")
async def get_submission_by_week(
    week: int,
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    return await service.get_submission_by_week(user, week)


@router.post("/submissions/{week}")
async def submit_deliverables(
    week: int,
    req: SubmitDeliverablesRequest,
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    return await service.submit_deliverables(user, week, req)


@router.delete("/submissions/{week}")
async def delete_submission(
    week: int,
    user: User = Depends(require_roles("student")),
    service: StudentService = Depends(get_student_service),
):
    return await service.delete_submission(user, week)


@router.get("/week-releases")
async def get_student_week_releases(
    service: StudentService = Depends(get_student_service),
):
    releases = await service.get_week_releases()
    return {"releases": releases}

