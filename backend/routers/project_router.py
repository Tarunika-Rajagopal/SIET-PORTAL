from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String
from database import get_db
from models import Team, TitleApproval
from auth import get_current_user
from schemas import UpdateTitleRequest, TitleApprovalRequest
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.put("/team/{team_id}/title")
async def update_project_title(
    team_id: str,
    req: UpdateTitleRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(
            (Team.team_id == team_id) |
            (cast(Team.id, String) == team_id)
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    team.submitted_title = req.title
    team.project_title = req.title
    team.guide_approval_status = "Pending Review"
    team.last_modified = datetime.now()

    # Create / update title approval entry
    approval_res = await db.execute(select(TitleApproval).where(TitleApproval.team_id == team.id))
    approval = approval_res.scalar_one_or_none()
    if not approval:
        approval = TitleApproval(
            id=uuid.uuid4(),
            team_id=team.id,
            team_no=team.team_no,
            title=req.title,
            proposed_by=current_user.name,
            submitted_on=datetime.now().strftime("%d %b %Y"),
            status="Pending",
        )
        db.add(approval)
    else:
        approval.title = req.title
        approval.status = "Pending"
        approval.submitted_on = datetime.now().strftime("%d %b %Y")

    await db.commit()
    await db.refresh(team)

    return {
        "success": True,
        "teamId": team.team_id,
        "title": team.project_title,
        "guideApprovalStatus": team.guide_approval_status,
    }


@router.post("/{project_id}/title-approval")
async def review_title_approval(
    project_id: str,
    req: TitleApprovalRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Team).where(
            (Team.team_id == project_id) |
            (cast(Team.id, String) == project_id)
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        # Check TitleApproval table directly
        try:
            p_uuid = uuid.UUID(project_id)
            app_res = await db.execute(select(TitleApproval).where(TitleApproval.id == p_uuid))
            app_item = app_res.scalar_one_or_none()
            if app_item:
                team_res = await db.execute(select(Team).where(Team.id == app_item.team_id))
                team = team_res.scalar_one_or_none()
        except Exception:
            pass

    if not team:
        raise HTTPException(status_code=404, detail="Project or team not found")

    decision = req.decision.upper()
    if decision == "APPROVED":
        team.is_title_approved = True
        team.guide_approval_status = "Approved"
        team.status = "Approved"
        team.rejection_reason = ""
    else:
        team.is_title_approved = False
        team.guide_approval_status = "Rejected"
        team.rejection_reason = req.remarks or "Title proposal requires revision."

    # Update TitleApproval record if exists
    app_res = await db.execute(select(TitleApproval).where(TitleApproval.team_id == team.id))
    approval = app_res.scalar_one_or_none()
    if approval:
        approval.status = "Approved" if decision == "APPROVED" else "Rejected"

    await db.commit()
    await db.refresh(team)

    return {
        "success": True,
        "decision": decision,
        "isTitleApproved": team.is_title_approved,
        "guideApprovalStatus": team.guide_approval_status,
        "remarks": req.remarks or "",
    }
