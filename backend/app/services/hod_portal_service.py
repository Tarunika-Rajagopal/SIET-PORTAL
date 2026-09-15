from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.portal_repository import PortalRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.academic_repository import AcademicRepository
from app.repositories.user_repository import UserRepository
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.schemas.portals import HodAnalyticsResponse, FacultyWorkloadResponse, AssignAdvisorRequest
from app.exceptions.custom import NotFoundException, BadRequestException, ForbiddenException
from app.models.users import User

class HodPortalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.portal_repo = PortalRepository(db)
        self.team_repo = TeamRepository(db)
        self.academic_repo = AcademicRepository(db)
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditNotificationRepository(db)

    async def get_analytics(self, hod_user: User) -> HodAnalyticsResponse:
        dept_id = hod_user.department_id
        if not dept_id:
            dept = await self.academic_repo.get_department_by_code("CSE")
            dept_id = dept.id if dept else None

        if not dept_id:
            raise NotFoundException("HOD department association not found.")

        dept = await self.academic_repo.get_department_by_id(dept_id)
        dept_name = dept.name if dept else "Computer Science and Engineering"

        teams = await self.portal_repo.get_department_teams(dept_id)
        faculty_list = await self.portal_repo.get_department_faculty(dept_id)
        total_students = await self.portal_repo.get_department_students_count(dept_id)

        total_progress = sum(t.progress for t in teams)
        avg_progress = int(total_progress / len(teams)) if teams else 0

        return HodAnalyticsResponse(
            department_name=dept_name,
            total_students=total_students,
            total_teams=len(teams),
            total_faculty=len(faculty_list),
            average_progress=avg_progress
        )

    async def get_faculty_workload(self, hod_user: User) -> List[FacultyWorkloadResponse]:
        dept_id = hod_user.department_id
        if not dept_id:
            dept = await self.academic_repo.get_department_by_code("CSE")
            dept_id = dept.id if dept else None

        faculty_list = await self.portal_repo.get_department_faculty(dept_id)
        resps = []

        for fac in faculty_list:
            usr = fac.user
            if not usr:
                continue

            active_teams = await self.team_repo.get_count_active_teams_by_guide(usr.id)
            roles = [r.name.lower() for r in usr.roles]

            resps.append(
                FacultyWorkloadResponse(
                    id=usr.id,
                    name=usr.name,
                    email=usr.email,
                    designation=fac.designation or usr.designation or "Faculty Member",
                    assigned_teams_count=active_teams,
                    guide_quota=fac.guide_quota,
                    roles=roles
                )
            )

        return resps

    async def assign_advisor(self, hod_user: User, req: AssignAdvisorRequest) -> dict:
        fac_user = await self.user_repo.get_user_by_id(req.faculty_id)
        if not fac_user:
            raise NotFoundException(f"Faculty user ID '{req.faculty_id}' not found.")

        # Ensure faculty has advisor role assigned
        advisor_role = await self.user_repo.get_role_by_name("advisor")
        if advisor_role:
            roles = [r.name.lower() for r in fac_user.roles]
            if "advisor" not in roles:
                await self.user_repo.assign_role_to_user(fac_user.id, advisor_role.id)

        batch = await self.academic_repo.get_batch_by_id(req.batch_id)
        section = await self.academic_repo.get_section_by_id(req.section_id)

        if not batch or not section:
            raise NotFoundException("Specified batch or section not found.")

        # Assign advisor_id to existing unassigned teams in that section
        teams = await self.team_repo.get_all_teams(batch_id=batch.id, section_id=section.id)
        for t in teams:
            t.advisor_id = fac_user.id

        await self.audit_repo.create_audit_log(
            user_id=hod_user.id,
            action_type="ADVISOR_ASSIGNED",
            target=f"Section {section.name}",
            details=f"Assigned {fac_user.name} as Class Advisor for {section.name} ({batch.name})."
        )

        await self.db.commit()
        return {
            "success": True,
            "message": f"Successfully assigned {fac_user.name} as Class Advisor for {section.name} ({batch.name})."
        }
