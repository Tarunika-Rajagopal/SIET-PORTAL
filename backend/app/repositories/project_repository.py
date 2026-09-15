from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.projects import Project, ProjectTitleHistory
from app.models.users import User

class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_project_by_id(self, project_id: UUID) -> Optional[Project]:
        stmt = (
            select(Project)
            .where(Project.id == project_id)
            .options(
                joinedload(Project.team),
                joinedload(Project.title_history).joinedload(ProjectTitleHistory.changed_by)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_project_by_team_id(self, team_id: UUID) -> Optional[Project]:
        stmt = (
            select(Project)
            .where(Project.team_id == team_id)
            .options(
                joinedload(Project.team),
                joinedload(Project.title_history).joinedload(ProjectTitleHistory.changed_by)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def create_project(self, team_id: UUID, title: Optional[str] = None, abstract: Optional[str] = None) -> Project:
        project = Project(
            team_id=team_id,
            title=title,
            submitted_title=title,
            abstract=abstract,
            status="PENDING",
            guide_approval_status="Pending Review"
        )
        self.db.add(project)
        await self.db.flush()
        return project

    async def add_title_history(
        self,
        project_id: UUID,
        previous_title: Optional[str],
        new_title: str,
        changed_by_id: UUID,
        comments: Optional[str] = None
    ) -> ProjectTitleHistory:
        history = ProjectTitleHistory(
            project_id=project_id,
            previous_title=previous_title,
            new_title=new_title,
            changed_by_id=changed_by_id,
            comments=comments
        )
        self.db.add(history)
        await self.db.flush()
        return history

    async def get_title_history(self, project_id: UUID) -> List[ProjectTitleHistory]:
        stmt = (
            select(ProjectTitleHistory)
            .where(ProjectTitleHistory.project_id == project_id)
            .options(joinedload(ProjectTitleHistory.changed_by))
            .order_by(ProjectTitleHistory.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())
