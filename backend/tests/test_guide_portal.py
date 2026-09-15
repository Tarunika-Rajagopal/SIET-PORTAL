import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_guide_portal_endpoints(client: AsyncClient):
    # 1. Login as Guide (Dr. Manimegalai)
    g_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.manimegalai@siet.ac.in", "password": "guide@123"})
    assert g_login.status_code == 200
    g_token = g_login.json()["token"]
    g_headers = {"Authorization": f"Bearer {g_token}"}

    # 2. Guide Dashboard
    dash_resp = await client.get("/api/v1/guide/dashboard", headers=g_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "assignedTeamsCount" in dash_data
    assert "pendingReviewsCount" in dash_data
    assert isinstance(dash_data["teams"], list)

    # 3. Assigned Teams
    teams_resp = await client.get("/api/v1/guide/teams", headers=g_headers)
    assert teams_resp.status_code == 200
    teams_list = teams_resp.json()
    assert isinstance(teams_list, list)

    # 4. Pending Weekly Submissions
    pending_resp = await client.get("/api/v1/guide/submissions/weekly", headers=g_headers)
    assert pending_resp.status_code == 200
    assert isinstance(pending_resp.json(), list)
