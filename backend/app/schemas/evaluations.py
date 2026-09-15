from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, AliasGenerator
from pydantic.alias_generators import to_camel

class CriteriaScoreCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    criteria_title: str = Field(..., alias="title")
    description: Optional[str] = None
    max_marks: int = Field(..., alias="maxMarks")
    awarded_marks: int = Field(..., alias="awardedMarks")
    feedback: Optional[str] = None

class CriteriaScoreResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    criteria_title: str = Field(..., alias="title")
    description: Optional[str] = None
    max_marks: int = Field(..., alias="maxMarks")
    awarded_marks: int = Field(..., alias="awardedMarks")
    feedback: Optional[str] = None

class EvaluationCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    review_number: str = Field(..., alias="reviewNumber") # e.g. "Review 1"
    review_title: Optional[str] = Field("Project Review Evaluation", alias="reviewTitle")
    criteria: List[CriteriaScoreCreate]
    guide_feedback: Optional[str] = Field(None, alias="guideFeedback")
    status: Optional[str] = Field("APPROVED", alias="status")

class EvaluationResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    team_id: UUID = Field(..., alias="teamId")
    review_number: str = Field(..., alias="reviewNumber")
    review_title: str = Field(..., alias="reviewTitle")
    evaluator_name: str = Field(..., alias="evaluatorName")
    status: str
    total_score: int = Field(..., alias="totalScore")
    max_total: int = Field(..., alias="maxTotal")
    guide_feedback: Optional[str] = Field(None, alias="guideFeedback")
    created_at: datetime = Field(..., alias="createdAt")
    criteria: List[CriteriaScoreResponse] = Field(default_factory=list)

class RevisionRequestCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    submission_id: Optional[UUID] = Field(None, alias="submissionId")
    reason: str

class RevisionRequestResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: UUID
    team_id: UUID = Field(..., alias="teamId")
    submission_id: Optional[UUID] = Field(None, alias="submissionId")
    requested_by_name: str = Field(..., alias="requestedByName")
    reason: str
    status: str
    created_at: datetime = Field(..., alias="createdAt")
