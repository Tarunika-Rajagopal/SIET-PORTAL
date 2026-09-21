import asyncio
import os
import sys
from pathlib import Path

# Ensure backend and backend/app are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
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
        if pending_list:
            s0 = pending_list[0]
            # Verify kept fields are present
            for field in [
                "id", "weekNumber", "teamId", "teamNo", "teamNumber", "classSection",
                "teamLeader", "projectTitle", "status", "evaluationStatus", "submissionDate",
                "score", "abstractSummary", "problemStatement", "proposedSolution",
                "technologyUsed", "obstaclesFaced", "pptUrl", "presentationFileName",
                "reportUrl", "githubUrl", "liveDemoUrl", "images", "comments", "guideReviewDate"
            ]:
                assert field in s0, f"Field '{field}' missing from weekly submission"

            # Verify removed alias fields are absent
            for removed in [
                "submissionId", "week", "abstract", "presentationFile", "pdfFile",
                "repoUrl", "demoUrl", "screenshotFile"
            ]:
                assert removed not in s0, f"Field '{removed}' should have been removed"

            # Verify evaluationStatus mapping
            if s0["status"] == "Submitted":
                assert s0["evaluationStatus"] == "Pending"
            else:
                assert s0["evaluationStatus"] == s0["status"]

        # 11. Review Submission Tests
        # C. Invalid submission UUID -> 400
        invalid_res = await ac.post("/api/v1/guide/submissions/invalid-uuid-format/review", json={
            "status": "APPROVED"
        }, headers=g_headers)
        assert invalid_res.status_code == 400, f"Expected 400 for invalid UUID, got: {invalid_res.status_code}"
        print("[PASS] POST /api/v1/guide/submissions/{invalid_id}/review -> 400 Bad Request")

        # D. Non-existent submission UUID -> 404
        nonexistent_res = await ac.post("/api/v1/guide/submissions/00000000-0000-0000-0000-000000000000/review", json={
            "status": "APPROVED"
        }, headers=g_headers)
        assert nonexistent_res.status_code == 404, f"Expected 404 for nonexistent UUID, got: {nonexistent_res.status_code}"
        print("[PASS] POST /api/v1/guide/submissions/{nonexistent_id}/review -> 404 Not Found")

        if pending_list:
            target_sub_id = pending_list[0]["id"]

            # A. APPROVED: assert 200, verify response, verify persisted fields
            rev_res = await ac.post(f"/api/v1/guide/submissions/{target_sub_id}/review", json={
                "status": "APPROVED",
                "comments": "Excellent technical formulation. Proceed to implementation.",
                "score": 95.0
            }, headers=g_headers)
            assert rev_res.status_code == 200, f"Review failed: {rev_res.text}"
            rev_data = rev_res.json()
            assert rev_data["success"] is True
            assert rev_data["id"] == target_sub_id
            print(f"[PASS] POST /api/v1/guide/submissions/{target_sub_id}/review (APPROVED) -> 200 OK")

            # E. Verify persisted fields where practical
            g_subs_after = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
            sub_after = next((s for s in g_subs_after.json() if s["id"] == target_sub_id), None)
            assert sub_after is not None
            assert sub_after["status"] == "Approved"
            assert sub_after["evaluationStatus"] == "Approved"
            assert sub_after["score"] == 95.0
            assert sub_after["comments"] == "Excellent technical formulation. Proceed to implementation."
            assert bool(sub_after["guideReviewDate"]) is True
            print(f"[PASS] Verified persisted fields for APPROVED: status={sub_after['status']}, score={sub_after['score']}, date={sub_after['guideReviewDate']}")

            # B. REVISION_REQUESTED: assert 200, verify resulting status is exactly "Revision Required"
            rev_req_res = await ac.post(f"/api/v1/guide/submissions/{target_sub_id}/review", json={
                "status": "REVISION_REQUESTED",
                "comments": "Please refine the architecture diagrams and references."
            }, headers=g_headers)
            assert rev_req_res.status_code == 200, f"Revision request failed: {rev_req_res.text}"
            assert rev_req_res.json()["success"] is True

            g_subs_rev = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
            sub_rev = next((s for s in g_subs_rev.json() if s["id"] == target_sub_id), None)
            assert sub_rev is not None
            assert sub_rev["status"] == "Revision Required"
            assert sub_rev["evaluationStatus"] == "Revision Required"
            assert sub_rev["comments"] == "Please refine the architecture diagrams and references."
            print(f"[PASS] POST /api/v1/guide/submissions/{target_sub_id}/review (REVISION_REQUESTED) -> 200 OK, status='Revision Required'")

            # Additional: REJECTED review
            rev_rej_res = await ac.post(f"/api/v1/guide/submissions/{target_sub_id}/review", json={
                "status": "REJECTED",
                "comments": "Milestone deliverables do not meet required criteria."
            }, headers=g_headers)
            assert rev_rej_res.status_code == 200, f"Reject failed: {rev_rej_res.text}"
            g_subs_rej = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
            sub_rej = next((s for s in g_subs_rej.json() if s["id"] == target_sub_id), None)
            assert sub_rej is not None
            assert sub_rej["status"] == "Rejected"
            assert sub_rej["evaluationStatus"] == "Rejected"
            print(f"[PASS] POST /api/v1/guide/submissions/{target_sub_id}/review (REJECTED) -> 200 OK, status='Rejected'")


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
