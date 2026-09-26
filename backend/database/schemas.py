"""Pydantic request/response schemas — mirrors frontend apiClient.ts payloads."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


# ── Auth ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    emailOrRoll: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: str
    user: Dict[str, Any]


# ── Student / Submissions ─────────────────────────────────────
class SubmitDeliverablesRequest(BaseModel):
    problemStatement: Optional[str] = ""
    solution: Optional[str] = ""
    technologyUsed: Optional[str] = ""
    obstaclesFaced: Optional[str] = ""
    abstract: Optional[str] = ""
    repoUrl: Optional[str] = ""
    demoUrl: Optional[str] = ""
    isSubmit: bool = True


# ── Projects / Titles ─────────────────────────────────────────
class UpdateTitleRequest(BaseModel):
    title: str

class TitleApprovalRequest(BaseModel):
    decision: str          # APPROVED | REJECTED
    remarks: Optional[str] = ""


# ── Guide review ──────────────────────────────────────────────
class ReviewSubmissionRequest(BaseModel):
    status: str            # APPROVED | REVISION_REQUESTED | REJECTED
    comments: Optional[str] = ""
    score: Optional[float] = None
    memberMarks: Optional[Dict[str, float]] = None
    gradedBy: Optional[str] = None


# ── Admin ─────────────────────────────────────────────────────
class AddFacultyRequest(BaseModel):
    name: str
    email: str
    designation: str
    role: str              # Advisor | Guide | Advisor & Guide | None
    specialization: Optional[str] = ""
    advisorBatch: Optional[str] = None
    advisorClass: Optional[str] = None

class UpdateFacultyRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    specialization: Optional[str] = None
    advisorBatch: Optional[str] = None
    advisorClass: Optional[str] = None
    teamsCount: Optional[int] = None
    maxQuota: Optional[int] = None
    status: Optional[str] = None

class AddStudentRequest(BaseModel):
    name: str
    rollNo: str
    email: str
    password: Optional[str] = "student@123"
    batch: Optional[str] = "2023-2027 (III Year)"
    classSection: Optional[str] = "CSE-B"
    guide: Optional[str] = "Unassigned"
class ImportStudentItem(BaseModel):
    name: str
    rollNo: str
    email: str
    password: Optional[str] = "student@123"
    batch: Optional[str] = "2023-2027 (III Year)"
    classSection: Optional[str] = "CSE-B"

class ImportStudentsRequest(BaseModel):
    students: List[ImportStudentItem]

class AuditLogRequest(BaseModel):
    actionType: str
    target: str
    details: str
    reason: Optional[str] = ""
    admin: Optional[str] = "admin@siet.ac.in"

class ReassignRequest(BaseModel):
    email_one: str
# ── Advisor ───────────────────────────────────────────────────
class CreateTeamRequest(BaseModel):
    className: str = "CSE-B"
    batch: str = "2023-2027 (III Year)"
    capacity: int = 4
    teamNo: str
    title: Optional[str] = ""
    guide: str
    guideEmail: Optional[str] = ""
    leadRollNo: str
    memberRollNos: List[str]

class MoveStudentRequest(BaseModel):
    className: str = "CSE-B"
    studentRollNo: str
    targetTeamId: str

class ReassignGuideRequest(BaseModel):
    className: str = "CSE-B"
    teamId: str
    guideName: str
    guideEmail: Optional[str] = ""

class UpdateTeamRequest(BaseModel):
    className: str = "CSE-B"
    batch: str = "2023-2027 (III Year)"
    teamNo: Optional[str] = None
    guide: Optional[str] = None
    guideEmail: Optional[str] = None
    leadRollNo: Optional[str] = None
    memberRollNos: Optional[List[str]] = None
    title: Optional[str] = None


# ── HOD ───────────────────────────────────────────────────────
class HodHistoryRequest(BaseModel):
    actionType: str
    target: str
    details: str
    classSection: str
    batch: str
    performedBy: str


# ── Marks ─────────────────────────────────────────────────────
class SaveWeeklyMarksRequest(BaseModel):
    memberMarks: Dict[str, float]  # rollNo -> mark
    remarks: Optional[str] = ""
    gradedBy: Optional[str] = "Class Advisor"


class AssignAdvisorModel(BaseModel):
    faculty_id: str
    batch: str 
    className: str

class deleteFaculty(BaseModel):
    faculty_email: str