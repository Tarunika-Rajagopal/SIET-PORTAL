from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.audit_notifications import AuditLog, Notification
from app.models.users import User

class AuditNotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- AUDIT LOGS ---
    async def create_audit_log(
        self,
        action_type: str,
        target: str,
        user_id: Optional[UUID] = None,
        details: Optional[str] = None,
        reason: Optional[str] = None
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            target=target,
            details=details,
            reason=reason
        )
        self.db.add(log)
        await self.db.flush()
        return log

    async def get_audit_logs(
        self,
        action_type: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[AuditLog], int]:
        stmt = select(AuditLog).options(joinedload(AuditLog.user)).order_by(AuditLog.created_at.desc())

        if action_type:
            stmt = stmt.where(AuditLog.action_type == action_type)
        if search_query:
            q = f"%{search_query.strip()}%"
            stmt = stmt.where(AuditLog.target.ilike(q) | AuditLog.details.ilike(q))

        res = await self.db.execute(stmt)
        all_logs = list(res.unique().scalars().all())

        total = len(all_logs)
        start = (page - 1) * page_size
        end = start + page_size
        return all_logs[start:end], total

    # --- NOTIFICATIONS ---
    async def create_notification(
        self,
        title: str,
        message: str,
        user_id: Optional[UUID] = None,
        team_id: Optional[UUID] = None,
        notification_type: str = "INFO"
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            team_id=team_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False
        )
        self.db.add(notif)
        await self.db.flush()
        return notif

    async def get_user_notifications(self, user_id: UUID, team_id: Optional[UUID] = None) -> List[Notification]:
        stmt = select(Notification).where(
            (Notification.user_id == user_id) | (Notification.team_id == team_id) if team_id else (Notification.user_id == user_id)
        ).order_by(Notification.created_at.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def mark_notifications_read(self, user_id: UUID, notification_ids: Optional[List[UUID]] = None) -> bool:
        stmt = select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
        if notification_ids:
            stmt = stmt.where(Notification.id.in_(notification_ids))

        res = await self.db.execute(stmt)
        notifs = res.scalars().all()
        for n in notifs:
            n.is_read = True
        await self.db.flush()
        return True
