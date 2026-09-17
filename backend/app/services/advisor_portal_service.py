from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.portal_repository import PortalRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.academic_repository import AcademicRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.services.team_service import TeamService
from app.schemas.portals import AdvisorDashboardResponse, StudentInspectionResponse, AutoGenerateTeamsRequest
from app.schemas.teams import TeamCreate, TeamUpdate, TeamResponse
from app.exceptions.custom import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from app.models.users import User

class AdvisorPortalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.portal_repo = PortalRepository(db)
        self.team_repo = TeamRepository(db)
        self.sub_repo = SubmissionRepository(db)
        self.academic_repo = AcademicRepository(db)
        self.fs_repo = FacultyStudentRepository(db)
        self.audit_repo = AuditNotificationRepository(db)
        self.team_service = TeamService(db)

    async def get_dashboard(self, advisor_user: User) -> AdvisorDashboardResponse:
        teams = await self.portal_repo.get_advisor_teams(advisor_user.id)
        team_resps = [self.team_service._build_team_response(t) for t in teams]

        batch_name = teams[0].batch.name if teams and teams[0].batch else "Assigned Batch"
        section_name = teams[0].section.name if teams and teams[0].section else "Assigned Section"

        section_id = teams[0].section_id if teams else None
        batch_id = teams[0].batch_id if teams else None

        total_students = 0
        unassigned_count = 0

        if section_id and batch_id:
            st_list = await self.portal_repo.get_students_by_batch_and_section(batch_id, section_id)
            total_students = len(st_list)
            unassigned = await self.portal_repo.get_unassigned_students_by_section(section_id)
            unassigned_count = len(unassigned)

        active_projects = len([t for t in teams if t.project and t.project.title])

        return AdvisorDashboardResponse(
            total_students=total_students,
            total_teams=len(teams),
            unassigned_students_count=unassigned_count,
            active_projects_count=active_projects,
            section_name=section_name,
            batch_name=batch_name,
            teams=team_resps
        )

    async def get_teams(self, advisor_user: User) -> List[TeamResponse]:
        teams = await self.portal_repo.get_advisor_teams(advisor_user.id)
        return [self.team_service._build_team_response(t) for t in teams]

    async def create_manual_team(self, data: TeamCreate, advisor_user: User) -> TeamResponse:
        return await self.team_service.create_team(data, advisor_user)

    async def update_team(self, team_id: UUID, data: TeamUpdate, advisor_user: User) -> TeamResponse:
        return await self.team_service.update_team(team_id, data, advisor_user)

    async def delete_team(self, team_id: UUID, advisor_user: User) -> dict:
        return await self.team_service.delete_team(team_id, advisor_user)

    async def auto_generate_teams(self, req: AutoGenerateTeamsRequest, advisor_user: User) -> List[TeamResponse]:
        unassigned = await self.portal_repo.get_unassigned_students_by_section(req.section_id)
        if not unassigned:
            raise BadRequestException("No unassigned students available in this section for auto team generation.")

        team_size = max(1, req.team_size)
        created_teams = []

        existing_teams = await self.team_repo.get_all_teams(batch_id=req.batch_id, section_id=req.section_id)
        existing_numbers = []
        for t in existing_teams:
            digits = "".join(filter(str.isdigit, t.team_no))
            if digits:
                existing_numbers.append(int(digits))
        current_max_num = max(existing_numbers) if existing_numbers else len(existing_teams)

        chunk_start = 0
        while chunk_start < len(unassigned):
            chunk = unassigned[chunk_start:chunk_start + team_size]
            current_max_num += 1
            team_no = f"Team {current_max_num:02d}"

            team = await self.team_repo.create_team(
                team_no=team_no,
                batch_id=req.batch_id,
                section_id=req.section_id,
                advisor_id=advisor_user.id
            )

            for idx, student in enumerate(chunk):
                role_str = "Team Lead" if idx == 0 else "Team Member"
                await self.team_repo.add_team_member(team.id, student.id, member_role=role_str)

            refreshed = await self.team_repo.get_team_by_id(team.id)
            created_teams.append(self.team_service._build_team_response(refreshed))
            chunk_start += team_size

        await self.audit_repo.create_audit_log(
            user_id=advisor_user.id,
            action_type="AUTO_TEAMS_GENERATED",
            target=f"Section {req.section_id}",
            details=f"Auto-generated {len(created_teams)} teams for {len(unassigned)} students."
        )

        await self.db.commit()
        return created_teams

    async def get_student_inspection(self, advisor_user: User) -> List[StudentInspectionResponse]:
        teams = await self.portal_repo.get_advisor_teams(advisor_user.id)
        if not teams:
            return []

        section_id = teams[0].section_id
        batch_id = teams[0].batch_id

        students = await self.portal_repo.get_students_by_batch_and_section(batch_id, section_id)
        resps = []

        for st in students:
            usr = st.user
            st_team = await self.team_repo.get_team_by_student_user_id(usr.id)
            
            submitted_count = 0
            team_no = None
            proj_title = None

            if st_team:
                team_no = st_team.team_no
                if st_team.project:
                    proj_title = st_team.project.title or st_team.project.submitted_title
                subs = await self.sub_repo.get_submissions_by_team_id(st_team.id)
                submitted_count = len([s for s in subs if s.status in ["SUBMITTED", "APPROVED"]])

            resps.append(
                StudentInspectionResponse(
                    id=st.id,
                    name=usr.name if usr else "Unknown",
                    roll_no=st.roll_no,
                    email=usr.email if usr else "",
                    batch=st.batch.name if st.batch else "",
                    section=st.section.name if st.section else "",
                    team_no=team_no,
                    project_title=proj_title,
                    submitted_weeks_count=submitted_count,
                    status="Assigned" if st_team else "Unassigned"
                )
            )

        return resps
