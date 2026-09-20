"""Project service handling business logic and authorization for project and title approvals."""
import uuid
from datetime import datetime
from typing import Dict, Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models import Team, TitleApproval, User
from schemas import UpdateTitleRequest, TitleApprovalRequest
from repositories.team_repository import TeamRepository
from repositories.project_repository import ProjectRepository


class ProjectService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.project_repo = ProjectRepository(session)

    async def update_project_title(
        self, team_id: str, req: UpdateTitleRequest, current_user: User
    ) -> Dict[str, Any]:
        team = await self.team_repo.get_by_team_id_string(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        # If student, verify they belong to this team
        if current_user.role == "student":
            if current_user.team_id != team.team_id and str(team.id) != current_user.team_id:
                raise HTTPException(status_code=403, detail="You are not authorized to update this team's title")

        team.submitted_title = req.title
        team.project_title = req.title
        team.guide_approval_status = "Pending Review"
        team.last_modified = datetime.now()

        # Create / update title approval entry
        approval = await self.project_repo.get_title_approval_by_team_id(team.id)
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
            await self.project_repo.create_title_approval(approval)
        else:
            approval.title = req.title
            approval.status = "Pending"
            approval.submitted_on = datetime.now().strftime("%d %b %Y")

        await self.session.commit()
        await self.session.refresh(team)

        return {
            "success": True,
            "teamId": team.team_id,
            "title": team.project_title,
            "guideApprovalStatus": team.guide_approval_status,
        }

    async def review_title_approval(
        self, project_id: str, req: TitleApprovalRequest, current_user: User
    ) -> Dict[str, Any]:
        team = await self.team_repo.get_by_team_id_string(project_id)
        if not team:
            # Check TitleApproval table directly
            try:
                p_uuid = uuid.UUID(project_id)
                app_item = await self.project_repo.get_title_approval_by_id(p_uuid)
                if app_item:
                    team = await self.team_repo.get_by_id(app_item.team_id)
            except Exception:
                pass

        if not team:
            raise HTTPException(status_code=404, detail="Project or team not found")

        # If guide, verify guide is assigned to this team
        if current_user.role == "guide":
            guide_name = current_user.name or ""
            is_guide = False
            if team.guide_email and team.guide_email.lower() == current_user.email.lower():
                is_guide = True
            elif team.guide_name and guide_name and guide_name.lower() in team.guide_name.lower():
                is_guide = True
            if not is_guide:
                raise HTTPException(status_code=403, detail="You are not authorized to approve titles for this team")

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
        approval = await self.project_repo.get_title_approval_by_team_id(team.id)
        if approval:
            approval.status = "Approved" if decision == "APPROVED" else "Rejected"

        await self.session.commit()
        await self.session.refresh(team)

        return {
            "success": True,
            "decision": decision,
            "isTitleApproved": team.is_title_approved,
            "guideApprovalStatus": team.guide_approval_status,
            "remarks": req.remarks or "",
        }
