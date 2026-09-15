from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.faculty_student import Faculty, Student
from app.models.users import User

class FacultyStudentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_student_by_roll_no(self, roll_no: str) -> Optional[Student]:
        stmt = (
            select(Student)
            .where(Student.roll_no == roll_no)
            .options(
                joinedload(Student.user).joinedload(User.roles),
                joinedload(Student.batch),
                joinedload(Student.section)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_student_by_user_id(self, user_id: UUID) -> Optional[Student]:
        stmt = (
            select(Student)
            .where(Student.user_id == user_id)
            .options(
                joinedload(Student.user).joinedload(User.roles),
                joinedload(Student.batch),
                joinedload(Student.section)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def create_student(
        self,
        user_id: UUID,
        roll_no: str,
        batch_id: UUID,
        section_id: UUID
    ) -> Student:
        student = Student(
            user_id=user_id,
            roll_no=roll_no,
            batch_id=batch_id,
            section_id=section_id
        )
        self.db.add(student)
        await self.db.flush()
        return student

    async def get_faculty_by_user_id(self, user_id: UUID) -> Optional[Faculty]:
        stmt = (
            select(Faculty)
            .where(Faculty.user_id == user_id)
            .options(joinedload(Faculty.user).joinedload(User.roles))
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_faculty_by_employee_id(self, employee_id: str) -> Optional[Faculty]:
        stmt = (
            select(Faculty)
            .where(Faculty.employee_id == employee_id)
            .options(joinedload(Faculty.user).joinedload(User.roles))
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def create_faculty(
        self,
        user_id: UUID,
        employee_id: Optional[str] = None,
        designation: Optional[str] = None,
        specialization: Optional[str] = None,
        guide_quota: int = 5
    ) -> Faculty:
        faculty = Faculty(
            user_id=user_id,
            employee_id=employee_id,
            designation=designation,
            specialization=specialization,
            guide_quota=guide_quota
        )
        self.db.add(faculty)
        await self.db.flush()
        return faculty
