from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import require_role
from app.services.faculty_student_service import FacultyStudentService
from app.schemas.faculty_student import FacultyCreate, FacultyResponse
from app.models.users import User

router = APIRouter(prefix="/api/v1/faculty", tags=["Faculty"])

@router.post("", response_model=FacultyResponse, status_code=201)
async def create_faculty(
    data: FacultyCreate,
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db_session)
):
    service = FacultyStudentService(db)
    return await service.create_faculty(data)
