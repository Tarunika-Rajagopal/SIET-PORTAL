"""Marks repository for database access on WeeklyMark and WeeklyMemberMark entities."""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import WeeklyMark, WeeklyMemberMark


class MarksRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_weekly_mark(self, team_id: uuid.UUID, week_number: int) -> Optional[WeeklyMark]:
        res = await self.session.execute(
            select(WeeklyMark)
            .options(selectinload(WeeklyMark.member_marks))
            .where(
                WeeklyMark.team_id == team_id,
                WeeklyMark.week_number == week_number,
            )
        )
        return res.scalar_one_or_none()

    async def list_by_team(self, team_id: uuid.UUID) -> List[WeeklyMark]:
        res = await self.session.execute(
            select(WeeklyMark)
            .options(selectinload(WeeklyMark.member_marks))
            .where(WeeklyMark.team_id == team_id)
            .order_by(WeeklyMark.week_number)
        )
        return list(res.scalars().all())

    async def create_weekly_mark(self, mark: WeeklyMark) -> WeeklyMark:
        self.session.add(mark)
        return mark

    async def delete_weekly_mark(self, mark: WeeklyMark) -> None:
        await self.session.delete(mark)

    async def add_member_mark(self, member_mark: WeeklyMemberMark) -> WeeklyMemberMark:
        self.session.add(member_mark)
        return member_mark

    async def delete_member_marks(self, member_marks: List[WeeklyMemberMark]) -> None:
        for mm in member_marks:
            await self.session.delete(mm)
