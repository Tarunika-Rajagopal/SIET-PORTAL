from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class SubmissionFileResponse(BaseModel):
    id: UUID
    original_filename: str = Field(..., serialization_alias="originalFilename")
    file_category: str = Field(..., serialization_alias="fileCategory")
    content_type: str = Field(..., serialization_alias="contentType")
    file_size: int = Field(..., serialization_alias="fileSize")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class SubmissionCreateUpdate(BaseModel):
    problem_statement: Optional[str] = Field(None, alias="problemStatement")
    solution: Optional[str] = None
    technology_used: Optional[str] = Field(None, alias="technologyUsed")
    obstacles_faced: Optional[str] = Field(None, alias="obstaclesFaced")
    abstract: Optional[str] = None
    repo_url: Optional[str] = Field(None, alias="repoUrl")
    demo_url: Optional[str] = Field(None, alias="demoUrl")
    is_submit: bool = Field(False, alias="isSubmit")

class SubmissionResponse(BaseModel):
    id: UUID
    week_number: int = Field(..., serialization_alias="weekNumber")
    title: str
    due_date: Optional[str] = Field(None, serialization_alias="dueDate")
    status: str
    submission_date: Optional[datetime] = Field(None, serialization_alias="submissionDate")
    problem_statement: Optional[str] = Field(None, serialization_alias="problemStatement")
    solution: Optional[str] = None
    technology_used: Optional[str] = Field(None, serialization_alias="technologyUsed")
    obstacles_faced: Optional[str] = Field(None, serialization_alias="obstaclesFaced")
    abstract: Optional[str] = None
    repo_url: Optional[str] = Field(None, serialization_alias="repoUrl")
    demo_url: Optional[str] = Field(None, serialization_alias="demoUrl")
    comments: Optional[str] = None
    score: int = 0
    max_score: int = Field(100, serialization_alias="maxScore")
    guide_review_date: Optional[datetime] = Field(None, serialization_alias="guideReviewDate")
    files: List[SubmissionFileResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
