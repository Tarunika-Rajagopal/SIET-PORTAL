from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.academic_repository import AcademicRepository
from app.schemas.academic import AcademicWeekResponse
from app.exceptions.custom import NotFoundException

class AcademicService:
    def __init__(self, db: AsyncSession):
        self.repo = AcademicRepository(db)

    async def get_current_week(self) -> AcademicWeekResponse:
        week = await self.repo.get_current_academic_week()
        if not week:
            raise NotFoundException("No active current week configured")
        return AcademicWeekResponse.model_validate(week)
