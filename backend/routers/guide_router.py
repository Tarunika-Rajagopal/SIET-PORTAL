"""
Guide endpoints — matches frontend apiClient.ts:
  GET  /api/v1/guide/teams
  GET  /api/v1/guide/dashboard
  GET  /api/v1/guide/submissions/weekly
  POST /api/v1/guide/submissions/{submissionId}/review
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Team, WeeklySubmission, ReviewScore, TeamMember, TitleApproval
from auth import get_current_user
from schemas import ReviewSubmissionRequest

router = APIRouter(prefix="/api/v1/guide", tags=["Guide"])


# ── serializers ────────────────────────────────────────────────
def _team_brief(t: Team) -> dict:
    return {
        "id": str(t.id), "teamId": t.team_id, "teamNo": t.team_no,
        "projectTitle": t.project_title or "", "status": t.status or "In Progress",
        "progress": t.progress or 0, "batch": t.batch, "section": t.class_name,
        "guideName": t.guide_name or "", "advisorName": t.advisor_name or "",
        "isTitleApproved": bool(t.is_title_approved),
        "guideApprovalStatus": t.guide_approval_status or "Pending",
        "memberCount": len(t.members) if t.members else 0,
    }


# ── routes ─────────────────────────────────────────────────────
@router.get("/teams")
async def get_guide_teams(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    guide_name = user.name
    q = (select(Team)
         .options(selectinload(Team.members))
         .where(Team.guide_name.ilike(f"%{guide_name}%")))
    rows = (await db.execute(q)).scalars().all()
    # Fallback: return all teams if no match
    if not rows:
        rows = (await db.execute(select(Team).options(selectinload(Team.members)))).scalars().all()
    return [_team_brief(t) for t in rows]


@router.get("/dashboard")
async def get_guide_dashboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    guide_name = user.name
    q = select(Team).options(selectinload(Team.members)).where(Team.guide_name.ilike(f"%{guide_name}%"))
    teams = (await db.execute(q)).scalars().all()
    if not teams:
        teams = (await db.execute(select(Team).options(selectinload(Team.members)))).scalars().all()

    team_ids = [t.id for t in teams]

    total_submissions = 0
    pending_reviews = 0
    approved_titles = 0
    pending_titles = 0

    if team_ids:
        sub_count = (await db.execute(
            select(func.count()).where(WeeklySubmission.team_id.in_(team_ids))
        )).scalar() or 0
        total_submissions = sub_count

        pending = (await db.execute(
            select(func.count()).where(WeeklySubmission.team_id.in_(team_ids), WeeklySubmission.status == "Submitted")
        )).scalar() or 0
        pending_reviews = pending

        ta_approved = (await db.execute(
            select(func.count()).where(TitleApproval.team_id.in_(team_ids), TitleApproval.status == "Approved")
        )).scalar() or 0
        approved_titles = ta_approved

        ta_pending = (await db.execute(
            select(func.count()).where(TitleApproval.team_id.in_(team_ids), TitleApproval.status == "Pending")
        )).scalar() or 0
        pending_titles = ta_pending

    return {
        "totalTeams": len(teams),
        "totalSubmissions": total_submissions,
        "pendingReviews": pending_reviews,
        "approvedTitles": approved_titles,
        "pendingTitles": pending_titles,
        "teams": [_team_brief(t) for t in teams],
    }


@router.get("/submissions/weekly")
async def get_weekly_submissions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    guide_name = user.name
    teams = (await db.execute(
        select(Team).where(Team.guide_name.ilike(f"%{guide_name}%"))
    )).scalars().all()
    if not teams:
        teams = (await db.execute(select(Team))).scalars().all()
    team_ids = [t.id for t in teams]
    team_map = {t.id: t for t in teams}
    if not team_ids:
        return []

    subs = (await db.execute(
        select(WeeklySubmission).where(WeeklySubmission.team_id.in_(team_ids)).order_by(WeeklySubmission.week)
    )).scalars().all()
    out = []
    for s in subs:
        t = team_map.get(s.team_id)
        out.append({
            "id": str(s.id), "week": s.week,
            "teamId": t.team_id if t else "", "teamNo": t.team_no if t else "",
            "projectTitle": s.project_title or (t.project_title if t else ""),
            "status": s.status or "Pending",
            "submissionDate": s.submission_date or "",
            "score": float(s.score) if s.score is not None else None,
        })
    return out


@router.post("/submissions/{submission_id}/review")
async def review_submission(submission_id: str, req: ReviewSubmissionRequest,
                            user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    sid = uuid.UUID(submission_id)
    s = (await db.execute(select(WeeklySubmission).where(WeeklySubmission.id == sid))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Submission not found")

    s.status = "Approved" if req.status.upper() == "APPROVED" else "Revision Requested"
    s.comments = req.comments or s.comments
    if req.score is not None:
        s.score = req.score
    s.guide_review_date = datetime.now().strftime("%d %b %Y")

    await db.commit()
    await db.refresh(s)
    return {"success": True, "message": f"Submission reviewed: {s.status}", "id": str(s.id)}
