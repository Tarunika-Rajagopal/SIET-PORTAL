from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.teams import Team, TeamMember
from app.models.faculty_student import Faculty, Student
from app.models.users import User
from app.models.academic import Department, Batch, Section
from app.models.projects import Project
from app.models.submissions import WeeklySubmission

class PortalRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- GUIDE ---
    async def get_guide_assigned_teams(self, guide_user_id: UUID) -> List[Team]:
        stmt = (
            select(Team)
            .where(Team.guide_id == guide_user_id)
            .options(
                joinedload(Team.batch),
                joinedload(Team.section),
                joinedload(Team.guide),
                joinedload(Team.advisor),
                joinedload(Team.members).joinedload(TeamMember.student).joinedload(Student.user),
                joinedload(Team.project)
            )
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    async def get_pending_weekly_submissions_for_guide(self, guide_user_id: UUID) -> List[WeeklySubmission]:
        stmt = (
            select(WeeklySubmission)
            .join(Team, WeeklySubmission.team_id == Team.id)
            .where(Team.guide_id == guide_user_id, WeeklySubmission.status == "SUBMITTED")
            .options(
                joinedload(WeeklySubmission.team),
                joinedload(WeeklySubmission.files)
            )
            .order_by(WeeklySubmission.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    # --- ADVISOR ---
    async def get_advisor_teams(self, advisor_user_id: UUID) -> List[Team]:
        stmt = (
            select(Team)
            .where(Team.advisor_id == advisor_user_id)
            .options(
                joinedload(Team.batch),
                joinedload(Team.section),
                joinedload(Team.guide),
                joinedload(Team.advisor),
                joinedload(Team.members).joinedload(TeamMember.student).joinedload(Student.user),
                joinedload(Team.project)
            )
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    async def get_students_by_batch_and_section(self, batch_id: UUID, section_id: UUID) -> List[Student]:
        stmt = (
            select(Student)
            .where(Student.batch_id == batch_id, Student.section_id == section_id)
            .options(
                joinedload(Student.user),
                joinedload(Student.batch),
                joinedload(Student.section)
            )
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    async def get_unassigned_students_by_section(self, section_id: UUID) -> List[Student]:
        stmt = (
            select(Student)
            .where(Student.section_id == section_id)
            .outerjoin(TeamMember, Student.id == TeamMember.student_id)
            .where(TeamMember.id.is_(None))
            .options(joinedload(Student.user))
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    # --- HOD ---
    async def get_department_faculty(self, dept_id: UUID) -> List[Faculty]:
        stmt = (
            select(Faculty)
            .join(User, Faculty.user_id == User.id)
            .where(User.department_id == dept_id)
            .options(
                joinedload(Faculty.user).joinedload(User.roles)
            )
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    async def get_department_teams(self, dept_id: UUID) -> List[Team]:
        stmt = (
            select(Team)
            .join(Batch, Team.batch_id == Batch.id)
            .where(Batch.department_id == dept_id)
            .options(
                joinedload(Team.batch),
                joinedload(Team.section),
                joinedload(Team.guide),
                joinedload(Team.advisor),
                joinedload(Team.members).joinedload(TeamMember.student).joinedload(Student.user),
                joinedload(Team.project)
            )
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    async def get_department_students_count(self, dept_id: UUID) -> int:
        stmt = select(Student).join(User, Student.user_id == User.id).where(User.department_id == dept_id)
        res = await self.db.execute(stmt)
        return len(res.scalars().all())

    # --- ADMIN ---
    async def get_all_users_paginated(
        self,
        role_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[User], int]:
        stmt = select(User).options(
            joinedload(User.roles),
            joinedload(User.department),
            joinedload(User.student)
        )

        if search_query:
            q = f"%{search_query.strip()}%"
            stmt = stmt.where(User.name.ilike(q) | User.email.ilike(q))

        res = await self.db.execute(stmt)
        all_users = list(res.unique().scalars().all())

        if role_filter:
            r_filt = role_filter.lower()
            all_users = [u for u in all_users if any(r.name.lower() == r_filt for r in u.roles)]

        total_count = len(all_users)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_users = all_users[start:end]

        return paginated_users, total_count
