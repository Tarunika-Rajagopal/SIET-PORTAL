"""
Student endpoints — matches frontend apiClient.ts:
  GET  /api/v1/student/team
  GET  /api/v1/student/submissions
  GET  /api/v1/student/submissions/{week}
  POST /api/v1/student/submissions/{week}
  DELETE /api/v1/student/submissions/{week}
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Team, WeeklySubmission
from auth import get_current_user
from schemas import SubmitDeliverablesRequest

router = APIRouter(prefix="/api/v1/student", tags=["Student"])


# ── serializers ────────────────────────────────────────────────
def _team(t: Team) -> dict:
    members = []
    if t.members:
        for m in t.members:
            members.append({
                "name": m.name, "rollNo": m.roll_no, "email": m.email,
                "phone": m.phone or "", "isLead": m.is_lead,
                "role": m.member_role or ("Team Lead" if m.is_lead else "Team Member"),
            })
    return {
        "id": t.team_id or str(t.id),
        "teamId": t.team_id,
        "teamNo": t.team_no,
        "projectTitle": t.project_title or "",
        "submittedTitle": t.submitted_title or t.project_title or "",
        "isTitleApproved": bool(t.is_title_approved),
        "guideApprovalStatus": t.guide_approval_status or "Pending",
        "rejectionReason": t.rejection_reason or "",
        "guideName": t.guide_name or "",
        "advisorName": t.advisor_name or "",
        "batch": t.batch, "section": t.class_name,
        "status": t.status or "In Progress",
        "progress": t.progress or 0,
        "problemStatement": t.problem_statement or "",
        "proposedSolution": t.proposed_solution or "",
        "abstract": t.abstract or "",
        "repoUrl": t.repo_url or "",
        "demoUrl": t.demo_url or "",
        "members": members,
    }


def _sub(s: WeeklySubmission) -> dict:
    return {
        "id": str(s.id), "week": s.week,
        "title": s.title or f"Week {s.week} Deliverables",
        "dueDate": s.due_date or "", "status": s.status or "Pending",
        "submissionDate": s.submission_date or "",
        "fileName": s.file_name or "", "fileSize": s.file_size or "",
        "comments": s.comments or "",
        "score": float(s.score) if s.score is not None else None,
        "maxScore": float(s.max_score) if s.max_score is not None else 100.0,
        "projectTitle": s.project_title or "",
        "problemStatement": s.problem_statement or "",
        "solution": s.solution or "",
        "technologyUsed": s.technology_used or "",
        "obstaclesFaced": s.obstacles_faced or "",
        "abstract": s.abstract or "",
        "presentationFile": s.presentation_file or "",
        "pdfFile": s.pdf_file or "",
        "repoUrl": s.repo_url or "", "demoUrl": s.demo_url or "",
        "screenshotFile": s.screenshot_file or "",
        "guideName": s.guide_name or "",
        "guideReviewDate": s.guide_review_date or "",
    }


# ── helpers ────────────────────────────────────────────────────
async def _find_team(db: AsyncSession, user: User) -> Team:
    tid = user.team_id or "TEAM-CSE-Y3-B04"
    q = select(Team).options(selectinload(Team.members)).where(Team.team_id == tid)
    r = await db.execute(q)
    team = r.scalar_one_or_none()
    if not team:
        fb = await db.execute(select(Team).options(selectinload(Team.members)).limit(1))
        team = fb.scalar_one_or_none()
    if not team:
        raise HTTPException(404, "Student team not found")
    return team


# ── routes ─────────────────────────────────────────────────────
@router.get("/team")
async def get_team(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return _team(await _find_team(db, user))


@router.get("/submissions")
async def get_submissions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    team = await _find_team(db, user)
    rows = (await db.execute(
        select(WeeklySubmission).where(WeeklySubmission.team_id == team.id).order_by(WeeklySubmission.week)
    )).scalars().all()
    return [_sub(s) for s in rows]


@router.get("/submissions/{week}")
async def get_submission_by_week(week: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    team = await _find_team(db, user)
    s = (await db.execute(
        select(WeeklySubmission).where(WeeklySubmission.team_id == team.id, WeeklySubmission.week == week)
    )).scalar_one_or_none()
    if not s:
        return {"week": week, "title": f"Week {week} Deliverables", "status": "Pending",
                "projectTitle": team.project_title or "", "problemStatement": team.problem_statement or "",
                "solution": team.proposed_solution or "", "technologyUsed": "", "obstaclesFaced": "",
                "abstract": team.abstract or "", "repoUrl": team.repo_url or "", "demoUrl": team.demo_url or ""}
    return _sub(s)


@router.post("/submissions/{week}")
async def submit_deliverables(week: int, req: SubmitDeliverablesRequest,
                              user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    team = await _find_team(db, user)
    s = (await db.execute(
        select(WeeklySubmission).where(WeeklySubmission.team_id == team.id, WeeklySubmission.week == week)
    )).scalar_one_or_none()

    today = datetime.now().strftime("%d %b %Y")
    status = "Submitted" if req.isSubmit else "Draft"

    if not s:
        s = WeeklySubmission(id=uuid.uuid4(), team_id=team.id, week=week,
                             title=f"Week {week} Deliverables", status=status, submission_date=today,
                             problem_statement=req.problemStatement, solution=req.solution,
                             technology_used=req.technologyUsed, obstacles_faced=req.obstaclesFaced,
                             abstract=req.abstract, repo_url=req.repoUrl, demo_url=req.demoUrl,
                             project_title=team.project_title or "", guide_name=team.guide_name or "")
        db.add(s)
    else:
        s.status = status
        s.submission_date = today
        for attr, val in [("problem_statement", req.problemStatement), ("solution", req.solution),
                          ("technology_used", req.technologyUsed), ("obstacles_faced", req.obstaclesFaced),
                          ("abstract", req.abstract), ("repo_url", req.repoUrl), ("demo_url", req.demoUrl)]:
            if val is not None:
                setattr(s, attr, val)
    await db.commit()
    await db.refresh(s)
    return _sub(s)


@router.delete("/submissions/{week}")
async def delete_submission(week: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    team = await _find_team(db, user)
    s = (await db.execute(
        select(WeeklySubmission).where(WeeklySubmission.team_id == team.id, WeeklySubmission.week == week)
    )).scalar_one_or_none()
    if s:
        await db.delete(s)
        await db.commit()
    return {"success": True, "message": f"Week {week} submission deleted."}
