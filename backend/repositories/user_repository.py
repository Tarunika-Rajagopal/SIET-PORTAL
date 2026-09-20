"""User repository for database access on User entity."""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from models import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID | str) -> Optional[User]:
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                return None
        res = await self.session.execute(select(User).where(User.id == user_id))
        return res.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        res = await self.session.execute(select(User).where(User.email.ilike(email.strip())))
        return res.scalar_one_or_none()

    async def get_by_roll_no(self, roll_no: str) -> Optional[User]:
        res = await self.session.execute(select(User).where(User.roll_no.ilike(roll_no.strip())))
        return res.scalar_one_or_none()

    async def get_by_email_or_roll(self, term: str) -> Optional[User]:
        cleaned = term.strip()
        res = await self.session.execute(
            select(User).where(
                or_(
                    User.email.ilike(cleaned),
                    User.roll_no.ilike(cleaned),
                )
            )
        )
        return res.scalar_one_or_none()

    async def get_by_login(self, term: str) -> Optional[User]:
        return await self.get_by_email_or_roll(term)

    async def list_by_role(self, role: str) -> List[User]:
        res = await self.session.execute(select(User).where(User.role == role))
        return list(res.scalars().all())

    async def list_by_roles(self, roles: List[str]) -> List[User]:
        res = await self.session.execute(select(User).where(User.role.in_(roles)))
        return list(res.scalars().all())

    async def create(self, user: User) -> User:
        self.session.add(user)
        return user

    async def delete(self, user: User) -> None:
        await self.session.delete(user)
