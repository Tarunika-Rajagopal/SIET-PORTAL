from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.evaluations import ReviewEvaluation, RubricCriteriaScore, RevisionRequest

class EvaluationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_evaluation_by_id(self, evaluation_id: UUID) -> Optional[ReviewEvaluation]:
        stmt = (
            select(ReviewEvaluation)
            .where(ReviewEvaluation.id == evaluation_id)
            .options(
                joinedload(ReviewEvaluation.criteria_scores),
                joinedload(ReviewEvaluation.evaluated_by),
                joinedload(ReviewEvaluation.team)
            )
        )
        res = await self.db.execute(stmt)
        return res.unique().scalars().first()

    async def get_evaluations_by_team_id(self, team_id: UUID) -> List[ReviewEvaluation]:
        stmt = (
            select(ReviewEvaluation)
            .where(ReviewEvaluation.team_id == team_id)
            .options(
                joinedload(ReviewEvaluation.criteria_scores),
                joinedload(ReviewEvaluation.evaluated_by)
            )
            .order_by(ReviewEvaluation.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())

    async def create_evaluation(
        self,
        team_id: UUID,
        review_number: str,
        review_title: str,
        evaluated_by_id: UUID,
        status: str,
        total_score: int,
        max_total: int,
        guide_feedback: Optional[str] = None
    ) -> ReviewEvaluation:
        eval_rec = ReviewEvaluation(
            team_id=team_id,
            review_number=review_number,
            review_title=review_title,
            evaluated_by_id=evaluated_by_id,
            status=status,
            total_score=total_score,
            max_total=max_total,
            guide_feedback=guide_feedback
        )
        self.db.add(eval_rec)
        await self.db.flush()
        return eval_rec

    async def add_criteria_score(
        self,
        evaluation_id: UUID,
        criteria_title: str,
        description: Optional[str],
        max_marks: int,
        awarded_marks: int,
        feedback: Optional[str] = None
    ) -> RubricCriteriaScore:
        score = RubricCriteriaScore(
            evaluation_id=evaluation_id,
            criteria_title=criteria_title,
            description=description,
            max_marks=max_marks,
            awarded_marks=awarded_marks,
            feedback=feedback
        )
        self.db.add(score)
        await self.db.flush()
        return score

    async def create_revision_request(
        self,
        team_id: UUID,
        requested_by_id: UUID,
        reason: str,
        submission_id: Optional[UUID] = None
    ) -> RevisionRequest:
        rev = RevisionRequest(
            team_id=team_id,
            submission_id=submission_id,
            requested_by_id=requested_by_id,
            reason=reason,
            status="PENDING"
        )
        self.db.add(rev)
        await self.db.flush()
        return rev

    async def get_revision_requests_by_team_id(self, team_id: UUID) -> List[RevisionRequest]:
        stmt = (
            select(RevisionRequest)
            .where(RevisionRequest.team_id == team_id)
            .options(joinedload(RevisionRequest.requested_by))
            .order_by(RevisionRequest.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return list(res.unique().scalars().all())
