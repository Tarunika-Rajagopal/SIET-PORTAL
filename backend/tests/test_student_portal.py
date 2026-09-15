import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_student_portal_endpoints(client: AsyncClient):
    # 1. Login as Student
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # 2. Test Student Dashboard
    dash_resp = await client.get("/api/v1/student/dashboard", headers=st_headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert "team" in data
    assert "project" in data
    assert "currentWeek" in data
    assert "overallProgress" in data

    # 3. Test Student Team Endpoint
    team_resp = await client.get("/api/v1/student/team", headers=st_headers)
    assert team_resp.status_code == 200
    assert team_resp.json()["teamNo"] == "Team 04"

    # 4. Test Student Project Endpoint
    proj_resp = await client.get("/api/v1/student/project", headers=st_headers)
    assert proj_resp.status_code == 200
    assert "id" in proj_resp.json()
