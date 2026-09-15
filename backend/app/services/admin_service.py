import csv
import io
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.repositories.portal_repository import PortalRepository
from app.repositories.user_repository import UserRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.academic_repository import AcademicRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.core.security import get_password_hash
from app.schemas.portals import AdminUserResponse, UpdateFacultyRequest, CsvImportResponse
from app.schemas.audit_notifications import AuditLogResponse
from app.exceptions.custom import NotFoundException, BadRequestException, ConflictException
from app.models.users import User
from app.models.academic import Batch, Section, Department

class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.portal_repo = PortalRepository(db)
        self.user_repo = UserRepository(db)
        self.fs_repo = FacultyStudentRepository(db)
        self.academic_repo = AcademicRepository(db)
        self.team_repo = TeamRepository(db)
        self.proj_repo = ProjectRepository(db)
        self.audit_repo = AuditNotificationRepository(db)

    async def get_users_paginated(
        self,
        role_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[AdminUserResponse], int]:
        users, total = await self.portal_repo.get_all_users_paginated(
            role_filter=role_filter,
            search_query=search_query,
            page=page,
            page_size=page_size
        )

        resps = []
        for u in users:
            roles = [r.name.lower() for r in u.roles]
            quota = None
            if any(r in roles for r in ["guide", "advisor", "hod"]):
                fac = await self.fs_repo.get_faculty_by_user_id(u.id)
                quota = fac.guide_quota if fac else 5

            resps.append(
                AdminUserResponse(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    roll_no=u.student.roll_no if u.student else None,
                    department=u.department.name if u.department else "Computer Science and Engineering",
                    roles=roles,
                    designation=u.designation,
                    guide_quota=quota,
                    created_at=u.created_at
                )
            )

        return resps, total

    async def update_faculty_profile(self, faculty_user_id: UUID, req: UpdateFacultyRequest, admin_user: User) -> AdminUserResponse:
        user = await self.user_repo.get_user_by_id(faculty_user_id)
        if not user:
            raise NotFoundException(f"User ID '{faculty_user_id}' not found.")

        fac = await self.fs_repo.get_faculty_by_user_id(user.id)
        if not fac:
            raise NotFoundException(f"Faculty record not found for user '{user.name}'.")

        if req.designation:
            user.designation = req.designation.strip()
            fac.designation = req.designation.strip()

        if req.guide_quota is not None:
            if req.guide_quota < 0:
                raise BadRequestException("Guide quota cannot be negative.")
            fac.guide_quota = req.guide_quota

        if req.roles:
            for r_name in req.roles:
                role_obj = await self.user_repo.get_role_by_name(r_name.lower())
                if role_obj:
                    existing_roles = [r.name.lower() for r in user.roles]
                    if r_name.lower() not in existing_roles:
                        await self.user_repo.assign_role_to_user(user.id, role_obj.id)

        await self.audit_repo.create_audit_log(
            user_id=admin_user.id,
            action_type="FACULTY_PROFILE_UPDATED",
            target=user.email,
            details=f"Updated quota={req.guide_quota}, designation={req.designation}"
        )

        await self.db.commit()

        refreshed_user = await self.user_repo.get_user_by_id(user.id)
        roles = [r.name.lower() for r in refreshed_user.roles]
        return AdminUserResponse(
            id=refreshed_user.id,
            name=refreshed_user.name,
            email=refreshed_user.email,
            roll_no=refreshed_user.student.roll_no if refreshed_user.student else None,
            department=refreshed_user.department.name if refreshed_user.department else "Computer Science and Engineering",
            roles=roles,
            designation=refreshed_user.designation,
            guide_quota=fac.guide_quota,
            created_at=refreshed_user.created_at
        )

    async def import_students_csv(self, csv_content: str, admin_user: User) -> CsvImportResponse:
        f = io.StringIO(csv_content)
        reader = csv.DictReader(f)

        dept = await self.academic_repo.get_department_by_code("CSE")
        if not dept:
            dept = await self.academic_repo.create_department("Computer Science and Engineering", "CSE")

        role_st = await self.user_repo.get_role_by_name("student")

        created_students = 0
        created_teams = 0
        errors = []
        processed = 0

        for row in reader:
            processed += 1
            try:
                roll = row.get("rollNo") or row.get("roll_no")
                name = row.get("name")
                email = row.get("email")
                batch_name = row.get("batch") or "2023-2027 (III Year)"
                section_name = row.get("section") or "CSE-B"

                if not roll or not email or not name:
                    errors.append(f"Row {processed}: Missing required fields (rollNo, name, email).")
                    continue

                res_b = await self.db.execute(select(Batch).where(Batch.department_id == dept.id, Batch.name == batch_name.strip()))
                b_obj = res_b.scalars().first()
                if not b_obj:
                    b_obj = await self.academic_repo.create_batch(dept.id, batch_name.strip())

                res_s = await self.db.execute(select(Section).where(Section.batch_id == b_obj.id, Section.name == section_name.strip()))
                s_obj = res_s.scalars().first()
                if not s_obj:
                    s_obj = await self.academic_repo.create_section(b_obj.id, section_name.strip())

                u_exist = await self.user_repo.get_user_by_email(email.strip().lower())
                if not u_exist:
                    u_exist = await self.user_repo.create_user(
                        email=email.strip().lower(),
                        password_hash=get_password_hash("student@123"),
                        name=name.strip(),
                        department_id=dept.id
                    )
                    await self.user_repo.assign_role_to_user(u_exist.id, role_st.id)

                st_exist = await self.fs_repo.get_student_by_user_id(u_exist.id)
                if not st_exist:
                    await self.fs_repo.create_student(
                        user_id=u_exist.id,
                        roll_no=roll.strip(),
                        batch_id=b_obj.id,
                        section_id=s_obj.id
                    )
                    created_students += 1

            except Exception as e:
                errors.append(f"Row {processed}: {str(e)}")

        await self.audit_repo.create_audit_log(
            user_id=admin_user.id,
            action_type="CSV_STUDENT_IMPORT",
            target="Student Roster CSV",
            details=f"Processed {processed} rows, created {created_students} new student accounts."
        )

        await self.db.commit()
        return CsvImportResponse(
            total_processed=processed,
            created_students=created_students,
            created_teams=created_teams,
            errors=errors
        )

    async def get_audit_logs(
        self,
        action_type: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[AuditLogResponse], int]:
        logs, total = await self.audit_repo.get_audit_logs(
            action_type=action_type,
            search_query=search_query,
            page=page,
            page_size=page_size
        )

        resps = [
            AuditLogResponse(
                id=l.id,
                user_name=l.user.name if l.user else "System",
                action_type=l.action_type,
                target=l.target,
                details=l.details,
                reason=l.reason,
                created_at=l.created_at
            )
            for l in logs
        ]

        return resps, total
