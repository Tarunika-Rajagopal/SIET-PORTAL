from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.teams import TeamResponse
from app.schemas.projects import ProjectResponse
from app.schemas.academic import AcademicWeekResponse

class StudentDashboardResponse(BaseModel):
    team: Optional[TeamResponse] = None
    project: Optional[ProjectResponse] = None
    current_week: Optional[AcademicWeekResponse] = Field(None, serialization_alias="currentWeek")
    overall_progress: int = Field(0, serialization_alias="overallProgress")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
