"""Faculty repository for database access on Faculty entity."""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Faculty


class FacultyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, faculty_id: uuid.UUID | str) -> Optional[Faculty]:
        if isinstance(faculty_id, str):
            try:
                faculty_id = uuid.UUID(faculty_id)
            except ValueError:
                return None
        res = await self.session.execute(select(Faculty).where(Faculty.id == faculty_id))
        return res.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Faculty]:
        res = await self.session.execute(select(Faculty).where(Faculty.email.ilike(email.strip())))
        return res.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Faculty]:
        res = await self.session.execute(select(Faculty).where(Faculty.name.ilike(f"%{name.strip()}%")))
        return res.scalar_one_or_none()

    async def list_all(self) -> List[Faculty]:
        res = await self.session.execute(select(Faculty).order_by(Faculty.name))
        return list(res.scalars().all())

    async def list_advisors(self, batch: Optional[str] = None, class_name: Optional[str] = None) -> List[Faculty]:
        q = select(Faculty).where(Faculty.role.in_(["Advisor", "Advisor & Guide"]))
        if batch and batch != "ALL":
            q = q.where(Faculty.advisor_batch == batch)
        if class_name and class_name != "ALL":
            q = q.where(Faculty.advisor_class == class_name)
        res = await self.session.execute(q)
        return list(res.scalars().all())

    async def get_advisor_for_class(
        self, batch: str, class_name: str, exclude_id: Optional[uuid.UUID] = None
    ) -> Optional[Faculty]:
        q = select(Faculty).where(Faculty.advisor_batch == batch, Faculty.advisor_class == class_name)
        if exclude_id:
            q = q.where(Faculty.id != exclude_id)
        res = await self.session.execute(q)
        return res.scalar_one_or_none()

    async def create(self, faculty: Faculty) -> Faculty:
        self.session.add(faculty)
        return faculty

    async def delete(self, faculty: Faculty) -> None:
        await self.session.delete(faculty)
