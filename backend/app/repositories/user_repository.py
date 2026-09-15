from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.users import User, Role, UserRole
from app.models.academic import Department
from app.models.faculty_student import Student

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        stmt = (
            select(User)
            .where(User.email == email)
            .options(
                joinedload(User.roles),
                joinedload(User.department),
                joinedload(User.faculty),
                joinedload(User.student).joinedload(Student.batch),
                joinedload(User.student).joinedload(Student.section)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                joinedload(User.roles),
                joinedload(User.department),
                joinedload(User.faculty),
                joinedload(User.student).joinedload(Student.batch),
                joinedload(User.student).joinedload(Student.section)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def create_user(
        self,
        email: str,
        password_hash: str,
        name: str,
        department_id: Optional[UUID] = None,
        designation: Optional[str] = None,
        phone: Optional[str] = None
    ) -> User:
        user = User(
            email=email,
            password_hash=password_hash,
            name=name,
            department_id=department_id,
            designation=designation,
            phone=phone
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def get_role_by_name(self, role_name: str) -> Optional[Role]:
        stmt = select(Role).where(Role.name == role_name)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_role(self, name: str, description: Optional[str] = None) -> Role:
        role = Role(name=name, description=description)
        self.db.add(role)
        await self.db.flush()
        return role

    async def assign_role_to_user(self, user_id: UUID, role_id: UUID) -> UserRole:
        user_role = UserRole(user_id=user_id, role_id=role_id)
        self.db.add(user_role)
        await self.db.flush()
        return user_role

    async def get_all_users(self, limit: int = 100, offset: int = 0) -> List[User]:
        stmt = (
            select(User)
            .options(
                joinedload(User.roles),
                joinedload(User.department),
                joinedload(User.faculty),
                joinedload(User.student).joinedload(Student.batch),
                joinedload(User.student).joinedload(Student.section)
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())
