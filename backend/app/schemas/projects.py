from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ProjectCreate(BaseModel):
    team_id: UUID = Field(..., alias="teamId")
    title: Optional[str] = None
    abstract: Optional[str] = None

class UpdateTitleRequest(BaseModel):
    title: str
    abstract: Optional[str] = None

class TitleApprovalRequest(BaseModel):
    status: str = Field(..., description="'Approved' or 'Revision Required'")
    feedback: Optional[str] = None

class ProjectTitleHistoryResponse(BaseModel):
    id: UUID
    previous_title: Optional[str] = Field(None, serialization_alias="previousTitle")
    new_title: str = Field(..., serialization_alias="newTitle")
    changed_by: str = Field(..., serialization_alias="changedBy")
    comments: Optional[str] = None
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ProjectResponse(BaseModel):
    id: UUID
    team_id: UUID = Field(..., serialization_alias="teamId")
    title: Optional[str] = None
    submitted_title: Optional[str] = Field(None, serialization_alias="submittedTitle")
    abstract: Optional[str] = None
    status: str
    guide_approval_status: str = Field(..., serialization_alias="guideApprovalStatus")
    is_locked: bool = Field(..., serialization_alias="isLocked")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
