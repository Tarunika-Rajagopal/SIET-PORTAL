import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, Date, Numeric,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, validates
from database import Base
import enum


# ── Enums ──────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    student = "student"
    guide = "guide"
    advisor = "advisor"
    hod = "hod"
    admin = "admin"


class FacultyRoleEnum(str, enum.Enum):
    advisor = "Advisor"
    guide = "Guide"
    advisor_guide = "Advisor & Guide"
    none = "None"


class FacultyStatusEnum(str, enum.Enum):
    active = "Active"
    available = "Available"


class TeamStatusEnum(str, enum.Enum):
    in_progress = "In Progress"
    approved = "Approved"
    review_required = "Review Required"
    submitted = "Submitted"
    pending = "Pending"
    active_approved = "Active & Approved"
    under_review = "Under Review"


class SubmissionStatusEnum(str, enum.Enum):
    submitted = "Submitted"
    pending = "Pending"
    approved = "Approved"
    changes_requested = "Changes Requested"
    rejected = "Rejected"
    revision_required = "Revision Required"
    draft = "Draft"


class TitleApprovalStatusEnum(str, enum.Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"


class GuideApprovalStatusEnum(str, enum.Enum):
    approved = "Approved"
    pending_review = "Pending Review"
    pending = "Pending"
    revision_required = "Revision Required"
    rejected = "Rejected"


class ReviewStatusEnum(str, enum.Enum):
    completed = "Completed"
    upcoming = "Upcoming"


# ── Models ─────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False)
    roll_no = Column(String(50), unique=True, nullable=True, index=True)
    department = Column(String(255), default="Computer Science and Engineering")
    role = Column(SAEnum(RoleEnum, name="user_role", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=RoleEnum.student)
    active_role = Column(SAEnum(RoleEnum, name="user_role", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=True)
    designation = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    year = Column(String(50), nullable=True)
    batch = Column(String(100), nullable=True)
    class_name = Column(String(50), nullable=True)
    section = Column(String(10), nullable=True)
    year_semester = Column(String(100), nullable=True)
    team_id = Column(String(100), nullable=True)
    team_no = Column(String(50), nullable=True)
    project_title = Column(Text, nullable=True)
    guide_name = Column(String(255), nullable=True)
    advisor_name = Column(String(255), nullable=True)
    advisor_class = Column(String(50), nullable=True)
    advisor_batch = Column(String(100), nullable=True)
    initials = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @validates("role", "active_role")
    def validate_user_role(self, key, value):
        if isinstance(value, str):
            for member in RoleEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    designation = Column(String(255), nullable=False)
    role = Column(SAEnum(FacultyRoleEnum, name="faculty_role", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=FacultyRoleEnum.none)
    advisor_batch = Column(String(100), nullable=True)
    advisor_class = Column(String(50), nullable=True)
    specialization = Column(String(255), nullable=True)
    teams_count = Column(Integer, default=0)
    max_quota = Column(Integer, default=5)
    status = Column(SAEnum(FacultyStatusEnum, name="faculty_status", create_type=False, values_callable=lambda obj: [e.value for e in obj]), default=FacultyStatusEnum.active)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @validates("role")
    def validate_faculty_role(self, key, value):
        if isinstance(value, str):
            for member in FacultyRoleEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value

    @validates("status")
    def validate_faculty_status(self, key, value):
        if isinstance(value, str):
            for member in FacultyStatusEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value


class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    roll_no = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), default="student@123")
    batch = Column(String(100), default="2023-2027 (III Year)")
    class_section = Column(String(50), default="CSE-B")
    team_no = Column(String(50), default="Unassigned")
    project_title = Column(Text, default="")
    guide = Column(String(255), default="Unassigned")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    team_id = Column(Text, unique=True, nullable=False, index=True)
    team_no = Column(Text, nullable=False)
    class_name = Column(Text, nullable=False)
    batch = Column(Text, nullable=False)

    project_title = Column(Text, default="")

    guide_name = Column(Text, nullable=True)
    guide_email = Column(Text, nullable=True)
    guide_designation = Column(Text, nullable=True)
    guide_department = Column(Text, nullable=True)

    domain = Column(Text, nullable=True)

    advisor_name = Column(Text, nullable=True)
    advisor_email = Column(Text, nullable=True)

    status = Column(
        SAEnum(
            TeamStatusEnum,
            name="team_status",
            create_type=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=TeamStatusEnum.pending,
    )

    progress = Column(Integer, default=0)
    capacity = Column(Integer, default=4)
    members_count = Column(Integer, default=0)

    lead_student = Column(Text, nullable=True)
    lead_roll_no = Column(Text, nullable=True)

    is_title_approved = Column(Boolean, default=False)

    guide_approval_status = Column(
        SAEnum(
            GuideApprovalStatusEnum,
            name="guide_approval_status",
            create_type=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        default=GuideApprovalStatusEnum.pending,
    )

    rejection_reason = Column(Text, nullable=True)
    submitted_title = Column(Text, nullable=True)

    problem_statement = Column(Text, default="")
    proposed_solution = Column(Text, default="")
    abstract = Column(Text, default="")

    repo_url = Column(Text, default="")
    demo_url = Column(Text, default="")

    last_modified = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


    @validates("status")
    def validate_team_status(self, key, value):
        if isinstance(value, str):
            for member in TeamStatusEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value

    @validates("guide_approval_status")
    def validate_guide_approval_status(self, key, value):
        if isinstance(value, str):
            for member in GuideApprovalStatusEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    submissions = relationship("WeeklySubmission", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    roll_no = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    is_lead = Column(Boolean, default=False)
    member_role = Column(String(50), default="Team Member")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="members")
    student = relationship("Student")


class WeeklySubmission(Base):
    __tablename__ = "weekly_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    week = Column(Integer, nullable=False)
    title = Column(String(255), default="")
    due_date = Column(String(50), nullable=True)
    status = Column(SAEnum(SubmissionStatusEnum, name="submission_status", create_type=False, values_callable=lambda obj: [e.value for e in obj]), default=SubmissionStatusEnum.pending)
    submission_date = Column(String(50), nullable=True)
    file_name = Column(String(500), nullable=True)
    file_size = Column(String(50), nullable=True)
    comments = Column(Text, nullable=True)
    score = Column(Numeric(5, 2), nullable=True)
    max_score = Column(Numeric(5, 2), nullable=True)
    project_title = Column(Text, nullable=True)
    problem_statement = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    technology_used = Column(Text, nullable=True)
    obstacles_faced = Column(Text, nullable=True)
    abstract = Column(Text, nullable=True)
    presentation_file = Column(String(500), nullable=True)
    pdf_file = Column(String(500), nullable=True)
    repo_url = Column(String(500), nullable=True)
    demo_url = Column(String(500), nullable=True)
    screenshot_file = Column(String(500), nullable=True)
    guide_name = Column(String(255), nullable=True)
    guide_review_date = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @validates("status")
    def validate_submission_status(self, key, value):
        if isinstance(value, str):
            for member in SubmissionStatusEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value

    team = relationship("Team", back_populates="submissions")


class GuideNotice(Base):
    __tablename__ = "guide_notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("weekly_submissions.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    timing = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    comment = Column(Text, nullable=True)
    date = Column(String(50), nullable=False)
    week_number = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ReviewScore(Base):
    __tablename__ = "review_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    review_number = Column(String(50), nullable=False)
    review_title = Column(String(255), nullable=False)
    date = Column(String(50), nullable=False)
    status = Column(SAEnum(ReviewStatusEnum, name="review_status_enum", create_type=False, values_callable=lambda obj: [e.value for e in obj]), default=ReviewStatusEnum.upcoming)
    total_score = Column(Numeric(6, 2), default=0)
    max_total = Column(Numeric(6, 2), default=0)
    guide_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @validates("status")
    def validate_review_status(self, key, value):
        if isinstance(value, str):
            for member in ReviewStatusEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("review_scores.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    max_marks = Column(Numeric(5, 2), default=0)
    awarded_marks = Column(Numeric(5, 2), default=0)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TitleApproval(Base):
    __tablename__ = "title_approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    team_no = Column(String(50), nullable=False)
    title = Column(Text, nullable=False)
    proposed_by = Column(String(255), nullable=False)
    submitted_on = Column(String(50), nullable=True)
    status = Column(SAEnum(TitleApprovalStatusEnum, name="title_approval_status", create_type=False, values_callable=lambda obj: [e.value for e in obj]), default=TitleApprovalStatusEnum.pending)
    category = Column(String(100), default="Project Title Proposal")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @validates("status")
    def validate_title_approval_status(self, key, value):
        if isinstance(value, str):
            for member in TitleApprovalStatusEnum:
                if member.value.lower() == value.strip().lower() or member.name.lower() == value.strip().lower():
                    return member
        return value


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    date = Column(String(50), nullable=False)
    sender = Column(String(255), nullable=False)
    tag = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    date_formatted = Column(String(100), nullable=False)
    date_key = Column(Date, nullable=False)
    month_key = Column(String(10), nullable=False)
    action_type = Column(String(255), nullable=False)
    target = Column(String(255), nullable=False)
    details = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    admin_email = Column(String(255), default="admin@siet.ac.in")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AdvisorHistory(Base):
    __tablename__ = "advisor_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    date = Column(Date, nullable=False)
    date_formatted = Column(String(100), nullable=False)
    role = Column(String(50), default="Class Advisor")
    actor_name = Column(String(255), nullable=False)
    action_type = Column(String(255), nullable=False)
    target = Column(String(255), nullable=False)
    details = Column(Text, nullable=False)
    class_section = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class HodHistory(Base):
    __tablename__ = "hod_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    date = Column(String(50), nullable=False)
    action_type = Column(String(255), nullable=False)
    target = Column(String(255), nullable=False)
    class_section = Column(String(50), nullable=False)
    batch = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    performed_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class WeeklyMark(Base):
    __tablename__ = "weekly_marks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    team_average = Column(Numeric(5, 1), default=0)
    remarks = Column(Text, nullable=True)
    graded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    graded_by = Column(String(255), default="Class Advisor")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    member_marks = relationship("WeeklyMemberMark", back_populates="weekly_mark", cascade="all, delete-orphan")


class WeeklyMemberMark(Base):
    __tablename__ = "weekly_member_marks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weekly_mark_id = Column(UUID(as_uuid=True), ForeignKey("weekly_marks.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=True)
    roll_no = Column(String(50), nullable=False)
    mark = Column(Numeric(5, 1), default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    weekly_mark = relationship("WeeklyMark", back_populates="member_marks")
    student = relationship("Student")


class Checklist(Base):
    __tablename__ = "checklists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), unique=True, nullable=False)
    title_approval = Column(Boolean, default=False)
    abstract_submission = Column(Boolean, default=False)
    literature_review = Column(Boolean, default=False)
    design_diagrams = Column(Boolean, default=False)
    prototype_ready = Column(Boolean, default=False)
    zeroth_review_done = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(255), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
