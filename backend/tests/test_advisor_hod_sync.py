import pytest
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

# Connect to Supabase PostgreSQL (defined in backend/.env) instead of local SQLite
os.environ["USE_SQLITE"] = "false"

from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db

@pytest.mark.asyncio
async def test_advisor_evaluation_sync_to_hod():
    # Initialize connection to Supabase database
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        # 1. Login as Class Advisor Dr. R. Karthikeyan on Supabase
        adv_login = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "dr.karthik@siet.ac.in",
            "password": "faculty@123"
        })
        assert adv_login.status_code == 200, f"Advisor login failed: {adv_login.text}"
        adv_token = adv_login.json()["token"]
        adv_headers = {"Authorization": f"Bearer {adv_token}"}

        # 2. Get Advisor's teams from Supabase
        adv_teams_res = await ac.get("/api/v1/advisor/teams", headers=adv_headers)
        assert adv_teams_res.status_code == 200, f"Advisor teams failed: {adv_teams_res.text}"
        adv_teams = adv_teams_res.json()
        assert len(adv_teams) > 0, "No advisor teams found in Supabase"
        target_team = adv_teams[0]
        team_id = target_team["id"]
        members = target_team.get("members", [])
        assert len(members) > 0, f"No members found for team {team_id}"

        # 3. Evaluate Week 2 with rubric criteria breakdown
        week = 2
        member_marks = {}
        for m in members:
            rno = m.get("rollNo") or m.get("roll_no")
            if rno:
                member_marks[rno] = {
                    "systemDesign": 4.5,
                    "presentationInteraction": 4.5,
                    "technicalSkills": 4.5,
                    "implementationProgress": 4.5,
                    "total": 18.0
                }

        marks_payload = {
            "memberMarks": member_marks,
            "remarks": "Solid progress evaluated by Class Advisor on Supabase",
            "gradedBy": "Class Advisor"
        }

        # Save marks via marks endpoint to Supabase
        save_res = await ac.post(f"/api/v1/marks/{team_id}/weekly/{week}", json=marks_payload, headers=adv_headers)
        assert save_res.status_code == 200, f"Save marks failed: {save_res.text}"

        try:
            # 4. Login as HOD Dr. N. Saravanan on Supabase
            hod_login = await ac.post("/api/v1/auth/login", json={
                "emailOrRoll": "hod.cse@siet.ac.in",
                "password": "hod@123"
            })
            assert hod_login.status_code == 200, f"HOD login failed: {hod_login.text}"
            hod_token = hod_login.json()["token"]
            hod_headers = {"Authorization": f"Bearer {hod_token}"}

            # 5. HOD queries GET /hod/teams from Supabase
            hod_teams_res = await ac.get("/api/v1/hod/teams", headers=hod_headers)
            assert hod_teams_res.status_code == 200
            hod_teams = hod_teams_res.json()
            hod_target_team = next((t for t in hod_teams if t["id"] == team_id or t.get("teamNo") == target_team.get("teamNo")), None)
            assert hod_target_team is not None, f"Target team {team_id} not found in HOD teams"

            # Verify Review 2 is marked completed
            reviews = hod_target_team.get("reviews", [])
            r2 = next((r for r in reviews if r.get("reviewNumber") == 2), {})
            assert r2.get("isCompleted") is True, f"Review 2 isCompleted expected True, got: {r2}"

            # Verify submissions list contains Week 2 with Approved status and correct evaluator
            subs = hod_target_team.get("submissions", [])
            w2_sub = next((s for s in subs if s.get("week") == week), None)
            assert w2_sub is not None, f"Week 2 submission missing in HOD submissions list: {subs}"
            assert w2_sub.get("status") == "Approved"
            assert w2_sub.get("isCompleted") is True
            assert w2_sub.get("score") == 18.0
            assert w2_sub.get("guideName") == "Class Advisor"

            # 6. HOD queries GET /hod/teams/{team_id}/submission/{week} (Detail on demand)
            detail_res = await ac.get(f"/api/v1/hod/teams/{team_id}/submission/{week}", headers=hod_headers)
            assert detail_res.status_code == 200, f"Detail endpoint returned {detail_res.status_code}: {detail_res.text}"
            detail = detail_res.json()
            assert detail.get("week") == week
            assert detail.get("score") == 18.0
            assert detail.get("status") == "Approved"
            assert detail.get("guideName") == "Class Advisor"
            assert "Solid progress evaluated by Class Advisor on Supabase" in detail.get("comments", "")
            assert len(detail.get("memberRubrics", [])) > 0 or len(detail.get("memberMarks", [])) > 0

            # 7. HOD queries GET /hod/submissions/weekly
            weekly_res = await ac.get("/api/v1/hod/submissions/weekly", headers=hod_headers)
            assert weekly_res.status_code == 200
            weekly_summary = weekly_res.json()
            assert len(weekly_summary) > 0
            w2_summary = next((ws for ws in weekly_summary if ws.get("week") == week or ws.get("weekNumber") == week), None)
            assert w2_summary is not None, "Week 2 missing in weekly summary"
            assert w2_summary.get("totalSubmissions", 0) > 0 or w2_summary.get("submittedCount", 0) > 0 or w2_summary.get("evaluatedCount", 0) > 0

            print("\n[SUCCESS] Verified advisor evaluation sync to HOD portal directly on Supabase PostgreSQL!")
        finally:
            # Clean up test marks on Supabase so database remains in pristine state
            await ac.delete(f"/api/v1/marks/{team_id}/weekly/{week}", headers=adv_headers)
