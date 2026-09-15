from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.academic import Department, Batch, Section, AcademicWeek

class AcademicRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_department_by_code(self, code: str) -> Optional[Department]:
        stmt = select(Department).where(Department.code == code)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_department_by_id(self, dept_id: UUID) -> Optional[Department]:
        stmt = select(Department).where(Department.id == dept_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_department(self, name: str, code: str) -> Department:
        dept = Department(name=name, code=code)
        self.db.add(dept)
        await self.db.flush()
        return dept

    async def get_batch_by_id(self, batch_id: UUID) -> Optional[Batch]:
        stmt = select(Batch).where(Batch.id == batch_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_batch(self, department_id: UUID, name: str, start_year: Optional[int] = None, end_year: Optional[int] = None) -> Batch:
        batch = Batch(department_id=department_id, name=name, start_year=start_year, end_year=end_year)
        self.db.add(batch)
        await self.db.flush()
        return batch

    async def get_section_by_id(self, section_id: UUID) -> Optional[Section]:
        stmt = select(Section).where(Section.id == section_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_section(self, batch_id: UUID, name: str) -> Section:
        section = Section(batch_id=batch_id, name=name)
        self.db.add(section)
        await self.db.flush()
        return section

    async def get_current_academic_week(self) -> Optional[AcademicWeek]:
        stmt = select(AcademicWeek).where(AcademicWeek.is_current == True)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_academic_week(self, week_number: int, is_current: bool = False, batch_id: Optional[UUID] = None, start_date=None, end_date=None) -> AcademicWeek:
        if is_current:
            # Unset existing current weeks
            existing = await self.db.execute(select(AcademicWeek).where(AcademicWeek.is_current == True))
            for w in existing.scalars().all():
                w.is_current = False

        week = AcademicWeek(
            week_number=week_number,
            is_current=is_current,
            batch_id=batch_id,
            start_date=start_date,
            end_date=end_date
        )
        self.db.add(week)
        await self.db.flush()
        return week
