from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.project_repository import ProjectRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.projects import ProjectCreate, ProjectResponse, UpdateTitleRequest, TitleApprovalRequest, ProjectTitleHistoryResponse
from app.exceptions.custom import NotFoundException, BadRequestException, ForbiddenException
from app.models.projects import Project
from app.models.users import User

class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.proj_repo = ProjectRepository(db)
        self.team_repo = TeamRepository(db)

    def _build_project_response(self, project: Project) -> ProjectResponse:
        return ProjectResponse(
            id=project.id,
            team_id=project.team_id,
            title=project.title,
            submitted_title=project.submitted_title,
            abstract=project.abstract,
            status=project.status,
            guide_approval_status=project.guide_approval_status,
            is_locked=project.is_locked,
            created_at=project.created_at
        )

    async def get_project_by_team_id(self, team_id: UUID, user: User) -> ProjectResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        roles = [r.name.lower() for r in user.roles]

        # IDOR check for Students
        if "student" in roles and "admin" not in roles and "guide" not in roles and "advisor" not in roles and "hod" not in roles:
            st_team = await self.team_repo.get_team_by_student_user_id(user.id)
            if not st_team or st_team.id != team_id:
                raise ForbiddenException("Access denied. You can only view your own team's project.")

        # IDOR check for Guides
        if "guide" in roles and "admin" not in roles and "advisor" not in roles and "hod" not in roles:
            if team.guide_id != user.id:
                raise ForbiddenException("Access denied. You can only view projects for teams assigned to you.")

        project = await self.proj_repo.get_project_by_team_id(team_id)
        if not project:
            project = await self.proj_repo.create_project(team_id=team_id)
            await self.db.commit()
            project = await self.proj_repo.get_project_by_team_id(team_id)

        return self._build_project_response(project)

    async def update_title(self, team_id: UUID, req: UpdateTitleRequest, user: User) -> ProjectResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        roles = [r.name.lower() for r in user.roles]

        # Student authorization check
        if "student" in roles and "admin" not in roles and "advisor" not in roles:
            st_team = await self.team_repo.get_team_by_student_user_id(user.id)
            if not st_team or st_team.id != team_id:
                raise ForbiddenException("Access denied. You can only update your own team's project title.")

        project = await self.proj_repo.get_project_by_team_id(team_id)
        if not project:
            project = await self.proj_repo.create_project(team_id=team_id)

        # Status transition & locking checks
        if project.is_locked or project.status in ["APPROVED", "LOCKED"] or project.guide_approval_status == "Approved":
            raise BadRequestException("Project title is already approved or locked. Title changes are no longer permitted.")

        prev_title = project.submitted_title or project.title or ""
        new_title = req.title.strip()

        project.submitted_title = new_title
        if req.abstract:
            project.abstract = req.abstract.strip()
        project.guide_approval_status = "Pending Review"
        project.status = "PENDING"

        if prev_title != new_title:
            await self.proj_repo.add_title_history(
                project_id=project.id,
                previous_title=prev_title,
                new_title=new_title,
                changed_by_id=user.id,
                comments="Title updated by student"
            )

        await self.db.commit()
        refreshed = await self.proj_repo.get_project_by_id(project.id)
        return self._build_project_response(refreshed)

    async def approve_title(self, project_id: UUID, req: TitleApprovalRequest, guide_user: User) -> ProjectResponse:
        project = await self.proj_repo.get_project_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project ID '{project_id}' not found")

        team = await self.team_repo.get_team_by_id(project.team_id)
        roles = [r.name.lower() for r in guide_user.roles]

        # Authorization: Assigned Guide, Advisor, HOD, or Admin
        if "admin" not in roles and "hod" not in roles and "advisor" not in roles:
            if not team or team.guide_id != guide_user.id:
                raise ForbiddenException("Access denied. Only the assigned guide can review/approve this project title.")

        status_input = req.status.strip()
        if status_input == "Approved":
            project.title = project.submitted_title or project.title
            project.guide_approval_status = "Approved"
            project.status = "APPROVED"
        elif status_input in ["Revision Required", "Rejected"]:
            project.guide_approval_status = "Revision Required"
            project.status = "REVISION_REQUIRED"
        else:
            raise BadRequestException("Status must be 'Approved' or 'Revision Required'")

        await self.proj_repo.add_title_history(
            project_id=project.id,
            previous_title=project.title,
            new_title=project.submitted_title or project.title or "",
            changed_by_id=guide_user.id,
            comments=req.feedback
        )

        await self.db.commit()
        refreshed = await self.proj_repo.get_project_by_id(project.id)
        return self._build_project_response(refreshed)

    async def get_title_history(self, project_id: UUID, user: User) -> List[ProjectTitleHistoryResponse]:
        project = await self.proj_repo.get_project_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project ID '{project_id}' not found")

        roles = [r.name.lower() for r in user.roles]

        if "student" in roles and "admin" not in roles and "guide" not in roles and "advisor" not in roles and "hod" not in roles:
            st_team = await self.team_repo.get_team_by_student_user_id(user.id)
            if not st_team or st_team.id != project.team_id:
                raise ForbiddenException("Access denied. You can only view title history for your own project.")

        if "guide" in roles and "admin" not in roles and "advisor" not in roles and "hod" not in roles:
            team = await self.team_repo.get_team_by_id(project.team_id)
            if not team or team.guide_id != user.id:
                raise ForbiddenException("Access denied. You can only view title history for assigned projects.")

        history = await self.proj_repo.get_title_history(project_id)
        return [
            ProjectTitleHistoryResponse(
                id=h.id,
                previous_title=h.previous_title,
                new_title=h.new_title,
                changed_by=h.changed_by.name if h.changed_by else "Unknown",
                comments=h.comments,
                created_at=h.created_at
            )
            for h in history
        ]
