from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from app.schemas.teams import TeamResponse
from app.schemas.projects import ProjectResponse

# --- GUIDE PORTAL ---
class GuideDashboardResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    assigned_teams_count: int = Field(..., alias="assignedTeamsCount")
    pending_reviews_count: int = Field(..., alias="pendingReviewsCount")
    pending_approvals_count: int = Field(..., alias="pendingApprovalsCount")
    overall_progress: int = Field(..., alias="overallProgress")
    teams: List[TeamResponse] = Field(default_factory=list)

# --- ADVISOR PORTAL ---
class AdvisorDashboardResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    total_students: int = Field(..., alias="totalStudents")
    total_teams: int = Field(..., alias="totalTeams")
    unassigned_students_count: int = Field(..., alias="unassignedStudentsCount")
    active_projects_count: int = Field(..., alias="activeProjectsCount")
    section_name: str = Field(..., alias="sectionName")
    batch_name: str = Field(..., alias="batchName")
    teams: List[TeamResponse] = Field(default_factory=list)

class StudentInspectionResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    roll_no: str = Field(..., alias="rollNo")
    email: str
    batch: str
    section: str
    team_no: Optional[str] = Field(None, alias="teamNo")
    project_title: Optional[str] = Field(None, alias="projectTitle")
    submitted_weeks_count: int = Field(0, alias="submittedWeeksCount")
    status: str = Field("Active", alias="status")

class AutoGenerateTeamsRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    team_size: int = Field(4, alias="teamSize")
    section_id: UUID = Field(..., alias="sectionId")
    batch_id: UUID = Field(..., alias="batchId")

# --- HOD PORTAL ---
class HodAnalyticsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    department_name: str = Field(..., alias="departmentName")
    total_students: int = Field(..., alias="totalStudents")
    total_teams: int = Field(..., alias="totalTeams")
    total_faculty: int = Field(..., alias="totalFaculty")
    average_progress: int = Field(..., alias="averageProgress")

class FacultyWorkloadResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    email: str
    designation: str
    assigned_teams_count: int = Field(..., alias="assignedTeamsCount")
    guide_quota: int = Field(..., alias="guideQuota")
    roles: List[str]

class AssignAdvisorRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    faculty_id: UUID = Field(..., alias="facultyId")
    batch_id: UUID = Field(..., alias="batchId")
    section_id: UUID = Field(..., alias="sectionId")

# --- ADMIN PORTAL ---
class AdminUserResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    email: str
    roll_no: Optional[str] = Field(None, alias="rollNo")
    department: str
    roles: List[str]
    designation: Optional[str] = None
    guide_quota: Optional[int] = Field(None, alias="guideQuota")
    created_at: datetime = Field(..., alias="createdAt")

class UpdateFacultyRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    designation: Optional[str] = None
    guide_quota: Optional[int] = Field(None, alias="guideQuota")
    roles: Optional[List[str]] = None

class CsvImportResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    total_processed: int = Field(..., alias="totalProcessed")
    created_students: int = Field(..., alias="createdStudents")
    created_teams: int = Field(..., alias="createdTeams")
    errors: List[str] = Field(default_factory=list)
