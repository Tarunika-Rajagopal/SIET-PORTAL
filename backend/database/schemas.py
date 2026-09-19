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
    status: str            # APPROVED | REVISION_REQUESTED
    comments: Optional[str] = ""
    score: Optional[float] = None
