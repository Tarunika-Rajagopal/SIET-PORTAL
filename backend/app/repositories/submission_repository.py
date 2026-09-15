from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.submissions import WeeklySubmission, SubmissionFile

class SubmissionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_submission_by_id(self, submission_id: UUID) -> Optional[WeeklySubmission]:
        stmt = (
            select(WeeklySubmission)
            .where(WeeklySubmission.id == submission_id)
            .options(
                joinedload(WeeklySubmission.team),
                joinedload(WeeklySubmission.files)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_submission_by_team_and_week(self, team_id: UUID, week_number: int) -> Optional[WeeklySubmission]:
        stmt = (
            select(WeeklySubmission)
            .where(WeeklySubmission.team_id == team_id, WeeklySubmission.week_number == week_number)
            .options(
                joinedload(WeeklySubmission.team),
                joinedload(WeeklySubmission.files)
            )
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def get_submissions_by_team_id(self, team_id: UUID) -> List[WeeklySubmission]:
        stmt = (
            select(WeeklySubmission)
            .where(WeeklySubmission.team_id == team_id)
            .options(
                joinedload(WeeklySubmission.team),
                joinedload(WeeklySubmission.files)
            )
            .order_by(WeeklySubmission.week_number.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.unique().scalars().all())

    async def create_submission(
        self,
        team_id: UUID,
        week_number: int,
        title: str,
        due_date: Optional[str] = None,
        status: str = "DRAFT",
        problem_statement: Optional[str] = None,
        solution: Optional[str] = None,
        technology_used: Optional[str] = None,
        obstacles_faced: Optional[str] = None,
        abstract: Optional[str] = None,
        repo_url: Optional[str] = None,
        demo_url: Optional[str] = None
    ) -> WeeklySubmission:
        sub = WeeklySubmission(
            team_id=team_id,
            week_number=week_number,
            title=title,
            due_date=due_date,
            status=status,
            problem_statement=problem_statement,
            solution=solution,
            technology_used=technology_used,
            obstacles_faced=obstacles_faced,
            abstract=abstract,
            repo_url=repo_url,
            demo_url=demo_url
        )
        self.db.add(sub)
        await self.db.flush()
        return sub

    async def add_submission_file(
        self,
        submission_id: UUID,
        original_filename: str,
        storage_path: str,
        file_category: str,
        content_type: str,
        file_size: int,
        uploaded_by_id: UUID
    ) -> SubmissionFile:
        s_file = SubmissionFile(
            submission_id=submission_id,
            original_filename=original_filename,
            storage_path=storage_path,
            file_category=file_category,
            content_type=content_type,
            file_size=file_size,
            uploaded_by_id=uploaded_by_id
        )
        self.db.add(s_file)
        await self.db.flush()
        return s_file

    async def get_submission_file_by_id(self, file_id: UUID) -> Optional[SubmissionFile]:
        stmt = (
            select(SubmissionFile)
            .where(SubmissionFile.id == file_id)
            .options(joinedload(SubmissionFile.submission).joinedload(WeeklySubmission.team))
        )
        result = await self.db.execute(stmt)
        return result.unique().scalars().first()

    async def delete_submission_file(self, file_id: UUID) -> bool:
        file_rec = await self.get_submission_file_by_id(file_id)
        if file_rec:
            await self.db.delete(file_rec)
            await self.db.flush()
            return True
        return False
