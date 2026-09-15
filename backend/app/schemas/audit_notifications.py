from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    user_name: Optional[str] = Field("System", alias="userName")
    action_type: str = Field(..., alias="actionType")
    target: str
    details: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime = Field(..., alias="createdAt")

class NotificationResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    title: str
    message: str
    type: str
    is_read: bool = Field(..., alias="isRead")
    created_at: datetime = Field(..., alias="createdAt")

class MarkReadRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    notification_ids: Optional[list[UUID]] = Field(None, alias="notificationIds")
