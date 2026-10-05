"""End-to-End Guide Portal and Inter-Portal Connectivity Test Suite.

Verifies:
1. Guide authorization isolation: Guide A vs Guide B (substring and similar names rejected with 403).
2. Dual-role RBAC: "Advisor & Guide" compound role authorized for both Guide and Advisor routes.
3. Cache invalidation: Title updates and approvals invalidate guide, student, advisor, and hod caches.
4. Title lifecycle: Student updates title -> Guide sees it -> Guide approves -> Student sees approved.
5. Weekly review & marks lifecycle: Student submits -> Guide grades with individual marks -> Student sees marks & feedback.
"""
import os
import sys
import uuid
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

os.environ["USE_SQLITE"] = "true"

import pytest
from httpx import AsyncClient, ASGITransport
from main import app, seed_initial_data
from database import init_db, async_session
from models import User, Team, TeamMember, WeeklySubmission, RoleEnum, Faculty, FacultyRoleEnum
from auth.auth import hash_password, create_access_token
from services.cache_service import cache_service
from sqlalchemy import select, delete


@pytest.mark.asyncio
async def test_guide_authorization_isolation():
    """Verify that only the assigned guide can review a team's submissions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        await init_db()
        await seed_initial_data()

        async with async_session() as session:
            # Guide A (assigned to TEAM-CSE-Y3-B04)
            res_team = await session.execute(
                select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04")
            )
            team_b04 = res_team.scalar_one_or_none()
            assert team_b04 is not None

            # Get Guide A user
            res_ga = await session.execute(
                select(User).where(User.email == "dr.manimegalai@siet.ac.in")
            )
            guide_a = res_ga.scalar_one_or_none()
            assert guide_a is not None

            # Create or get Guide B with a name that is a substring of Guide A ("Mani" vs "Dr. P. Manimegalai")
            res_gb = await session.execute(
                select(User).where(User.email == "guide.b.impostor@siet.ac.in")
            )
            guide_b = res_gb.scalar_one_or_none()
            if not guide_b:
                guide_b = User(
                    id=uuid.uuid4(),
                    email="guide.b.impostor@siet.ac.in",
                    name="Mani",
                    password=hash_password("guide@123"),
                    role=RoleEnum.guide,
                    department="Computer Science and Engineering",
                )
                session.add(guide_b)
                await session.commit()

            token_guide_a = create_access_token(str(guide_a.id), "guide")
            token_guide_b = create_access_token(str(guide_b.id), "guide")

        headers_guide_a = {"Authorization": f"Bearer {token_guide_a}"}
        headers_guide_b = {"Authorization": f"Bearer {token_guide_b}"}

        try:
            # Impostor Guide B attempts to review team B04
            r_impostor = await ac.post(
                "/api/v1/guide/teams/TEAM-CSE-Y3-B04/submissions/1/review",
                json={
                    "status": "APPROVED",
                    "score": 95,
                    "comments": "Unauthorized review attempt",
                    "memberMarks": {"714023104112": 95},
                },
                headers=headers_guide_b,
            )
            assert r_impostor.status_code == 403, (
                f"Expected 403 Forbidden for unassigned guide with substring name, got {r_impostor.status_code}"
            )
            assert "not authorized" in r_impostor.json().get("detail", "").lower()

            # Legitimate Guide A reviews team B04
            r_legit = await ac.post(
                "/api/v1/guide/teams/TEAM-CSE-Y3-B04/submissions/1/review",
                json={
                    "status": "APPROVED",
                    "score": 90,
                    "comments": "Approved by legitimate guide",
                    "memberMarks": {"714023104112": 90},
                },
                headers=headers_guide_a,
            )
            assert r_legit.status_code == 200, (
                f"Expected 200 OK for assigned guide, got {r_legit.status_code}: {r_legit.text}"
            )
        finally:
            async with async_session() as session:
                await session.execute(delete(User).where(User.email == "guide.b.impostor@siet.ac.in"))
                await session.commit()


@pytest.mark.asyncio
async def test_compound_role_rbac():
    """Verify that a user with role 'Advisor & Guide' can access both Guide and Advisor endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        await init_db()

        async with async_session() as session:
            # Clean any previous record
            await session.execute(delete(Faculty).where(Faculty.email == "dual.faculty@siet.ac.in"))
            await session.execute(delete(User).where(User.email == "dual.faculty@siet.ac.in"))
            await session.commit()

            dual_user = User(
                id=uuid.uuid4(),
                email="dual.faculty@siet.ac.in",
                name="Dr. Dual Faculty",
                password=hash_password("faculty@123"),
                role=RoleEnum.advisor,
                department="Computer Science and Engineering",
            )
            session.add(dual_user)

            dual_fac = Faculty(
                id=uuid.uuid4(),
                user_id=dual_user.id,
                name="Dr. Dual Faculty",
                email="dual.faculty@siet.ac.in",
                designation="Associate Professor",
                role=FacultyRoleEnum.advisor_guide,
                advisor_class="CSE-TEST-ISOLATED",
            )
            session.add(dual_fac)
            await session.commit()
            token = create_access_token(str(dual_user.id), "advisor")

        headers = {"Authorization": f"Bearer {token}"}

        try:
            # Can access Guide dashboard
            r_guide_dash = await ac.get("/api/v1/guide/dashboard", headers=headers)
            assert r_guide_dash.status_code == 200, (
                f"Expected 200 for Advisor & Guide on /guide/dashboard, got {r_guide_dash.status_code}"
            )

            # Can access Guide teams
            r_guide_teams = await ac.get("/api/v1/guide/teams", headers=headers)
            assert r_guide_teams.status_code == 200, (
                f"Expected 200 for Advisor & Guide on /guide/teams, got {r_guide_teams.status_code}"
            )

            # Can access Advisor teams
            r_adv_teams = await ac.get("/api/v1/advisor/teams", headers=headers)
            assert r_adv_teams.status_code == 200, (
                f"Expected 200 for Advisor & Guide on /advisor/teams, got {r_adv_teams.status_code}"
            )
        finally:
            async with async_session() as session:
                await session.execute(delete(Faculty).where(Faculty.email == "dual.faculty@siet.ac.in"))
                await session.execute(delete(User).where(User.email == "dual.faculty@siet.ac.in"))
                await session.commit()


@pytest.mark.asyncio
async def test_cache_invalidation_on_title_updates():
    """Verify that project title update and approval invalidate all related cache prefixes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        await init_db()
        await seed_initial_data()

        async with async_session() as session:
            res_student = await session.execute(
                select(User).where(User.email == "student@srishakthi.ac.in")
            )
            student = res_student.scalar_one()

            res_guide = await session.execute(
                select(User).where(User.email == "dr.manimegalai@siet.ac.in")
            )
            guide = res_guide.scalar_one()

            token_student = create_access_token(str(student.id), "student")
            token_guide = create_access_token(str(guide.id), "guide")

        headers_student = {"Authorization": f"Bearer {token_student}"}
        headers_guide = {"Authorization": f"Bearer {token_guide}"}

        # Pre-seed cache entries across all portals
        await cache_service.set_json("cache:guide:test_key", {"data": "stale_guide"}, expire_seconds=60)
        await cache_service.set_json("cache:student:test_key", {"data": "stale_student"}, expire_seconds=60)
        await cache_service.set_json("cache:advisor:test_key", {"data": "stale_advisor"}, expire_seconds=60)
        await cache_service.set_json("cache:hod:test_key", {"data": "stale_hod"}, expire_seconds=60)

        # Verify they are cached
        assert await cache_service.get_json("cache:guide:test_key") is not None
        assert await cache_service.get_json("cache:advisor:test_key") is not None

        # Student updates project title
        r_update = await ac.put(
            "/api/v1/projects/team/TEAM-CSE-Y3-B04/title",
            json={"title": "AI Powered Agricultural Drone System"},
            headers=headers_student,
        )
        assert r_update.status_code == 200, f"Title update failed: {r_update.text}"

        # Verify all stale caches were cleared
        assert await cache_service.get_json("cache:guide:test_key") is None
        assert await cache_service.get_json("cache:student:test_key") is None
        assert await cache_service.get_json("cache:advisor:test_key") is None
        assert await cache_service.get_json("cache:hod:test_key") is None

        # Pre-seed again before Guide approval
        await cache_service.set_json("cache:guide:test_key2", {"data": "stale2"}, expire_seconds=60)
        assert await cache_service.get_json("cache:guide:test_key2") is not None

        # Guide approves the title
        r_approve = await ac.post(
            "/api/v1/projects/TEAM-CSE-Y3-B04/title-approval",
            json={"decision": "APPROVED", "remarks": "Approved with commendable scope."},
            headers=headers_guide,
        )
        assert r_approve.status_code == 200, f"Title approval failed: {r_approve.text}"

        # Verify caches invalidated after approval
        assert await cache_service.get_json("cache:guide:test_key2") is None


@pytest.mark.asyncio
async def test_end_to_end_title_and_weekly_lifecycle():
    """Complete lifecycle: Student updates -> Guide reviews -> Student reads backend state."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        await init_db()
        await seed_initial_data()

        async with async_session() as session:
            res_student = await session.execute(
                select(User).where(User.email == "student@srishakthi.ac.in")
            )
            student = res_student.scalar_one()

            res_guide = await session.execute(
                select(User).where(User.email == "dr.manimegalai@siet.ac.in")
            )
            guide = res_guide.scalar_one()

            token_student = create_access_token(str(student.id), "student")
            token_guide = create_access_token(str(guide.id), "guide")

        headers_student = {"Authorization": f"Bearer {token_student}"}
        headers_guide = {"Authorization": f"Bearer {token_guide}"}

        # 1. Student updates title
        new_title = "Edge-Optimized Drone Pest Detection System"
        r_title = await ac.put(
            "/api/v1/projects/team/TEAM-CSE-Y3-B04/title",
            json={"title": new_title},
            headers=headers_student,
        )
        assert r_title.status_code == 200

        # 2. Guide retrieves teams and verifies the student's submission is visible
        r_guide_teams = await ac.get("/api/v1/guide/teams", headers=headers_guide)
        assert r_guide_teams.status_code == 200
        guide_teams = r_guide_teams.json()
        target_team = next((t for t in guide_teams if t["teamId"] == "TEAM-CSE-Y3-B04"), None)
        assert target_team is not None
        assert target_team["projectTitle"] == new_title

        # 3. Guide evaluates Week 1 submission with individual marks
        r_eval = await ac.post(
            "/api/v1/guide/teams/TEAM-CSE-Y3-B04/submissions/1/review",
            json={
                "status": "APPROVED",
                "score": 95.0,
                "comments": "Excellent milestone progress and clear presentation.",
                "memberMarks": {
                    "714023104112": 95.0,
                },
                "gradedBy": "Dr. P. Manimegalai",
            },
            headers=headers_guide,
        )
        assert r_eval.status_code == 200
        assert r_eval.json()["score"] == 95.0

        # 4. Student queries backend for their team and submissions
        r_student_team = await ac.get("/api/v1/student/team", headers=headers_student)
        assert r_student_team.status_code == 200
        s_team_data = r_student_team.json()
        assert s_team_data["isTitleApproved"] is True
        assert s_team_data["guideApprovalStatus"] == "Approved"

        r_student_subs = await ac.get("/api/v1/student/submissions", headers=headers_student)
        assert r_student_subs.status_code == 200
        subs_list = r_student_subs.json()
        sub1 = next((s for s in subs_list if s["week"] == 1), None)
        assert sub1 is not None
        assert sub1["status"] == "Approved"
        assert sub1["score"] == 95.0
        assert "Excellent milestone progress" in sub1["comments"]
