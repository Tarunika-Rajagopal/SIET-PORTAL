from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.services.academic_service import AcademicService
from app.schemas.academic import AcademicWeekResponse

router = APIRouter(prefix="/api/v1/academic", tags=["Academic"])

@router.get("/current-week", response_model=AcademicWeekResponse)
async def get_current_academic_week(db: AsyncSession = Depends(get_db_session)):
    service = AcademicService(db)
    return await service.get_current_week()
