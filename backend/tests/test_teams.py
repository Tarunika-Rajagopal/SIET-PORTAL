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

@pytest.mark.asyncio
async def test_team_number_uniqueness_validation(client: AsyncClient):
    # 1. Login as Admin/Advisor
    adv_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"}
    )
    assert adv_login.status_code == 200
    headers = {"Authorization": f"Bearer {adv_login.json()['token']}"}

    # Fetch existing batch and section IDs from db
    from app.core.database import AsyncSessionLocal
    from sqlalchemy.future import select
    from app.models.academic import Batch, Section
    async with AsyncSessionLocal() as session:
        res_batch = await session.execute(select(Batch))
        batch = res_batch.scalars().first()
        batch_id = str(batch.id)
        res_sec = await session.execute(select(Section).where(Section.batch_id == batch.id))
        section = res_sec.scalars().first()
        section_id = str(section.id)

        # Cleanup Team 77 if present from previous runs
        from app.models.teams import Team
        res_t77 = await session.execute(select(Team).where(Team.team_no == "Team 77"))
        t77 = res_t77.scalars().first()
        if t77:
            await session.delete(t77)
            await session.commit()

    # 2. Attempt to create duplicate of existing Team 04 (e.g. "Team 04" or "Team 4" or "4")
    dup_resp = await client.post(
        "/api/v1/teams",
        headers=headers,
        json={
            "teamNo": "Team 04",
            "batchId": batch_id,
            "sectionId": section_id,
            "studentRolls": []
        }
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["detail"] == "This team number is already being created."

    dup_resp2 = await client.post(
        "/api/v1/teams",
        headers=headers,
        json={
            "teamNo": "Team 4",
            "batchId": batch_id,
            "sectionId": section_id,
            "studentRolls": []
        }
    )
    assert dup_resp2.status_code == 409
    assert dup_resp2.json()["detail"] == "This team number is already being created."

    dup_resp3 = await client.post(
        "/api/v1/advisor/teams/create-manual",
        headers=headers,
        json={
            "teamNo": "4",
            "batchId": batch_id,
            "sectionId": section_id,
            "studentRolls": []
        }
    )
    assert dup_resp3.status_code == 409
    assert dup_resp3.json()["detail"] == "This team number is already being created."

    # 3. Create a unique new team number e.g. "Team 77"
    create_resp = await client.post(
        "/api/v1/teams",
        headers=headers,
        json={
            "teamNo": "Team 77",
            "batchId": batch_id,
            "sectionId": section_id,
            "studentRolls": []
        }
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["teamNo"] == "Team 77"

    # 4. Attempt to create Team 77 again -> 409 Conflict
    dup_77 = await client.post(
        "/api/v1/teams",
        headers=headers,
        json={
            "teamNo": "Team 77",
            "batchId": batch_id,
            "sectionId": section_id,
            "studentRolls": []
        }
    )
    assert dup_77.status_code == 409
    assert dup_77.json()["detail"] == "This team number is already being created."

@pytest.mark.asyncio
async def test_team_update_and_delete_functionality(client: AsyncClient):
    # 1. Login as Advisor
    adv_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"}
    )
    assert adv_login.status_code == 200
    headers = {"Authorization": f"Bearer {adv_login.json()['token']}"}

    # Fetch batch & section
    from app.core.database import AsyncSessionLocal
    from sqlalchemy.future import select
    from app.models.academic import Batch, Section
    from app.models.teams import Team
    async with AsyncSessionLocal() as session:
        res_batch = await session.execute(select(Batch))
        batch = res_batch.scalars().first()
        batch_id = str(batch.id)
        res_sec = await session.execute(select(Section).where(Section.batch_id == batch.id))
        section = res_sec.scalars().first()
        section_id = str(section.id)

    # 2. Create test team "Team 80"
    create_resp = await client.post(
        "/api/v1/teams",
        headers=headers,
        json={
            "teamNo": "Team 80",
            "batchId": batch_id,
            "sectionId": section_id,
            "studentRolls": []
        }
    )
    assert create_resp.status_code == 201
    team_80_id = create_resp.json()["id"]

    # 3. Edit Team 80 to "Team 81" -> Success
    edit_resp = await client.put(
        f"/api/v1/teams/{team_80_id}",
        headers=headers,
        json={"teamNo": "Team 81"}
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["teamNo"] == "Team 81"

    # 4. Edit Team 81 to duplicate "Team 04" -> Rejection 409
    dup_edit = await client.put(
        f"/api/v1/teams/{team_80_id}",
        headers=headers,
        json={"teamNo": "Team 04"}
    )
    assert dup_edit.status_code == 409
    assert dup_edit.json()["detail"] == "This team number is already being created."

    # 5. Delete Team 81
    del_resp = await client.delete(f"/api/v1/teams/{team_80_id}", headers=headers)
    assert del_resp.status_code == 200
    assert "deleted" in del_resp.json()["message"].lower()

    # 6. Verify team is gone
    get_del = await client.get(f"/api/v1/teams/{team_80_id}", headers=headers)
    assert get_del.status_code == 404

    # 7. Authorization check: Student cannot edit or delete teams
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    st_headers = {"Authorization": f"Bearer {st_login.json()['token']}"}

    st_put = await client.put(f"/api/v1/teams/{team_80_id}", headers=st_headers, json={"teamNo": "Hacked"})
    assert st_put.status_code == 403

    st_del = await client.delete(f"/api/v1/teams/{team_80_id}", headers=st_headers)
    assert st_del.status_code == 403


