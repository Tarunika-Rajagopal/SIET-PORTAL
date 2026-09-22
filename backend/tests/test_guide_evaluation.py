import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_guide_submission_evaluation_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        from database import init_db
        from main import seed_initial_data
        await init_db()
        await seed_initial_data()

        # 1. Guide Login
        g_login = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "dr.manimegalai@siet.ac.in",
            "password": "guide@123"
        })
        assert g_login.status_code == 200
        g_token = g_login.json()["token"]
        g_headers = {"Authorization": f"Bearer {g_token}"}

        # 2. Get Weekly Submissions
        res = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
        assert res.status_code == 200
        submissions = res.json()
        assert len(submissions) > 0

        target = submissions[0]
        member_marks = {
            "714023104112": 88,
            "714023104178": 90,
            "714023104189": 86,
            "714023104066": 92
        }

        # 3. Evaluate target submission with marks
        rev_res = await ac.post(
            f"/api/v1/guide/submissions/{target['id']}/review",
            json={
                "status": "APPROVED",
                "comments": "Great work on dataset preprocessing and verification.",
                "memberMarks": member_marks,
                "score": 89.0,
                "gradedBy": "Dr. P. Manimegalai"
            },
            headers=g_headers
        )
        assert rev_res.status_code == 200, f"Review submission failed: {rev_res.status_code} - {rev_res.text}"
        rev_data = rev_res.json()
        assert rev_data["success"] is True
        assert rev_data["status"] == "Approved"

        # 4. Verify GET /api/v1/guide/submissions/weekly returns updated status and marks
        res_after = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
        assert res_after.status_code == 200
        target_after = next((s for s in res_after.json() if s["id"] == target["id"]), None)
        assert target_after is not None
        assert target_after["status"] == "Approved"
        assert target_after["evaluationStatus"] == "Approved"
        assert target_after["score"] == 89.0
        assert "714023104112" in target_after["memberMarks"]
        assert target_after["memberMarks"]["714023104112"] == 88.0

        # 5. Verify GET /api/v1/marks/{team_id}/weekly returns the saved marks to Guide
        marks_res = await ac.get(f"/api/v1/marks/{target['teamId']}/weekly/{target['weekNumber']}", headers=g_headers)
        assert marks_res.status_code == 200
        marks_data = marks_res.json()
        assert marks_data["teamAverage"] == 89.0
        assert marks_data["memberMarks"]["714023104112"] == 88.0

        # 6. Test team review endpoint: POST /api/v1/guide/teams/{team_id}/submissions/{week}/review
        team_rev_res = await ac.post(
            f"/api/v1/guide/teams/{target['teamId']}/submissions/{target['weekNumber']}/review",
            json={
                "status": "APPROVED",
                "comments": "Milestone verified and complete.",
                "memberMarks": member_marks,
                "score": 90.0,
                "gradedBy": "Dr. P. Manimegalai"
            },
            headers=g_headers
        )
        assert team_rev_res.status_code == 200
        assert team_rev_res.json()["success"] is True
