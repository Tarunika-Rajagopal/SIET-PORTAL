import pytest
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

os.environ["USE_SQLITE"] = "true"

from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db
from tests.test_fixtures import seed_test_data

@pytest.mark.asyncio
async def test_hod_teams_summary_and_detail():
    await init_db()
    await seed_test_data()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        # 1. Login as HOD
        login_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "hod.cse@siet.ac.in",
            "password": "hod@123"
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. GET /hod/teams (Summary)
        res = await ac.get("/api/v1/hod/teams", headers=headers)
        assert res.status_code == 200
        teams = res.json()
        assert len(teams) > 0

        # Check that teams summary does NOT have bloated text fields in its submissions
        t0 = next((t for t in teams if len(t.get("submissions", [])) > 0), None)
        assert t0 is not None
        s0 = t0["submissions"][0]
        assert "abstract" not in s0 or s0["abstract"] == ""
        assert "problemStatement" not in s0 or s0["problemStatement"] == ""
        assert "solution" not in s0 or s0["solution"] == ""
        # But essential summary fields ARE present:
        assert "week" in s0
        assert "title" in s0
        assert "status" in s0

        # 3. GET /hod/teams/{team_id}/submission/{week} (Detail on demand)
        team_id = t0["id"]
        week = s0["week"]
        detail_res = await ac.get(f"/api/v1/hod/teams/{team_id}/submission/{week}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["week"] == week
        assert "problemStatement" in detail
        assert "abstract" in detail
        assert "solution" in detail
        assert "technologyUsed" in detail
        print("[PASS] Successfully verified HOD teams summary and on-demand submission detail endpoint!")
