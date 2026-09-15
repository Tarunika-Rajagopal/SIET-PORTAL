import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_hod_portal_endpoints(client: AsyncClient):
    # 1. Login as HOD (Dr. Saravanan)
    hod_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "hod.cse@siet.ac.in", "password": "hod@123"})
    assert hod_login.status_code == 200
    hod_token = hod_login.json()["token"]
    hod_headers = {"Authorization": f"Bearer {hod_token}"}

    # 2. HOD Department Analytics
    ana_resp = await client.get("/api/v1/hod/analytics", headers=hod_headers)
    assert ana_resp.status_code == 200
    ana_data = ana_resp.json()
    assert "departmentName" in ana_data
    assert "totalStudents" in ana_data
    assert "totalTeams" in ana_data

    # 3. Faculty Workload & Quota Audit
    work_resp = await client.get("/api/v1/hod/faculty-workload", headers=hod_headers)
    assert work_resp.status_code == 200
    work_list = work_resp.json()
    assert isinstance(work_list, list)
    assert len(work_list) >= 1
    assert "assignedTeamsCount" in work_list[0]
    assert "guideQuota" in work_list[0]
