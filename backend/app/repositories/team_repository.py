from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.teams import Team, TeamMember
from app.models.faculty_student import Student, Faculty
from app.models.users import User

class TeamRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_team_by_id(self, team_id: UUID) -> Optional[Team]:
        stmt = (
            select(Team)
            .where(Team.id == team_id)
            .options(
                joinedload(Team.batch),
                joinedload(Team.section),
                joinedload(Team.guide),
                joinedload(Team.advisor),
                joinedload(Team.members).joinedload(TeamMember.student).joinedload(Student.user),
                joinedload(Team.project)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_team_by_student_user_id(self, user_id: UUID) -> Optional[Team]:
        # First get student_id
        stmt_st = select(Student).where(Student.user_id == user_id)
        res_st = await self.db.execute(stmt_st)
        student = res_st.scalars().first()
        if not student:
            return None

        stmt_tm = (
            select(TeamMember)
            .where(TeamMember.student_id == student.id)
            .options(
                joinedload(TeamMember.team).joinedload(Team.batch),
                joinedload(TeamMember.team).joinedload(Team.section),
                joinedload(TeamMember.team).joinedload(Team.guide),
                joinedload(TeamMember.team).joinedload(Team.advisor),
                joinedload(TeamMember.team).joinedload(Team.members).joinedload(TeamMember.student).joinedload(Student.user),
                joinedload(TeamMember.team).joinedload(Team.project)
            )
        )
        res_tm = await self.db.execute(stmt_tm)
        tm = res_tm.unique().scalars().first()
        return tm.team if tm else None

    async def get_all_teams(
        self,
        batch_id: Optional[UUID] = None,
        section_id: Optional[UUID] = None,
        guide_id: Optional[UUID] = None
    ) -> List[Team]:
        stmt = (
            select(Team)
            .options(
                joinedload(Team.batch),
                joinedload(Team.section),
                joinedload(Team.guide),
                joinedload(Team.advisor),
                joinedload(Team.members).joinedload(TeamMember.student).joinedload(Student.user),
                joinedload(Team.project)
            )
        )
        if batch_id:
            stmt = stmt.where(Team.batch_id == batch_id)
        if section_id:
            stmt = stmt.where(Team.section_id == section_id)
        if guide_id:
            stmt = stmt.where(Team.guide_id == guide_id)

        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())

    async def get_count_active_teams_by_guide(self, guide_user_id: UUID) -> int:
        stmt = select(Team).where(Team.guide_id == guide_user_id)
        result = await self.db.execute(stmt)
        return len(result.unique().scalars().all())

    async def get_faculty_for_update(self, guide_user_id: UUID) -> Optional[Faculty]:
        stmt = select(Faculty).where(Faculty.user_id == guide_user_id).with_for_update()
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create_team(
        self,
        team_no: str,
        batch_id: UUID,
        section_id: UUID,
        advisor_id: Optional[UUID] = None
    ) -> Team:
        team = Team(
            team_no=team_no,
            batch_id=batch_id,
            section_id=section_id,
            advisor_id=advisor_id,
            status="In Progress",
            progress=0
        )
        self.db.add(team)
        await self.db.flush()
        return team

    async def add_team_member(self, team_id: UUID, student_id: UUID, member_role: str = "Team Member") -> TeamMember:
        tm = TeamMember(team_id=team_id, student_id=student_id, member_role=member_role)
        self.db.add(tm)
        await self.db.flush()
        return tm

    async def remove_team_member(self, team_id: UUID, student_id: UUID) -> bool:
        stmt = select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.student_id == student_id)
        res = await self.db.execute(stmt)
        tm = res.scalars().first()
        if tm:
            await self.db.delete(tm)
            await self.db.flush()
            return True
        return False

    async def assign_guide(self, team_id: UUID, guide_user_id: UUID) -> Team:
        team = await self.get_team_by_id(team_id)
        if team:
            team.guide_id = guide_user_id
            await self.db.flush()
        return team
