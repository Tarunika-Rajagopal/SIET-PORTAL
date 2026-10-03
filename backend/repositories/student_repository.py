"""Student repository for database access on Student entity."""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Student


class StudentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, student_id: uuid.UUID) -> Optional[Student]:
        res = await self.session.execute(select(Student).where(Student.id == student_id))
        return res.scalar_one_or_none()

    async def get_by_roll_no(self, roll_no: str) -> Optional[Student]:
        res = await self.session.execute(select(Student).where(Student.roll_no.ilike(roll_no.strip())))
        return res.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Student]:
        res = await self.session.execute(select(Student).where(Student.email.ilike(email.strip())))
        return res.scalar_one_or_none()

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Student]:
        res = await self.session.execute(select(Student).where(Student.user_id == user_id))
        return res.scalar_one_or_none()

    async def list_all(self) -> List[Student]:
        res = await self.session.execute(select(Student).order_by(Student.roll_no))
        return list(res.scalars().all())

    @staticmethod
    def _class_variants(raw: str) -> List[str]:
        raw = (raw or "").strip()
        if not raw:
            return []
        v = {raw, raw.upper()}
        clean = raw.replace(" ", "").replace("-", "").upper()
        v.add(clean)
        if clean.startswith("IV"):
            clean = clean[2:]
            v.add(clean)
        if clean and clean[-1].isalpha():
            sec = clean[-1]
            v.update([f"CSE-{sec}", f"CSE {sec}", f"IV CSE-{sec}", f"IV CSE {sec}", sec])
        return list(v)

    async def list_by_class_section(self, class_section: str) -> List[Student]:
        variants = self._class_variants(class_section)
        res = await self.session.execute(
            select(Student).where(Student.class_section.in_(variants)).order_by(Student.roll_no)
        )
        return list(res.scalars().all())

    async def list_by_class_and_batch(self, class_section: str, batch: str) -> List[Student]:
        variants = self._class_variants(class_section)
        q = select(Student).where(Student.class_section.in_(variants))
        if batch and batch.upper() != "ALL":
            q = q.where(Student.batch == batch)
        res = await self.session.execute(q.order_by(Student.roll_no))
        return list(res.scalars().all())

    async def create(self, student: Student) -> Student:
        self.session.add(student)
        return student

    async def delete(self, student: Student) -> None:
        await self.session.delete(student)
