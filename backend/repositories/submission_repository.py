"""Submission repository for database access on WeeklySubmission entity."""
import uuid
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models import WeeklySubmission


class SubmissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, submission_id: uuid.UUID) -> Optional[WeeklySubmission]:
        res = await self.session.execute(
            select(WeeklySubmission).where(WeeklySubmission.id == submission_id)
        )
        return res.scalar_one_or_none()

    async def get_by_team_and_week(self, team_id: uuid.UUID, week: int) -> Optional[WeeklySubmission]:
        res = await self.session.execute(
            select(WeeklySubmission).where(
                WeeklySubmission.team_id == team_id,
                WeeklySubmission.week == week,
            )
        )
        return res.scalar_one_or_none()

    async def list_by_team(self, team_id: uuid.UUID) -> List[WeeklySubmission]:
        res = await self.session.execute(
            select(WeeklySubmission)
            .where(WeeklySubmission.team_id == team_id)
            .order_by(WeeklySubmission.week)
        )
        return list(res.scalars().all())

    async def list_by_teams(self, team_ids: List[uuid.UUID]) -> List[WeeklySubmission]:
        if not team_ids:
            return []
        res = await self.session.execute(
            select(WeeklySubmission)
            .where(WeeklySubmission.team_id.in_(team_ids))
            .order_by(WeeklySubmission.week)
        )
        return list(res.scalars().all())

    async def count_by_teams(self, team_ids: List[uuid.UUID], status: Optional[str] = None) -> int:
        if not team_ids:
            return 0
        q = select(func.count()).where(WeeklySubmission.team_id.in_(team_ids))
        if status:
            q = q.where(WeeklySubmission.status == status)
        res = await self.session.execute(q)
        return res.scalar() or 0

    async def get_submission_counts(self, team_ids: List[uuid.UUID]) -> Dict[str, int]:
        if not team_ids:
            return {"total": 0, "pending": 0}
        q = select(
            func.count().label("total"),
            func.count().filter(WeeklySubmission.status == "Submitted").label("pending")
        ).where(WeeklySubmission.team_id.in_(team_ids))
        res = await self.session.execute(q)
        row = res.one_or_none()
        if row:
            return {"total": row[0] or 0, "pending": row[1] or 0}
        return {"total": 0, "pending": 0}

    async def create(self, submission: WeeklySubmission) -> WeeklySubmission:
        self.session.add(submission)
        return submission

    async def delete(self, submission: WeeklySubmission) -> None:
        await self.session.delete(submission)
