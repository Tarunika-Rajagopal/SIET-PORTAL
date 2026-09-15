from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.evaluation_repository import EvaluationRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.audit_notification_repository import AuditNotificationRepository
from app.schemas.evaluations import (
    EvaluationCreate, EvaluationResponse, CriteriaScoreResponse,
    RevisionRequestCreate, RevisionRequestResponse
)
from app.exceptions.custom import NotFoundException, BadRequestException, ForbiddenException
from app.models.evaluations import ReviewEvaluation, RevisionRequest
from app.models.users import User

class EvaluationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.eval_repo = EvaluationRepository(db)
        self.team_repo = TeamRepository(db)
        self.sub_repo = SubmissionRepository(db)
        self.audit_repo = AuditNotificationRepository(db)

    def _build_evaluation_response(self, eval_rec: ReviewEvaluation) -> EvaluationResponse:
        criteria_resps = [
            CriteriaScoreResponse(
                id=c.id,
                criteria_title=c.criteria_title,
                description=c.description,
                max_marks=c.max_marks,
                awarded_marks=c.awarded_marks,
                feedback=c.feedback
            )
            for c in eval_rec.criteria_scores
        ]

        return EvaluationResponse(
            id=eval_rec.id,
            team_id=eval_rec.team_id,
            review_number=eval_rec.review_number,
            review_title=eval_rec.review_title,
            evaluator_name=eval_rec.evaluated_by.name if eval_rec.evaluated_by else "Faculty Evaluator",
            status=eval_rec.status,
            total_score=eval_rec.total_score,
            max_total=eval_rec.max_total,
            guide_feedback=eval_rec.guide_feedback,
            created_at=eval_rec.created_at,
            criteria=criteria_resps
        )

    async def create_evaluation(self, team_id: UUID, data: EvaluationCreate, evaluator: User) -> EvaluationResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        roles = [r.name.lower() for r in evaluator.roles]
        if "admin" not in roles and "hod" not in roles and "advisor" not in roles:
            if team.guide_id != evaluator.id:
                raise ForbiddenException("Access denied. You can only evaluate teams assigned to you.")

        if not data.criteria or len(data.criteria) == 0:
            raise BadRequestException("Evaluation must include at least one rubric criterion.")

        # Server-side marks calculation and validation
        total_score = 0
        max_total = 0
        for crit in data.criteria:
            if crit.awarded_marks < 0:
                raise BadRequestException(f"Awarded marks cannot be negative for '{crit.criteria_title}'.")
            if crit.awarded_marks > crit.max_marks:
                raise BadRequestException(f"Awarded marks ({crit.awarded_marks}) cannot exceed maximum marks ({crit.max_marks}) for '{crit.criteria_title}'.")
            total_score += crit.awarded_marks
            max_total += crit.max_marks

        eval_rec = await self.eval_repo.create_evaluation(
            team_id=team.id,
            review_number=data.review_number,
            review_title=data.review_title or "Project Review Evaluation",
            evaluated_by_id=evaluator.id,
            status=data.status or "APPROVED",
            total_score=total_score,
            max_total=max_total,
            guide_feedback=data.guide_feedback
        )

        for crit in data.criteria:
            await self.eval_repo.add_criteria_score(
                evaluation_id=eval_rec.id,
                criteria_title=crit.criteria_title,
                description=crit.description,
                max_marks=crit.max_marks,
                awarded_marks=crit.awarded_marks,
                feedback=crit.feedback
            )

        # Audit log & notification
        await self.audit_repo.create_audit_log(
            user_id=evaluator.id,
            action_type="EVALUATION_SUBMITTED",
            target=f"Team {team.team_no}",
            details=f"Evaluated {data.review_number} with total score {total_score}/{max_total}"
        )

        await self.audit_repo.create_notification(
            team_id=team.id,
            title=f"{data.review_number} Evaluated",
            message=f"Evaluation submitted for {data.review_number}. Total score: {total_score}/{max_total}.",
            notification_type="SUCCESS"
        )

        await self.db.commit()
        refreshed = await self.eval_repo.get_evaluation_by_id(eval_rec.id)
        return self._build_evaluation_response(refreshed)

    async def get_team_evaluations(self, team_id: UUID, user: User) -> List[EvaluationResponse]:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        roles = [r.name.lower() for r in user.roles]
        if "student" in roles and "admin" not in roles and "guide" not in roles and "advisor" not in roles and "hod" not in roles:
            st_team = await self.team_repo.get_team_by_student_user_id(user.id)
            if not st_team or st_team.id != team_id:
                raise ForbiddenException("Access denied to another team's evaluations.")

        evals = await self.eval_repo.get_evaluations_by_team_id(team_id)
        return [self._build_evaluation_response(e) for e in evals]

    async def get_student_marks(self, student_user: User) -> List[EvaluationResponse]:
        team = await self.team_repo.get_team_by_student_user_id(student_user.id)
        if not team:
            raise NotFoundException("You are not currently assigned to any team.")

        evals = await self.eval_repo.get_evaluations_by_team_id(team.id)
        return [self._build_evaluation_response(e) for e in evals]

    async def request_revision(self, team_id: UUID, data: RevisionRequestCreate, user: User) -> RevisionRequestResponse:
        team = await self.team_repo.get_team_by_id(team_id)
        if not team:
            raise NotFoundException(f"Team ID '{team_id}' not found")

        roles = [r.name.lower() for r in user.roles]
        if "admin" not in roles and "hod" not in roles and "advisor" not in roles:
            if team.guide_id != user.id:
                raise ForbiddenException("Access denied. Only the assigned guide can request revisions.")

        rev = await self.eval_repo.create_revision_request(
            team_id=team.id,
            submission_id=data.submission_id,
            requested_by_id=user.id,
            reason=data.reason.strip()
        )

        if data.submission_id:
            sub = await self.sub_repo.get_submission_by_id(data.submission_id)
            if sub and sub.team_id == team.id:
                sub.status = "REVISION_REQUESTED"

        await self.audit_repo.create_notification(
            team_id=team.id,
            title="Revision Requested",
            message=f"Revision requested by {user.name}: {data.reason}",
            notification_type="WARNING"
        )

        await self.db.commit()
        return RevisionRequestResponse(
            id=rev.id,
            team_id=rev.team_id,
            submission_id=rev.submission_id,
            requested_by_name=user.name,
            reason=rev.reason,
            status=rev.status,
            created_at=rev.created_at
        )
