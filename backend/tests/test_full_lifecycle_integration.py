import pytest
from httpx import AsyncClient
from app.core.database import AsyncSessionLocal
from app.models.submissions import WeeklySubmission
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_full_lifecycle_integration(client: AsyncClient):
    """
    End-to-End Cross-Module Integration Flow:
    Student Submit -> Guide Pending Reviews -> Guide Request Revision -> Student Resubmit ->
    Guide Rubric Evaluation -> Advisor Inspection -> HOD Analytics -> Admin Audit Logs
    """
    # Clean up week 6 submission if present
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(WeeklySubmission).where(WeeklySubmission.week_number == 6))
        sub_6 = res.scalars().first()
        if sub_6:
            await session.delete(sub_6)
            await session.commit()

    # 1. Student Login
    st_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"})
    assert st_login.status_code == 200
    st_headers = {"Authorization": f"Bearer {st_login.json()['token']}"}

    # 2. Student Submits Week 6 Deliverable
    draft_payload = {
        "problemStatement": "Integrated full-lifecycle test.",
        "solution": "FastAPI + PostgreSQL 18 async backend.",
        "technologyUsed": "Python, FastAPI, SQLAlchemy 2.x, PostgreSQL",
        "isSubmit": True
    }
    sub_resp = await client.post("/api/v1/student/submissions/6", json=draft_payload, headers=st_headers)
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["status"] == "SUBMITTED"
    submission_id = sub_data["id"]

    # 3. Guide Login
    g_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.manimegalai@siet.ac.in", "password": "guide@123"})
    g_headers = {"Authorization": f"Bearer {g_login.json()['token']}"}

    # 4. Guide Reviews Pending Weekly Submissions
    pending_resp = await client.get("/api/v1/guide/submissions/weekly", headers=g_headers)
    assert pending_resp.status_code == 200

    # 5. Guide Reviews and requests revision
    rev_resp = await client.post(
        f"/api/v1/guide/submissions/{submission_id}/review",
        json={"status": "REVISION_REQUESTED", "comments": "Please elaborate obstacle resolution details."},
        headers=g_headers
    )
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "REVISION_REQUESTED"

    # 6. Student Resubmits Updated Deliverable
    resub_payload = draft_payload.copy()
    resub_payload["obstaclesFaced"] = "Resolved async database transaction boundary issues."
    resub_resp = await client.post("/api/v1/student/submissions/6", json=resub_payload, headers=st_headers)
    assert resub_resp.status_code == 200

    # 7. Guide Evaluates Project with Weighted Rubric
    st_team = await client.get("/api/v1/student/team", headers=st_headers)
    team_id = st_team.json()["id"]

    eval_payload = {
        "reviewNumber": "Final Review",
        "reviewTitle": "End-to-End Capstone Evaluation",
        "guideFeedback": "Outstanding execution across all modules.",
        "status": "APPROVED",
        "criteria": [
            {"title": "System Architecture & Security", "maxMarks": 50, "awardedMarks": 48},
            {"title": "Test Coverage & Code Integrity", "maxMarks": 50, "awardedMarks": 50}
        ]
    }
    eval_resp = await client.post(f"/api/v1/evaluations/team/{team_id}", json=eval_payload, headers=g_headers)
    assert eval_resp.status_code == 201
    assert eval_resp.json()["totalScore"] == 98

    # 8. Advisor Monitors Class Progress
    adv_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"})
    adv_headers = {"Authorization": f"Bearer {adv_login.json()['token']}"}
    adv_dash = await client.get("/api/v1/advisor/dashboard", headers=adv_headers)
    assert adv_dash.status_code == 200

    # 9. HOD Monitors Department Performance
    hod_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "hod.cse@siet.ac.in", "password": "hod@123"})
    hod_headers = {"Authorization": f"Bearer {hod_login.json()['token']}"}
    hod_ana = await client.get("/api/v1/hod/analytics", headers=hod_headers)
    assert hod_ana.status_code == 200

    # 10. Admin Audits System Logs
    adm_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "admin@siet.ac.in", "password": "admin@123"})
    adm_headers = {"Authorization": f"Bearer {adm_login.json()['token']}"}
    logs_resp = await client.get("/api/v1/admin/audit-logs", headers=adm_headers)
    assert logs_resp.status_code == 200
    assert logs_resp.json()["total"] >= 1
