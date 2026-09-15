import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_advisor_portal_endpoints(client: AsyncClient):
    # 1. Login as Advisor (Dr. Karthikeyan)
    adv_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"})
    assert adv_login.status_code == 200
    adv_token = adv_login.json()["token"]
    adv_headers = {"Authorization": f"Bearer {adv_token}"}

    # 2. Advisor Dashboard
    dash_resp = await client.get("/api/v1/advisor/dashboard", headers=adv_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "totalStudents" in dash_data
    assert "totalTeams" in dash_data
    assert "sectionName" in dash_data

    # 3. Advisor Teams List
    teams_resp = await client.get("/api/v1/advisor/teams", headers=adv_headers)
    assert teams_resp.status_code == 200
    assert isinstance(teams_resp.json(), list)

    # 4. Student Inspection Roster
    st_resp = await client.get("/api/v1/advisor/students/inspection", headers=adv_headers)
    assert st_resp.status_code == 200
    st_list = st_resp.json()
    assert isinstance(st_list, list)
    assert len(st_list) >= 1
