from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class TeamMemberResponse(BaseModel):
    id: UUID
    name: str
    roll_no: str = Field(..., serialization_alias="rollNo")
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class TeamResponse(BaseModel):
    id: UUID
    team_no: str = Field(..., serialization_alias="teamNo")
    project_title: Optional[str] = Field(None, serialization_alias="projectTitle")
    submitted_title: Optional[str] = Field(None, serialization_alias="submittedTitle")
    is_title_approved: bool = Field(False, serialization_alias="isTitleApproved")
    guide_approval_status: str = Field("Pending Review", serialization_alias="guideApprovalStatus")
    guide_name: Optional[str] = Field(None, serialization_alias="guideName")
    advisor_name: Optional[str] = Field(None, serialization_alias="advisorName")
    batch: str
    section: str
    members: List[TeamMemberResponse] = Field(default_factory=list)
    status: str
    progress: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class TeamCreate(BaseModel):
    team_no: str = Field(..., alias="teamNo")
    batch_id: UUID = Field(..., alias="batchId")
    section_id: UUID = Field(..., alias="sectionId")
    student_rolls: List[str] = Field(..., alias="studentRolls")

class AddMemberRequest(BaseModel):
    student_roll: str = Field(..., alias="studentRoll")

class AllocateGuideRequest(BaseModel):
    guide_id: UUID = Field(..., alias="guideId")
