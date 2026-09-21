"""Unit and integration tests for Repositories and Services in SIET-PORTAL backend."""
import os
import sys
from pathlib import Path
import uuid
import pytest

# Ensure backend and backend/app are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

os.environ["USE_SQLITE"] = "true"

from fastapi import HTTPException
from database import init_db, async_session
from main import seed_initial_data
from models import User, Team, Student, WeeklySubmission, WeeklyMark
from schemas import (
    LoginRequest,
    UpdateTitleRequest,
    TitleApprovalRequest,
    ReviewSubmissionRequest,
)

from repositories.user_repository import UserRepository
from repositories.student_repository import StudentRepository
from repositories.faculty_repository import FacultyRepository
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from repositories.marks_repository import MarksRepository
from repositories.project_repository import ProjectRepository
from repositories.audit_repository import AuditRepository

from services.auth_service import AuthService
from services.student_service import StudentService
from services.guide_service import GuideService
from services.project_service import ProjectService
from services.advisor_service import AdvisorService
from services.marks_service import MarksService


@pytest.mark.asyncio
async def test_repositories_and_services():
    await init_db()
    await seed_initial_data()

    async with async_session() as db:
        user_repo = UserRepository(db)
        student_repo = StudentRepository(db)
        team_repo = TeamRepository(db)
        sub_repo = SubmissionRepository(db)
        marks_repo = MarksRepository(db)
        proj_repo = ProjectRepository(db)

        # ─── 1. USER REPOSITORY TESTS ────────────────────────────────
        admin_user = await user_repo.get_by_email("admin@siet.ac.in")
        assert admin_user is not None
        assert admin_user.role == "admin"

        student_user = await user_repo.get_by_email_or_roll("714023104112")
        assert student_user is not None
        assert student_user.name == "Tarunika Rajgopal"

        guides = await user_repo.list_by_role("guide")
        assert len(guides) >= 1

        # ─── 2. STUDENT REPOSITORY TESTS ─────────────────────────────
        student = await student_repo.get_by_roll_no("714023104112")
        assert student is not None
        assert student.email == "student@srishakthi.ac.in"

        cseb_students = await student_repo.list_by_class_section("CSE-B")
        assert len(cseb_students) >= 4

        # ─── 3. TEAM REPOSITORY TESTS ────────────────────────────────
        team = await team_repo.get_by_team_id_string("TEAM-CSE-Y3-B04")
        assert team is not None
        assert team.team_no == "Team 04"

        guide_teams = await team_repo.list_by_guide(
            guide_email="dr.manimegalai@siet.ac.in",
            guide_name="Dr. P. Manimegalai",
        )
        assert len(guide_teams) >= 1
        assert any(t.team_id == "TEAM-CSE-Y3-B04" for t in guide_teams)

        member_team = await team_repo.get_team_by_member_roll_no("714023104112")
        assert member_team is not None
        assert member_team.team_id == "TEAM-CSE-Y3-B04"

        # ─── 4. SUBMISSION REPOSITORY TESTS ──────────────────────────
        team_subs = await sub_repo.list_by_team(team.id)
        assert len(team_subs) >= 4

        sub_count = await sub_repo.count_by_teams([team.id])
        assert sub_count >= 4

        # ─── 5. MARKS SERVICE & REPOSITORY TESTS ─────────────────────
        marks_service = MarksService(db)
        save_res = await marks_service.save_weekly_marks(
            team_id="TEAM-CSE-Y3-B04",
            week_number=1,
            member_marks={"714023104112": 9.5},
            remarks="Excellent progress",
        )
        assert save_res["success"] is True

        mark_w1 = await marks_repo.get_weekly_mark(team.id, 1)
        assert mark_w1 is not None
        assert mark_w1.team_average is not None

        # ─── 6. AUTH SERVICE TESTS ───────────────────────────────────
        auth_service = AuthService(db)
        # Valid login
        auth_user = await auth_service.authenticate("admin@siet.ac.in", "admin@123")
        assert auth_user is not None
        assert auth_user.email == "admin@siet.ac.in"

        # Invalid login
        bad_user = await auth_service.authenticate("admin@siet.ac.in", "wrongpassword")
        assert bad_user is None

        # Full login response
        login_res = await auth_service.login(
            LoginRequest(emailOrRoll="admin@siet.ac.in", password="admin@123")
        )
        assert login_res.success is True
        assert bool(login_res.token) is True
        assert login_res.user["role"] == "admin"

        # ─── 7. STUDENT SERVICE TESTS & DATA ISOLATION ────────────────
        student_service = StudentService(db)
        student_team_data = await student_service.get_team(student_user)
        assert student_team_data["teamId"] == "TEAM-CSE-Y3-B04"

        # Unassigned student must receive 404 (No fallback to Team B04)
        unassigned_user = User(
            id=uuid.uuid4(),
            email="unassigned@srishakthi.ac.in",
            name="Unassigned Student",
            role="student",
            team_id=None,
            team_no=None,
            roll_no="999999999",
        )
        with pytest.raises(HTTPException) as exc_info:
            await student_service.get_team(unassigned_user)
        assert exc_info.value.status_code == 404

        # ─── 8. GUIDE SERVICE TESTS & ISOLATION ───────────────────────
        guide_service = GuideService(db)
        assigned_guide = await user_repo.get_by_email("dr.manimegalai@siet.ac.in")
        guide_teams_res = await guide_service.get_guide_teams(assigned_guide)
        assert len(guide_teams_res) >= 1

        # Unassigned guide must receive empty list (No fallback to all teams)
        unrelated_guide = User(
            id=uuid.uuid4(),
            email="unrelated.guide@siet.ac.in",
            name="Dr. Unrelated",
            role="guide",
        )
        unrelated_teams = await guide_service.get_guide_teams(unrelated_guide)
        assert unrelated_teams == []

        # Guide unauthorized review check
        first_sub = team_subs[0]
        with pytest.raises(HTTPException) as exc_info:
            await guide_service.review_submission(
                submission_id=str(first_sub.id),
                req=ReviewSubmissionRequest(status="Approved", comments="Good", score=9.0),
                user=unrelated_guide,
            )
        assert exc_info.value.status_code == 403

        # ─── 9. PROJECT SERVICE TESTS ────────────────────────────────
        proj_service = ProjectService(db)
        # Student updating title of their own team -> success
        title_res = await proj_service.update_project_title(
            team_id="TEAM-CSE-Y3-B04",
            req=UpdateTitleRequest(title="Smart AI Irrigation System"),
            current_user=student_user,
        )
        assert title_res["success"] is True
        assert title_res["title"] == "Smart AI Irrigation System"

        # Student updating title of another team -> 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await proj_service.update_project_title(
                team_id="TEAM-CSE-Y3-B01",
                req=UpdateTitleRequest(title="Hacked Title"),
                current_user=student_user,
            )
        assert exc_info.value.status_code in (403, 404)

        # ─── 10. MARKS SERVICE TESTS ─────────────────────────────────
        marks_service = MarksService(db)
        # Student viewing their own marks -> success
        own_marks = await marks_service.get_weekly_marks(
            team_id="TEAM-CSE-Y3-B04",
            week_number=1,
            user=student_user,
        )
        assert own_marks["weekNumber"] == 1

        # Unauthorized student viewing another team's marks -> 403 Forbidden
        rand_suffix = uuid.uuid4().hex[:6]
        other_team = Team(
            id=uuid.uuid4(),
            team_id=f"TEAM-CSE-Y3-B99-{rand_suffix}",
            team_no=f"Team B99-{rand_suffix}",
            class_name="CSE-B",
            batch="2023-2027 (III Year)",
        )
        db.add(other_team)
        await db.commit()

        with pytest.raises(HTTPException) as exc_info:
            marks_service.check_team_access(other_team, student_user)
        assert exc_info.value.status_code == 403
