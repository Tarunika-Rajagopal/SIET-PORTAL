from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import UserRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.academic_repository import AcademicRepository
from app.core.security import get_password_hash
from app.schemas.faculty_student import StudentCreate, StudentResponse, FacultyCreate, FacultyResponse
from app.exceptions.custom import ConflictException, NotFoundException, BadRequestException

class FacultyStudentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.fs_repo = FacultyStudentRepository(db)
        self.academic_repo = AcademicRepository(db)

    async def create_student(self, data: StudentCreate) -> StudentResponse:
        # Check existing user email
        existing_user = await self.user_repo.get_user_by_email(data.email.lower())
        if existing_user:
            raise ConflictException(f"User with email '{data.email}' already exists.")

        # Check existing roll number
        existing_student = await self.fs_repo.get_student_by_roll_no(data.roll_no)
        if existing_student:
            raise ConflictException(f"Student with roll number '{data.roll_no}' already exists.")

        # Validate batch & section
        batch = await self.academic_repo.get_batch_by_id(data.batch_id)
        if not batch:
            raise NotFoundException(f"Batch ID '{data.batch_id}' not found.")

        section = await self.academic_repo.get_section_by_id(data.section_id)
        if not section:
            raise NotFoundException(f"Section ID '{data.section_id}' not found.")

        dept_id = data.department_id if data.department_id else batch.department_id

        # Get student role
        role = await self.user_repo.get_role_by_name("student")
        if not role:
            role = await self.user_repo.create_role("student", "Student Role")

        # Create user + student in transaction
        pwd_hash = get_password_hash(data.password)
        user = await self.user_repo.create_user(
            email=data.email.lower(),
            password_hash=pwd_hash,
            name=data.name,
            department_id=dept_id,
            phone=data.phone
        )

        await self.user_repo.assign_role_to_user(user.id, role.id)

        student = await self.fs_repo.create_student(
            user_id=user.id,
            roll_no=data.roll_no,
            batch_id=batch.id,
            section_id=section.id
        )

        await self.db.commit()

        return StudentResponse(
            id=student.id,
            user_id=user.id,
            email=user.email,
            name=user.name,
            roll_no=student.roll_no,
            batch=batch.name,
            section=section.name,
            is_active=student.is_active
        )

    async def create_faculty(self, data: FacultyCreate) -> FacultyResponse:
        existing_user = await self.user_repo.get_user_by_email(data.email.lower())
        if existing_user:
            raise ConflictException(f"User with email '{data.email}' already exists.")

        if data.employee_id:
            existing_fac = await self.fs_repo.get_faculty_by_employee_id(data.employee_id)
            if existing_fac:
                raise ConflictException(f"Faculty with employee ID '{data.employee_id}' already exists.")

        pwd_hash = get_password_hash(data.password)
        user = await self.user_repo.create_user(
            email=data.email.lower(),
            password_hash=pwd_hash,
            name=data.name,
            department_id=data.department_id,
            designation=data.designation
        )

        # Assign requested roles
        assigned_role_names = []
        for r_name in data.roles:
            role = await self.user_repo.get_role_by_name(r_name.lower())
            if not role:
                role = await self.user_repo.create_role(r_name.lower(), f"{r_name.capitalize()} Role")
            await self.user_repo.assign_role_to_user(user.id, role.id)
            assigned_role_names.append(role.name)

        faculty = await self.fs_repo.create_faculty(
            user_id=user.id,
            employee_id=data.employee_id,
            designation=data.designation,
            specialization=data.specialization,
            guide_quota=data.guide_quota
        )

        await self.db.commit()

        return FacultyResponse(
            id=faculty.id,
            user_id=user.id,
            email=user.email,
            name=user.name,
            employee_id=faculty.employee_id,
            designation=faculty.designation,
            specialization=faculty.specialization,
            guide_quota=faculty.guide_quota,
            is_active=faculty.is_active,
            roles=assigned_role_names
        )
