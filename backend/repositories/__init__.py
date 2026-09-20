"""Repositories package for database entity access."""
from repositories.user_repository import UserRepository
from repositories.student_repository import StudentRepository
from repositories.faculty_repository import FacultyRepository
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from repositories.marks_repository import MarksRepository
from repositories.project_repository import ProjectRepository
from repositories.audit_repository import AuditRepository

__all__ = [
    "UserRepository",
    "StudentRepository",
    "FacultyRepository",
    "TeamRepository",
    "SubmissionRepository",
    "MarksRepository",
    "ProjectRepository",
    "AuditRepository",
]
