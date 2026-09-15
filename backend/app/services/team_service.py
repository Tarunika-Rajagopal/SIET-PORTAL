from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.academic_repository import AcademicRepository
from app.schemas.teams import TeamCreate, TeamResponse, TeamMemberResponse, AddMemberRequest, AllocateGuideRequest
from app.exceptions.custom import NotFoundException, ConflictException, ForbiddenException, BadRequestException
from app.models.teams import Team
from app.models.users import User

class TeamService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.team_repo = TeamRepository(db)
        self.user_repo = UserRepository(db)
        self.fs_repo = FacultyStudentRepository(db)
        self.academic_repo = AcademicRepository(db)

    def _build_team_response(self, team: Team) -> TeamResponse:
        members_resp = []
        for m in team.members:
            st = m.student
            usr = st.user if st else None
            members_resp.append(
                TeamMemberResponse(
                    id=st.id if st else m.id,
                    name=usr.name if usr else "Unknown Student",
                    roll_no=st.roll_no if st else "",
                    email=usr.email if usr else "",
                    role=m.member_role
                )
            )

        project_title = team.project.title if team.project else None
        submitted_title = team.project.submitted_title if team.project else None
        is_title_approved = (team.project.guide_approval_status == "Approved") if team.project else False
        guide_approval_status = team.project.guide_approval_status if team.project else "Pending Review"

        guide_name = team.guide.name if team.guide else "Unassigned"
        advisor_name = team.advisor.name if team.advisor else "Unassigned"

        batch_name = team.batch.name if team.batch else ""
        section_name = team.section.name if team.section else ""

        return TeamResponse(
            id=team.id,
            team_no=team.team_no,
            project_title=project_title,
            submitted_title=submitted_title,
            is_title_approved=is_title_approved,
            guide_approval_status=guide_approval_status,
            guide_name=guide_name,
            advisor_name=advisor_name,
            batch=batch_name,
            section=section_name,
            members=members_resp,
            status=team.status,
            progress=team.progress
        )

    async def get_team_by_id(self, team_id: UUID, user: User) -> TeamResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        roles = [r.name.lower() for r in user.roles]
        
        # IDOR protection for Students
        if "student" in roles and "admin" not in roles and "guide" not in roles and "advisor" not in roles and "hod" not in roles:
            st_team = await self.team_repo.get_team_by_student_user_id(user.id)
            if not st_team or st_team.id != team_id:
                raise ForbiddenException("Access denied. You can only view your own team's details.")

        # IDOR protection for Guides (unprivileged)
        if "guide" in roles and "admin" not in roles and "advisor" not in roles and "hod" not in roles:
            if team.guide_id != user.id:
                raise ForbiddenException("Access denied. You can only view details for teams assigned to you.")

        return self._build_team_response(team)

    async def list_teams(
        self,
        batch_id: Optional[UUID] = None,
        section_id: Optional[UUID] = None,
        guide_id: Optional[UUID] = None
    ) -> List[TeamResponse]:
        teams = await self.team_repo.get_all_teams(batch_id=batch_id, section_id=section_id, guide_id=guide_id)
        return [self._build_team_response(t) for t in teams]

    async def create_team(self, data: TeamCreate, advisor_user: User) -> TeamResponse:
        batch = await self.academic_repo.get_batch_by_id(data.batch_id)
        if not batch:
            raise NotFoundException(f"Batch ID '{data.batch_id}' not found")

        section = await self.academic_repo.get_section_by_id(data.section_id)
        if not section:
            raise NotFoundException(f"Section ID '{data.section_id}' not found")

        team = await self.team_repo.create_team(
            team_no=data.team_no,
            batch_id=batch.id,
            section_id=section.id,
            advisor_id=advisor_user.id
        )

        for idx, roll in enumerate(data.student_rolls):
            student = await self.fs_repo.get_student_by_roll_no(roll.strip())
            if not student:
                await self.db.rollback()
                raise NotFoundException(f"Student with roll number '{roll}' not found")

            existing_team = await self.team_repo.get_team_by_student_user_id(student.user_id)
            if existing_team:
                await self.db.rollback()
                raise ConflictException(f"Student '{roll}' is already assigned to team '{existing_team.team_no}'")

            role_str = "Team Lead" if idx == 0 else "Team Member"
            await self.team_repo.add_team_member(team.id, student.id, member_role=role_str)

        await self.db.commit()
        refreshed_team = await self.team_repo.get_team_by_id(team.id)
        return self._build_team_response(refreshed_team)

    async def add_member(self, team_id: UUID, req: AddMemberRequest) -> TeamResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        student = await self.fs_repo.get_student_by_roll_no(req.student_roll.strip())
        if not student:
            raise NotFoundException(f"Student with roll number '{req.student_roll}' not found")

        existing_team = await self.team_repo.get_team_by_student_user_id(student.user_id)
        if existing_team:
            raise ConflictException(f"Student '{req.student_roll}' is already assigned to team '{existing_team.team_no}'")

        await self.team_repo.add_team_member(team.id, student.id, member_role="Team Member")
        await self.db.commit()
        refreshed_team = await self.team_repo.get_team_by_id(team_id)
        return self._build_team_response(refreshed_team)

    async def remove_member(self, team_id: UUID, student_id: UUID) -> TeamResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        success = await self.team_repo.remove_team_member(team_id, student_id)
        if not success:
            raise NotFoundException(f"Student ID '{student_id}' is not in Team ID '{team_id}'")

        await self.db.commit()
        refreshed_team = await self.team_repo.get_team_by_id(team_id)
        return self._build_team_response(refreshed_team)

    async def allocate_guide(self, team_id: UUID, req: AllocateGuideRequest) -> TeamResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        guide_user = await self.user_repo.get_user_by_id(req.guide_id)
        if not guide_user:
            raise NotFoundException(f"Guide user ID '{req.guide_id}' not found")

        guide_roles = [r.name.lower() for r in guide_user.roles]
        if "guide" not in guide_roles and "advisor" not in guide_roles and "hod" not in guide_roles:
            raise BadRequestException(f"User '{guide_user.name}' does not hold a faculty guide role.")

        # Row-level lock on Faculty record for transaction atomicity & race condition protection
        faculty = await self.team_repo.get_faculty_for_update(guide_user.id)
        quota = faculty.guide_quota if faculty else 5

        # Check guide current active team allocations within locked transaction
        active_count = await self.team_repo.get_count_active_teams_by_guide(guide_user.id)
        if team.guide_id != guide_user.id and active_count >= quota:
            raise BadRequestException(f"Guide '{guide_user.name}' has reached max mentee quota limit ({quota} teams).")

        await self.team_repo.assign_guide(team.id, guide_user.id)
        await self.db.commit()
        refreshed_team = await self.team_repo.get_team_by_id(team.id)
        return self._build_team_response(refreshed_team)
