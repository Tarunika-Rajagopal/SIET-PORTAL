from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import get_current_user, require_role
from app.services.submission_service import SubmissionService
from app.schemas.submissions import SubmissionCreateUpdate, SubmissionResponse, SubmissionFileResponse
from app.models.users import User

router = APIRouter(tags=["Submissions & Files"])

@router.get("/api/v1/student/submissions", response_model=List[SubmissionResponse])
async def get_student_submissions(
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = SubmissionService(db)
    return await service.get_student_submissions(student_user)

@router.get("/api/v1/student/submissions/{week_number}", response_model=SubmissionResponse)
async def get_student_submission_by_week(
    week_number: int,
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = SubmissionService(db)
    return await service.get_submission_by_week(week_number, student_user)

@router.post("/api/v1/student/submissions/{week_number}", response_model=SubmissionResponse)
async def create_or_update_student_submission(
    week_number: int,
    data: SubmissionCreateUpdate,
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = SubmissionService(db)
    return await service.create_or_update_submission(week_number, data, student_user)

@router.post("/api/v1/submissions/{submission_id}/files", response_model=SubmissionFileResponse, status_code=201)
async def upload_submission_file(
    submission_id: UUID,
    file: UploadFile = File(...),
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = SubmissionService(db)
    return await service.upload_file(submission_id, file, student_user)

@router.delete("/api/v1/submissions/{submission_id}/files/{file_id}")
async def delete_submission_file(
    submission_id: UUID,
    file_id: UUID,
    student_user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db_session)
):
    service = SubmissionService(db)
    await service.delete_file(submission_id, file_id, student_user)
    return {"success": True, "message": "File deleted successfully"}

@router.get("/api/v1/files/download/{file_id}")
async def download_file(
    file_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    service = SubmissionService(db)
    path, filename, content_type = await service.get_file_for_download(file_id, user)
    return FileResponse(
        path=path,
        filename=filename,
        media_type=content_type
    )
