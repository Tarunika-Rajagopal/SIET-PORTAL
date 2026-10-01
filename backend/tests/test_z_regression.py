"""Zero-Regression & Fault-Tolerance Tests (Z-Tests) for SIET Portal.
Validates zero regressions on past critical bugs and system resilience:
- Z1: MultipleResultsFound regression prevention (duplicate TeamMember records)
- Z2: Redis outage & seamless in-memory fallback (zero crash when Redis drops)
- Z3: Strict RBAC privilege boundary enforcement (Zero-Trust cross-role security)
- Z4: Payload boundary, injection safety, and malformed request handling
"""
import os
import sys
import uuid
from pathlib import Path

# Force SQLite for test isolation
os.environ["USE_SQLITE"] = "true"

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db, async_session
from models import Team, TeamMember, Student
from services.seed_service import seed_initial_data
from services.cache_service import cache_service


async def setup_test_environment():
    await init_db()
    await seed_initial_data()


async def get_token(ac: AsyncClient, email: str, pwd: str) -> str:
    res = await ac.post("/api/v1/auth/login", json={"emailOrRoll": email, "password": pwd})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["token"]


@pytest.mark.asyncio
async def test_z1_multiple_team_members_regression():
    """Z1: Verify StudentService._find_team handles multiple TeamMember rows without 500.
    Regression test for MultipleResultsFound bug in SQLAlchemy scalar query.
    """
    await setup_test_environment()

    # Manually insert a duplicate TeamMember entry for the student
    async with async_session() as session:
        from sqlalchemy import select
        team_res = await session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))
        team = team_res.scalars().first()
        assert team is not None

        # Fetch existing member to get valid student_id
        mem_res = await session.execute(select(TeamMember).where(TeamMember.roll_no == "714023104112"))
        existing_mem = mem_res.scalars().first()
        student_id = existing_mem.student_id if existing_mem else uuid.uuid4()

        # Add duplicate team member mapping
        dup_member = TeamMember(
            id=uuid.uuid4(),
            team_id=team.id,
            student_id=student_id,
            roll_no="714023104112",
            name="Tarunika Rajgopal",
            email="student@srishakthi.ac.in",
            is_lead=False,
            member_role="Co-Lead",
        )
        session.add(dup_member)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        token = await get_token(ac, "student@srishakthi.ac.in", "student@123")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch team - must succeed with 200, not 500
        team_resp = await ac.get("/api/v1/student/team", headers=headers)
        assert team_resp.status_code == 200, f"Failed with {team_resp.status_code}: {team_resp.text}"
        data = team_resp.json()
        assert data.get("teamId") == "TEAM-CSE-Y3-B04"

        # 2. Fetch submissions - must succeed with 200
        subs_resp = await ac.get("/api/v1/student/submissions", headers=headers)
        assert subs_resp.status_code == 200, f"Failed with {subs_resp.status_code}: {subs_resp.text}"

        # 3. Fetch single week submission - must succeed with 200
        week_resp = await ac.get("/api/v1/student/submissions/1", headers=headers)
        assert week_resp.status_code == 200


@pytest.mark.asyncio
async def test_z2_redis_outage_resilience():
    """Z2: Verify system continues operating normally when Redis is completely unavailable.
    Fallback to in-memory TTL cache without API crashes or 500s.
    """
    await setup_test_environment()

    # Save original client and simulate complete Redis network failure
    original_client = cache_service.redis_client
    cache_service.redis_client = None

    try:
        # Verify fallback cache operations do not throw
        await cache_service.set_json("z2:test:key", {"status": "degraded"}, expire_seconds=60)
        fallback_val = await cache_service.get_json("z2:test:key")
        assert fallback_val == {"status": "degraded"}

        # Verify core portal endpoints still respond 200 OK during Redis outage
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
            # 1. Health endpoint still works
            health_res = await ac.get("/health")
            assert health_res.status_code == 200

            # 2. Student login & team fetch
            stu_token = await get_token(ac, "student@srishakthi.ac.in", "student@123")
            stu_res = await ac.get("/api/v1/student/team", headers={"Authorization": f"Bearer {stu_token}"})
            assert stu_res.status_code == 200

            # 3. Guide dashboard fetch
            guide_token = await get_token(ac, "dr.manimegalai@siet.ac.in", "guide@123")
            guide_res = await ac.get("/api/v1/guide/dashboard", headers={"Authorization": f"Bearer {guide_token}"})
            assert guide_res.status_code == 200

            # 4. HOD summary fetch
            hod_token = await get_token(ac, "hod.cse@siet.ac.in", "hod@123")
            hod_res = await ac.get("/api/v1/hod/weekly-submissions/summary", headers={"Authorization": f"Bearer {hod_token}"})
            assert hod_res.status_code == 200

    finally:
        # Restore original client
        cache_service.redis_client = original_client


@pytest.mark.asyncio
async def test_z3_rbac_cross_role_boundaries():
    """Z3: Verify Zero-Trust boundary security across portal roles.
    Unauthorized actions and privilege escalation attempts must be blocked with 401/403.
    """
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        stu_token = await get_token(ac, "student@srishakthi.ac.in", "student@123")
        guide_token = await get_token(ac, "dr.manimegalai@siet.ac.in", "guide@123")
        stu_headers = {"Authorization": f"Bearer {stu_token}"}
        guide_headers = {"Authorization": f"Bearer {guide_token}"}

        # 1. Student trying to access HOD route -> 403 Forbidden
        r1 = await ac.get("/api/v1/hod/weekly-submissions/summary", headers=stu_headers)
        assert r1.status_code in (401, 403), f"Expected 403 for student accessing HOD route, got {r1.status_code}"

        # 2. Student trying to access Admin route -> 403 Forbidden
        r2 = await ac.get("/api/v1/admin/faculties", headers=stu_headers)
        assert r2.status_code in (401, 403), f"Expected 403 for student accessing Admin route, got {r2.status_code}"

        # 3. Student trying to access Guide review endpoint -> 403 Forbidden
        fake_uuid = str(uuid.uuid4())
        r3 = await ac.post(
            f"/api/v1/guide/submissions/{fake_uuid}/review",
            json={"status": "APPROVED", "score": 100},
            headers=stu_headers,
        )
        assert r3.status_code in (401, 403), f"Expected 403 for student reviewing submission, got {r3.status_code}"

        # 4. Guide trying to access Admin route -> 403 Forbidden
        r4 = await ac.get("/api/v1/admin/faculties", headers=guide_headers)
        assert r4.status_code in (401, 403), f"Expected 403 for guide accessing Admin route, got {r4.status_code}"

        # 5. Missing token -> 401 Unauthorized
        r5 = await ac.get("/api/v1/student/team")
        assert r5.status_code == 401, f"Expected 401 for unauthenticated request, got {r5.status_code}"

        # 6. Malformed token -> 401 Unauthorized
        r6 = await ac.get("/api/v1/student/team", headers={"Authorization": "Bearer not-a-valid-token"})
        assert r6.status_code == 401, f"Expected 401 for invalid JWT, got {r6.status_code}"


@pytest.mark.asyncio
async def test_z4_payload_and_injection_safety():
    """Z4: Verify edge cases, boundary inputs, and injection attempts are safely handled."""
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        # 1. SQL Injection in auth login input
        sql_inject_res = await ac.post(
            "/api/v1/auth/login",
            json={"emailOrRoll": "' OR '1'='1' --", "password": "any"},
        )
        assert sql_inject_res.status_code == 401, "SQL injection attempt should fail with 401"

        # 2. Guide reviewing non-existent submission UUID -> 404, not 500
        guide_token = await get_token(ac, "dr.manimegalai@siet.ac.in", "guide@123")
        random_uuid = str(uuid.uuid4())
        not_found_res = await ac.post(
            f"/api/v1/guide/submissions/{random_uuid}/review",
            json={"status": "APPROVED", "score": 85.0},
            headers={"Authorization": f"Bearer {guide_token}"},
        )
        assert not_found_res.status_code in (404, 400), f"Expected 404/400 for unknown submission, got {not_found_res.status_code}"

        # 3. Invalid payload schema (missing required fields) -> 422 Unprocessable Entity
        invalid_body_res = await ac.post(
            "/api/v1/auth/login",
            json={"invalid_field": 123},
        )
        assert invalid_body_res.status_code == 422, "Malformed body should return 422"


@pytest.mark.asyncio
async def test_z5_advisor_removal_propagation_to_student():
    """Z5: Verify that when Admin removes or reassigns an advisor, the student portal
    immediately reflects 'advisorName': '' ('Not Assigned') across DB and Cache.
    """
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        admin_token = await get_token(ac, "admin@siet.ac.in", "admin@123")
        stu_token = await get_token(ac, "student@srishakthi.ac.in", "student@123")

        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        stu_headers = {"Authorization": f"Bearer {stu_token}"}

        # 1. Initially student has advisor
        initial_team = await ac.get("/api/v1/student/team", headers=stu_headers)
        assert initial_team.status_code == 200

        # 2. Admin removes advisor (Dr. Karthikeyan)
        reassign_res = await ac.post(
            "/api/v1/admin/reassign",
            json={"email_one": "dr.karthik@siet.ac.in"},
            headers=admin_headers,
        )
        assert reassign_res.status_code == 200

        # 3. Student immediately fetches team -> advisorName MUST be empty ('Not Assigned')
        updated_team = await ac.get("/api/v1/student/team", headers=stu_headers)
        assert updated_team.status_code == 200
        team_data = updated_team.json()
        assert team_data.get("advisorName") in ("", None), (
            f"Expected advisorName to be cleared, got '{team_data.get('advisorName')}'"
        )

