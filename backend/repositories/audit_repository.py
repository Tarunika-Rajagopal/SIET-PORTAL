"""Audit repository for database access on AuditLog, AdvisorHistory, and HodHistory entities."""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import AuditLog, AdvisorHistory, HodHistory


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_audit_logs(self, limit: Optional[int] = None) -> List[AuditLog]:
        q = select(AuditLog).order_by(AuditLog.timestamp.desc())
        if limit is not None:
            q = q.limit(limit)
        res = await self.session.execute(q)
        return list(res.scalars().all())

    async def create_audit_log(self, log: AuditLog) -> AuditLog:
        self.session.add(log)
        return log

    async def list_advisor_history(self, class_section: Optional[str] = None, limit: int = 100) -> List[AdvisorHistory]:
        q = select(AdvisorHistory)
        if class_section and class_section != "ALL":
            q = q.where(AdvisorHistory.class_section == class_section)
        res = await self.session.execute(q.order_by(AdvisorHistory.timestamp.desc()).limit(limit))
        return list(res.scalars().all())

    async def create_advisor_history(self, entry: AdvisorHistory) -> AdvisorHistory:
        self.session.add(entry)
        return entry

    async def list_hod_history(self, limit: Optional[int] = None) -> List[HodHistory]:
        q = select(HodHistory).order_by(HodHistory.created_at.desc())
        if limit is not None:
            q = q.limit(limit)
        res = await self.session.execute(q)
        return list(res.scalars().all())

    async def create_hod_history(self, entry: HodHistory) -> HodHistory:
        self.session.add(entry)
        return entry
