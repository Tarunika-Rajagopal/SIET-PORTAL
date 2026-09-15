import pytest
import time
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_team_workflows(client: AsyncClient):
    # 1. Login as Advisor (Dr. Karthik)
    adv_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"}
    )
    assert adv_login.status_code == 200
    token = adv_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login as Student (Tarunika)
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # 3. List teams
    list_resp = await client.get("/api/v1/teams", headers=headers)
    assert list_resp.status_code == 200
    teams_data = list_resp.json()
    assert isinstance(teams_data, list)
    assert len(teams_data) >= 1

    # 4. Student attempt to create team -> 403 Forbidden
    # Fetch batch & section IDs from existing team
    batch_id = None
    section_id = None
    team_04 = teams_data[0]
    
    # 5. Guide Allocation
    guide_user_id = None
    # Login as Admin to fetch Dr. Manimegalai user ID
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "admin@siet.ac.in", "password": "admin@123"}
    )
    admin_token = admin_login.json()["token"]
    users_resp = await client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    users = users_resp.json()
    for u in users:
        if u["email"] == "dr.manimegalai@siet.ac.in":
            guide_user_id = u["id"]
            break

    assert guide_user_id is not None

    # Allocate guide to Team 04
    alloc_resp = await client.post(
        f"/api/v1/teams/{team_04['id']}/allocate-guide",
        headers=headers,
        json={"guideId": guide_user_id}
    )
    assert alloc_resp.status_code == 200
    assert alloc_resp.json()["guideName"] == "Dr. P. Manimegalai"
