"""Smoke tests for CI/CD integration.
Fast sanity check verifying core infrastructure: Health, Redis, DB, and Auth for all roles.
"""
import os
import sys
from pathlib import Path

# Force SQLite for fast, isolated CI/smoke testing
os.environ["USE_SQLITE"] = "true"

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db
from services.seed_service import seed_initial_data
from services.cache_service import cache_service

async def ensure_db():
    await init_db()
    await seed_initial_data()

@pytest.mark.asyncio
async def test_smoke_health():
    """Verify backend health and database connectivity."""
    await ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"

@pytest.mark.asyncio
async def test_smoke_redis_cache():
    """Verify Redis read/write and TTL invalidation cycle."""
    test_key = "smoke:ping:test"
    test_payload = {"service": "redis", "status": "active"}
    
    await cache_service.set_json(test_key, test_payload, expire_seconds=30)
    cached = await cache_service.get_json(test_key)
    assert cached == test_payload
    
    await cache_service.delete(test_key)
    deleted = await cache_service.get_json(test_key)
    assert deleted is None

@pytest.mark.asyncio
async def test_smoke_auth_all_roles():
    """Verify login and JWT token generation for all 5 portal roles."""
    await ensure_db()
    roles = {
        "student": ("student@srishakthi.ac.in", "student@123"),
        "guide": ("dr.manimegalai@siet.ac.in", "guide@123"),
        "advisor": ("dr.karthik@siet.ac.in", "faculty@123"),
        "hod": ("hod.cse@siet.ac.in", "hod@123"),
        "admin": ("admin@siet.ac.in", "admin@123"),
    }
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        for role, (email, pwd) in roles.items():
            res = await ac.post("/api/v1/auth/login", json={"emailOrRoll": email, "password": pwd})
            assert res.status_code == 200, f"Login failed for {role}: {res.text}"
            data = res.json()
            assert "token" in data and len(data["token"]) > 20
            assert data.get("success") is True

@pytest.mark.asyncio
async def test_smoke_core_portal_endpoints():
    """Verify high-frequency endpoints across portals return 200."""
    await ensure_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        # 1. Admin login & faculties
        admin_login = await ac.post("/api/v1/auth/login", json={"emailOrRoll": "admin@siet.ac.in", "password": "admin@123"})
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}
        r_admin = await ac.get("/api/v1/admin/faculties", headers=admin_headers)
        assert r_admin.status_code == 200

        # 2. HOD login & summary
        hod_login = await ac.post("/api/v1/auth/login", json={"emailOrRoll": "hod.cse@siet.ac.in", "password": "hod@123"})
        hod_headers = {"Authorization": f"Bearer {hod_login.json()['token']}"}
        r_hod = await ac.get("/api/v1/hod/weekly-submissions/summary", headers=hod_headers)
        assert r_hod.status_code == 200

        # 3. Student login & team
        stu_login = await ac.post("/api/v1/auth/login", json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"})
        stu_headers = {"Authorization": f"Bearer {stu_login.json()['token']}"}
        r_stu = await ac.get("/api/v1/student/team", headers=stu_headers)
        assert r_stu.status_code == 200
        r_releases = await ac.get("/api/v1/student/week-releases", headers=stu_headers)
        assert r_releases.status_code == 200
