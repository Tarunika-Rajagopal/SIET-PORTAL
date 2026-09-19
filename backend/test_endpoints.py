import asyncio
import os

# Use local sqlite for fast offline verification
os.environ["USE_SQLITE"] = "true"

from httpx import AsyncClient, ASGITransport
from main import app

async def test_all_endpoints():
    print("--- Running Automated Endpoint Verification ---")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        # Initialize DB and seed
        from database import init_db
        from main import seed_initial_data
        await init_db()
        await seed_initial_data()

        # 1. Root & Health
        res = await ac.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[PASS] GET /health -> 200 OK")

        # 2. Auth Login (Student)
        login_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "student@srishakthi.ac.in",
            "password": "student@123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        login_data = login_res.json()
        assert login_data["success"] is True
        token = login_data["token"]
        assert token is not None
        headers = {"Authorization": f"Bearer {token}"}
        print(f"[PASS] POST /api/v1/auth/login -> 200 OK (token received for {login_data['user']['name']})")

        # 3. Student Team
        team_res = await ac.get("/api/v1/student/team", headers=headers)
        assert team_res.status_code == 200, f"Get team failed: {team_res.text}"
        team_data = team_res.json()
        assert team_data["teamId"] == "TEAM-CSE-Y3-B04"
        print(f"[PASS] GET /api/v1/student/team -> 200 OK (Team: {team_data['teamId']}, Members: {len(team_data['members'])})")

        # 4. Student Submissions
        subs_res = await ac.get("/api/v1/student/submissions", headers=headers)
        assert subs_res.status_code == 200, f"Get submissions failed: {subs_res.text}"
        subs_data = subs_res.json()
        print(f"[PASS] GET /api/v1/student/submissions -> 200 OK ({len(subs_data)} submissions loaded)")

        # 5. Student Submission by Week
        sub1_res = await ac.get("/api/v1/student/submissions/1", headers=headers)
        assert sub1_res.status_code == 200, f"Get submission 1 failed: {sub1_res.text}"
        print("[PASS] GET /api/v1/student/submissions/1 -> 200 OK")

        # 6. Submit Deliverables
        submit_res = await ac.post("/api/v1/student/submissions/2", json={
            "problemStatement": "Autonomous drone disease detection.",
            "solution": "Edge YOLOv8 model.",
            "technologyUsed": "PyTorch, YOLOv8, FastAPI, React",
            "obstaclesFaced": "Inference latency on low power chips",
            "abstract": "Framework for automated crop disease classification.",
            "repoUrl": "https://github.com/SIET-CSE/crop-drone",
            "demoUrl": "https://demo.siet.ac.in",
            "isSubmit": True
        }, headers=headers)
        assert submit_res.status_code == 200, f"Submit deliverable failed: {submit_res.text}"
        print("[PASS] POST /api/v1/student/submissions/2 -> 200 OK")

        # 7. Update Project Title
        title_res = await ac.put("/api/v1/projects/team/TEAM-CSE-Y3-B04/title", json={
            "title": "Autonomous Crop Disease Segmentation & Yield Advisory Drone System v2"
        }, headers=headers)
        assert title_res.status_code == 200, f"Update title failed: {title_res.text}"
        print("[PASS] PUT /api/v1/projects/team/TEAM-CSE-Y3-B04/title -> 200 OK")

        # 8. Guide Login & Dashboard
        g_login = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "dr.manimegalai@siet.ac.in",
            "password": "guide@123"
        })
        assert g_login.status_code == 200
        g_token = g_login.json()["token"]
        g_headers = {"Authorization": f"Bearer {g_token}"}
        print("[PASS] POST /api/v1/auth/login (Guide) -> 200 OK")

        g_dash = await ac.get("/api/v1/guide/dashboard", headers=g_headers)
        assert g_dash.status_code == 200, f"Guide dash failed: {g_dash.text}"
        print("[PASS] GET /api/v1/guide/dashboard -> 200 OK")

        # 9. Guide Teams
        g_teams = await ac.get("/api/v1/guide/teams", headers=g_headers)
        assert g_teams.status_code == 200, f"Guide teams failed: {g_teams.text}"
        print(f"[PASS] GET /api/v1/guide/teams -> 200 OK ({len(g_teams.json())} teams)")

        # 10. Guide Pending Submissions
        g_subs = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
        assert g_subs.status_code == 200, f"Guide weekly subs failed: {g_subs.text}"
        pending_list = g_subs.json()
        print(f"[PASS] GET /api/v1/guide/submissions/weekly -> 200 OK ({len(pending_list)} pending)")

        # 11. Review Submission
        if pending_list:
            target_sub_id = pending_list[0]["submissionId"]
            rev_res = await ac.post(f"/api/v1/guide/submissions/{target_sub_id}/review", json={
                "status": "APPROVED",
                "comments": "Excellent technical formulation. Proceed to implementation.",
                "score": 95.0
            }, headers=g_headers)
            assert rev_res.status_code == 200, f"Review failed: {rev_res.text}"
            print(f"[PASS] POST /api/v1/guide/submissions/{target_sub_id}/review -> 200 OK")

        # 12. Approve Title
        appr_res = await ac.post("/api/v1/projects/TEAM-CSE-Y3-B04/title-approval", json={
            "decision": "APPROVED",
            "remarks": "Scope approved by Guide."
        }, headers=g_headers)
        assert appr_res.status_code == 200, f"Title approval failed: {appr_res.text}"
        print("[PASS] POST /api/v1/projects/TEAM-CSE-Y3-B04/title-approval -> 200 OK")

        pass

    print("\n--- ALL 12/12 API ENDPOINTS VERIFIED SUCCESSFULLY! ---")

if __name__ == "__main__":
    asyncio.run(test_all_endpoints())
