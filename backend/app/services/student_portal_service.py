from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.team_repository import TeamRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.academic_repository import AcademicRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.team_service import TeamService
from app.services.project_service import ProjectService
from app.schemas.student_portal import StudentDashboardResponse
from app.schemas.academic import AcademicWeekResponse
from app.exceptions.custom import NotFoundException
from app.models.users import User

class StudentPortalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.team_repo = TeamRepository(db)
        self.proj_repo = ProjectRepository(db)
        self.academic_repo = AcademicRepository(db)
        self.sub_repo = SubmissionRepository(db)
        self.team_service = TeamService(db)
        self.proj_service = ProjectService(db)

    async def get_dashboard(self, student_user: User) -> StudentDashboardResponse:
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        
        team_resp = None
        proj_resp = None
        progress = 0

        if team:
            team_resp = self.team_service._build_team_response(team)
            project = await self.proj_repo.get_project_by_team_id(team.id)
            if project:
                proj_resp = self.proj_service._build_project_response(project)

            subs = await self.sub_repo.get_submissions_by_team_id(team.id)
            submitted_count = len([s for s in subs if s.status in ["SUBMITTED", "APPROVED"]])
            progress = min(100, int((submitted_count / 6.0) * 100))

        curr_week = await self.academic_repo.get_current_academic_week()
        week_resp = AcademicWeekResponse.model_validate(curr_week) if curr_week else None

        return StudentDashboardResponse(
            team=team_resp,
            project=proj_resp,
            current_week=week_resp,
            overall_progress=progress
        )

    async def get_my_team(self, student_user: User):
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")
        return self.team_service._build_team_response(team)

    async def get_my_project(self, student_user: User):
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")
        return await self.proj_service.get_project_by_team_id(team.id, student_user)
