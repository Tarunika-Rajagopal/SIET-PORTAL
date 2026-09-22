"""Project repository for database access on TitleApproval entity."""
import uuid
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models import TitleApproval


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_title_approval_by_id(self, approval_id: uuid.UUID) -> Optional[TitleApproval]:
        res = await self.session.execute(
            select(TitleApproval).where(TitleApproval.id == approval_id)
        )
        return res.scalar_one_or_none()

    async def get_title_approval_by_team_id(self, team_id: uuid.UUID) -> Optional[TitleApproval]:
        res = await self.session.execute(
            select(TitleApproval).where(TitleApproval.team_id == team_id)
        )
        return res.scalar_one_or_none()

    async def count_title_approvals_by_teams(self, team_ids: List[uuid.UUID], status: Optional[str] = None) -> int:
        if not team_ids:
            return 0
        q = select(func.count()).where(TitleApproval.team_id.in_(team_ids))
        if status:
            q = q.where(TitleApproval.status == status)
        res = await self.session.execute(q)
        return res.scalar() or 0

    async def get_title_counts(self, team_ids: List[uuid.UUID]) -> Dict[str, int]:
        if not team_ids:
            return {"approved": 0, "pending": 0}
        q = select(
            func.count().filter(TitleApproval.status == "Approved").label("approved"),
            func.count().filter(TitleApproval.status == "Pending").label("pending")
        ).where(TitleApproval.team_id.in_(team_ids))
        res = await self.session.execute(q)
        row = res.one_or_none()
        if row:
            return {"approved": row[0] or 0, "pending": row[1] or 0}
        return {"approved": 0, "pending": 0}

    async def create_title_approval(self, approval: TitleApproval) -> TitleApproval:
        self.session.add(approval)
        return approval

    async def delete_title_approval(self, approval: TitleApproval) -> None:
        await self.session.delete(approval)
