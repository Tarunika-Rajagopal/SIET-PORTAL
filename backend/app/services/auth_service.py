from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, LoginResponse, SwitchRoleRequest, SwitchRoleResponse, UserResponse
from app.exceptions.custom import UnauthorizedException, ForbiddenException, NotFoundException
from app.models.users import User

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.faculty_student_repo = FacultyStudentRepository(db)
        self.audit_repo = AuditNotificationRepository(db)

    def _build_user_response(self, user: User, active_role: str) -> UserResponse:
        roles_list = [r.name for r in user.roles]
        
        roll_no = None
        batch_name = None
        section_name = None
        
        if user.student:
            roll_no = user.student.roll_no
            if user.student.batch:
                batch_name = user.student.batch.name
            if user.student.section:
                section_name = user.student.section.name

        dept_name = user.department.name if user.department else "Computer Science and Engineering"

        # Determine primary role for response compatibility
        primary_role = active_role if active_role else (roles_list[0] if roles_list else "student")

        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            roll_no=roll_no,
            department=dept_name,
            role=primary_role,
            roles=roles_list,
            active_role=active_role,
            designation=user.designation,
            phone=user.phone,
            batch=batch_name,
            section=section_name
        )

    async def login(self, req: LoginRequest) -> LoginResponse:
        user = None
        input_str = req.emailOrRoll.strip()

        # Check if email
        if "@" in input_str:
            user = await self.user_repo.get_user_by_email(input_str.lower())
        else:
            # Check roll number
            student = await self.faculty_student_repo.get_student_by_roll_no(input_str)
            if student and student.user:
                user = await self.user_repo.get_user_by_id(student.user_id)

        if not user:
            raise UnauthorizedException("Invalid email/roll number or password")

        if not verify_password(req.password, user.password_hash):
            raise UnauthorizedException("Invalid email/roll number or password")

        if not user.is_active:
            raise UnauthorizedException("Account is inactive")

        roles_list = [r.name for r in user.roles]
        active_role = roles_list[0] if roles_list else "student"

        # Generate JWT
        token = create_access_token(data={"sub": str(user.id), "activeRole": active_role})
        user_resp = self._build_user_response(user, active_role)

        await self.audit_repo.create_audit_log(
            user_id=user.id,
            action_type="USER_LOGIN",
            target=user.email,
            details=f"Successful authentication as active role '{active_role}'."
        )
        await self.db.commit()

        return LoginResponse(success=True, token=token, user=user_resp)

    async def switch_role(self, current_user: User, req: SwitchRoleRequest) -> SwitchRoleResponse:
        target_role = req.targetRole.strip().lower()
        assigned_roles = [r.name.lower() for r in current_user.roles]

        if target_role not in assigned_roles:
            raise ForbiddenException(f"User does not have role '{req.targetRole}' assigned.")

        token = create_access_token(data={"sub": str(current_user.id), "activeRole": target_role})
        user_resp = self._build_user_response(current_user, target_role)

        await self.audit_repo.create_audit_log(
            user_id=current_user.id,
            action_type="ROLE_SWITCH",
            target=current_user.email,
            details=f"Switched active role to '{target_role}'."
        )
        await self.db.commit()

        return SwitchRoleResponse(success=True, token=token, user=user_resp)

    def get_me(self, current_user: User, active_role: str) -> UserResponse:
        return self._build_user_response(current_user, active_role)
