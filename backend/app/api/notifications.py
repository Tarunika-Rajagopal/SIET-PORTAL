from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import get_current_user
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.audit_notifications import NotificationResponse, MarkReadRequest
from app.models.users import User

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
async def get_user_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    notif_repo = AuditNotificationRepository(db)
    team_repo = TeamRepository(db)

    st_team = await team_repo.get_team_by_student_user_id(user.id)
    team_id = st_team.id if st_team else None

    notifs = await notif_repo.get_user_notifications(user.id, team_id=team_id)
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type,
            is_read=n.is_read,
            created_at=n.created_at
        )
        for n in notifs
    ]

@router.post("/mark-read")
async def mark_notifications_read(
    req: MarkReadRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    notif_repo = AuditNotificationRepository(db)
    await notif_repo.mark_notifications_read(user.id, req.notification_ids)
    await db.commit()
    return {"success": True, "message": "Notifications marked as read."}
