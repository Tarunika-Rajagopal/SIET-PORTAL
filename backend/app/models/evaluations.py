import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class ReviewEvaluation(Base):
    __tablename__ = "review_evaluations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    review_number: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Review 1", "Zeroth Review"
    review_title: Mapped[str] = mapped_column(String(150), nullable=False)  # e.g. "Zeroth Review - Title & Architecture"
    evaluated_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="APPROVED", nullable=False) # APPROVED, REVISION_REQUIRED
    total_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_total: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    guide_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    team: Mapped["Team"] = relationship("Team")
    evaluated_by: Mapped["User"] = relationship("User")
    criteria_scores: Mapped[List["RubricCriteriaScore"]] = relationship("RubricCriteriaScore", back_populates="evaluation", cascade="all, delete-orphan")


class RubricCriteriaScore(Base):
    __tablename__ = "rubric_criteria_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("review_evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    criteria_title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    awarded_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    evaluation: Mapped["ReviewEvaluation"] = relationship("ReviewEvaluation", back_populates="criteria_scores")


class RevisionRequest(Base):
    __tablename__ = "revision_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("weekly_submissions.id", ondelete="SET NULL"), nullable=True)
    requested_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False) # PENDING, RESOLVED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    team: Mapped["Team"] = relationship("Team")
    requested_by: Mapped["User"] = relationship("User")
