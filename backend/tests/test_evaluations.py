import pytest
from httpx import AsyncClient
from app.core.database import AsyncSessionLocal
from app.repositories.team_repository import TeamRepository

@pytest.mark.asyncio
async def test_evaluations_and_marks_workflow(client: AsyncClient):
    # 1. Login as Guide (Dr. Manimegalai)
    g_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.manimegalai@siet.ac.in", "password": "guide@123"})
    assert g_login.status_code == 200
    g_token = g_login.json()["token"]
    g_headers = {"Authorization": f"Bearer {g_token}"}

    # Fetch Team 04 ID
    async with AsyncSessionLocal() as session:
        team_repo = TeamRepository(session)
        teams = await team_repo.get_all_teams()
        team_04 = [t for t in teams if t.team_no == "Team 04"][0]
        team_id = str(team_04.id)

    # 2. Submit Review 1 Evaluation
    eval_payload = {
        "reviewNumber": "Review 1",
        "reviewTitle": "First Milestone Project Review",
        "guideFeedback": "Good implementation progress on backend modules.",
        "status": "APPROVED",
        "criteria": [
            {"title": "Problem Statement & Requirements", "maxMarks": 30, "awardedMarks": 28, "feedback": "Clear formulation"},
            {"title": "System Architecture & Design", "maxMarks": 40, "awardedMarks": 36, "feedback": "Well-structured DB design"},
            {"title": "Implementation & Testing", "maxMarks": 30, "awardedMarks": 25, "feedback": "Need deeper security tests"}
        ]
    }
    eval_resp = await client.post(f"/api/v1/evaluations/team/{team_id}", json=eval_payload, headers=g_headers)
    assert eval_resp.status_code == 201
    eval_data = eval_resp.json()
    assert eval_data["totalScore"] == 89 # 28 + 36 + 25
    assert eval_data["maxTotal"] == 100
    assert len(eval_data["criteria"]) == 3

    # 3. Negative Test: Awarded marks > max_marks should fail with 400
    bad_payload = {
        "reviewNumber": "Review 2",
        "criteria": [{"title": "Over-marked criteria", "maxMarks": 10, "awardedMarks": 15}]
    }
    bad_resp = await client.post(f"/api/v1/evaluations/team/{team_id}", json=bad_payload, headers=g_headers)
    assert bad_resp.status_code == 400
    assert "cannot exceed maximum marks" in bad_resp.json()["detail"]

    # 4. Student views their marks
    st_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"})
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    st_marks = await client.get("/api/v1/evaluations/student/marks", headers=st_headers)
    assert st_marks.status_code == 200
    marks_list = st_marks.json()
    assert isinstance(marks_list, list)
    assert len(marks_list) >= 1
    assert marks_list[0]["totalScore"] == 89

    # 5. Guide requests revision
    rev_payload = {"reason": "Please update literature review references."}
    rev_resp = await client.post(f"/api/v1/evaluations/team/{team_id}/revision", json=rev_payload, headers=g_headers)
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "PENDING"
