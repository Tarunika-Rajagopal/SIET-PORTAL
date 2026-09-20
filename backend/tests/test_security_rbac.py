"""Comprehensive Security, RBAC, and Isolation Test Suite for SIET-PORTAL Backend."""
import asyncio
import os
import sys
from pathlib import Path

# Ensure backend and backend/app are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

os.environ["USE_SQLITE"] = "true"

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db, async_session
from main import seed_initial_data
from models import User, Team, Faculty
from sqlalchemy import select
from auth.auth import hash_password, verify_password


@pytest.mark.asyncio
async def test_security_and_rbac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        await init_db()
        await seed_initial_data()

        # ─── 1. AUTHENTICATION BYPASS ELIMINATION (NO TOKEN) ───────────
        # Protected endpoints must strictly reject requests lacking a Bearer token
        endpoints_requiring_auth = [
            "/api/v1/student/team",
            "/api/v1/student/submissions",
            "/api/v1/admin/faculties",
            "/api/v1/admin/students",
            "/api/v1/advisor/teams",
            "/api/v1/guide/dashboard",
            "/api/v1/guide/teams",
            "/api/v1/hod/teams",
            "/api/v1/marks/TEAM-CSE-Y3-B04/weekly",
        ]

        for ep in endpoints_requiring_auth:
            r = await ac.get(ep)
            assert r.status_code == 401, f"Expected 401 without auth for {ep}, got {r.status_code}"
            assert "detail" in r.json()

        # Malformed & invalid token tests
        bad_token_headers = [
            {"Authorization": "Bearer not-a-valid-jwt-token"},
            {"Authorization": "Basic somecredentials"},
            {"Authorization": "Bearer "},
        ]
        for bh in bad_token_headers:
            r = await ac.get("/api/v1/student/team", headers=bh)
            assert r.status_code == 401, f"Expected 401 for malformed header {bh}, got {r.status_code}"

        # ─── 2. AUTHENTICATE ALL ROLES ─────────────────────────────────
        credentials = {
            "admin": ("admin@siet.ac.in", "admin@123"),
            "hod": ("hod.cse@siet.ac.in", "hod@123"),
            "advisor": ("dr.karthik@siet.ac.in", "faculty@123"),
            "guide": ("dr.manimegalai@siet.ac.in", "guide@123"),
            "student": ("student@srishakthi.ac.in", "student@123"),
        }
        tokens = {}
        headers = {}

        for role, (email, pwd) in credentials.items():
            res = await ac.post("/api/v1/auth/login", json={"emailOrRoll": email, "password": pwd})
            assert res.status_code == 200, f"Login failed for role {role}: {res.text}"
            tokens[role] = res.json()["token"]
            headers[role] = {"Authorization": f"Bearer {tokens[role]}"}

        # ─── 3. STRICT PASSWORD SECURITY & BCRYPT VERIFICATION ─────────
        # Invalid password must fail with 401
        bad_pwd_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "admin@siet.ac.in",
            "password": "wrongpassword"
        })
        assert bad_pwd_res.status_code == 401, "Expected 401 on wrong password"

        # Verify password hash function works properly
        test_hash = hash_password("test_secret")
        assert verify_password("test_secret", test_hash) is True
        assert verify_password("wrong_secret", test_hash) is False

        # ─── 4. ROLE-BASED ACCESS CONTROL (403 FORBIDDEN ENFORCEMENT) ─
        # Student attempting to access Admin endpoints
        r_admin_by_student = await ac.get("/api/v1/admin/faculties", headers=headers["student"])
        assert r_admin_by_student.status_code == 403, f"Expected 403, got {r_admin_by_student.status_code}"

        # Student attempting to access Advisor endpoints
        r_adv_by_student = await ac.get("/api/v1/advisor/teams", headers=headers["student"])
        assert r_adv_by_student.status_code == 403, f"Expected 403, got {r_adv_by_student.status_code}"

        # Student attempting to access Guide endpoints
        r_guide_by_student = await ac.get("/api/v1/guide/dashboard", headers=headers["student"])
        assert r_guide_by_student.status_code == 403, f"Expected 403, got {r_guide_by_student.status_code}"

        # Student attempting to access HOD endpoints
        r_hod_by_student = await ac.get("/api/v1/hod/teams", headers=headers["student"])
        assert r_hod_by_student.status_code == 403, f"Expected 403, got {r_hod_by_student.status_code}"

        # Guide attempting to access Admin endpoints
        r_admin_by_guide = await ac.get("/api/v1/admin/faculties", headers=headers["guide"])
        assert r_admin_by_guide.status_code == 403, f"Expected 403, got {r_admin_by_guide.status_code}"

        # Advisor attempting to access Admin endpoints
        r_admin_by_adv = await ac.get("/api/v1/admin/faculties", headers=headers["advisor"])
        assert r_admin_by_adv.status_code == 403, f"Expected 403, got {r_admin_by_adv.status_code}"

        # Student attempting to save marks
        r_save_marks_student = await ac.post("/api/v1/marks/TEAM-CSE-Y3-B04/weekly/1", json={
            "memberMarks": [],
            "remarks": "Self assigned",
        }, headers=headers["student"])
        assert r_save_marks_student.status_code == 403, f"Expected 403, got {r_save_marks_student.status_code}"

        # ─── 5. AUTHORIZED ROLE ACCESS (200 OK) ────────────────────────
        r_admin = await ac.get("/api/v1/admin/faculties", headers=headers["admin"])
        assert r_admin.status_code == 200

        r_advisor = await ac.get("/api/v1/advisor/teams", headers=headers["advisor"])
        assert r_advisor.status_code == 200

        r_guide = await ac.get("/api/v1/guide/dashboard", headers=headers["guide"])
        assert r_guide.status_code == 200

        r_hod = await ac.get("/api/v1/hod/teams", headers=headers["hod"])
        assert r_hod.status_code == 200

        r_student = await ac.get("/api/v1/student/team", headers=headers["student"])
        assert r_student.status_code == 200

        # ─── 6. FACULTY PROVISIONING & USER RECORD CREATION ────────────
        new_faculty_data = {
            "name": "Dr. Testing Provisioning",
            "email": "test.provision@siet.ac.in",
            "designation": "Assistant Professor",
            "role": "guide",
            "specialization": "Quantum Computing",
        }
        create_fac_res = await ac.post("/api/v1/admin/faculties", json=new_faculty_data, headers=headers["admin"])
        assert create_fac_res.status_code == 200, f"Create faculty failed: {create_fac_res.text}"
        created_fac_json = create_fac_res.json()
        faculty_id = created_fac_json.get("id")

        # Verify corresponding User was created in DB
        async with async_session() as db:
            user_rec = (await db.execute(select(User).where(User.email == "test.provision@siet.ac.in"))).scalar_one_or_none()
            assert user_rec is not None, "User record was not created for new faculty!"
            assert user_rec.role == "guide"
            assert user_rec.name == "Dr. Testing Provisioning"
            assert user_rec.password is not None
            assert user_rec.password.startswith("$2b$"), "Password was not hashed with bcrypt!"

        # Verify newly provisioned faculty can immediately log in
        fac_login = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "test.provision@siet.ac.in",
            "password": "faculty@123",
        })
        assert fac_login.status_code == 200, f"New faculty could not log in: {fac_login.text}"
        new_fac_token = fac_login.json()["token"]
        new_fac_headers = {"Authorization": f"Bearer {new_fac_token}"}

        # ─── 7. DATA ISOLATION: NO UNASSIGNED TEAM FALLBACKS ──────────
        # The new guide has NO teams assigned. Querying /teams should return empty list, NOT department teams!
        isolated_teams = await ac.get("/api/v1/guide/teams", headers=new_fac_headers)
        assert isolated_teams.status_code == 200
        assert isolated_teams.json() == [], "Guide without teams must receive empty list, not fallback to all teams!"

        isolated_dash = await ac.get("/api/v1/guide/dashboard", headers=new_fac_headers)
        assert isolated_dash.status_code == 200
        assert isolated_dash.json()["totalTeams"] == 0
        assert isolated_dash.json()["teams"] == []

        # Delete the test faculty and verify User cleanup
        del_fac = await ac.delete(f"/api/v1/admin/faculties/{faculty_id}", headers=headers["admin"])
        assert del_fac.status_code == 200
        async with async_session() as db:
            user_cleanup = (await db.execute(select(User).where(User.email == "test.provision@siet.ac.in"))).scalar_one_or_none()
            assert user_cleanup is None, "User record was not cleaned up upon faculty deletion!"

        # ─── 8. STUDENT DATA ISOLATION (NO TEAM-04 FALLBACK) ──────────
        # Create student without a team
        add_orphan_student = await ac.post("/api/v1/admin/students", json={
            "name": "Orphan Student",
            "rollNo": "714099999999",
            "email": "orphan@srishakthi.ac.in",
            "password": "student@123",
        }, headers=headers["admin"])
        assert add_orphan_student.status_code == 200

        orphan_login = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "orphan@srishakthi.ac.in",
            "password": "student@123",
        })
        assert orphan_login.status_code == 200
        orphan_token = orphan_login.json()["token"]
        orphan_headers = {"Authorization": f"Bearer {orphan_token}"}

        # Querying /api/v1/student/team must return 404, NOT fall back to Team 04!
        orphan_team_res = await ac.get("/api/v1/student/team", headers=orphan_headers)
        assert orphan_team_res.status_code == 404, f"Expected 404 for unassigned student, got {orphan_team_res.status_code}"

        # Clean up orphan student
        await ac.delete("/api/v1/admin/students/714099999999", headers=headers["admin"])


if __name__ == "__main__":
    asyncio.run(test_security_and_rbac())
    print("\n--- ALL SECURITY, RBAC & ISOLATION TESTS PASSED! ---")
