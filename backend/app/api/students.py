from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_any_role
from app.services.faculty_student_service import FacultyStudentService
from app.schemas.faculty_student import StudentCreate, StudentResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/students", tags=["Students"])

@router.post("", response_model=StudentResponse, status_code=201)
async def create_student(
    data: StudentCreate,
    authorized_user: User = Depends(require_any_role(["admin", "advisor"])),
    db: AsyncSession = Depends(get_db_session)
):
    service = FacultyStudentService(db)
    return await service.create_student(data)
