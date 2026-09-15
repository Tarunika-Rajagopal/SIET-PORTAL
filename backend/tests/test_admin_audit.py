import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_admin_and_audit_logs(client: AsyncClient):
    # 1. Login as Admin
    adm_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "admin@siet.ac.in", "password": "admin@123"})
    assert adm_login.status_code == 200
    adm_token = adm_login.json()["token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # 2. Get Users List (Paginated)
    users_resp = await client.get("/api/v1/admin/users?page=1&pageSize=10", headers=adm_headers)
    assert users_resp.status_code == 200
    u_data = users_resp.json()
    assert "items" in u_data
    assert "total" in u_data
    assert u_data["total"] >= 1

    # 3. Import Students CSV
    csv_content = (
        "rollNo,name,email,batch,section\n"
        "714023104888,Rohan Sharma,rohan.sharma@srishakthi.ac.in,2023-2027 (III Year),CSE-B\n"
        "714023104889,Priya Venkatesh,priya.v@srishakthi.ac.in,2023-2027 (III Year),CSE-B\n"
    )
    files = {"file": ("roster.csv", csv_content.encode("utf-8"), "text/csv")}
    imp_resp = await client.post("/api/v1/admin/students/import-csv", headers=adm_headers, files=files)
    assert imp_resp.status_code == 200
    imp_data = imp_resp.json()
    assert imp_data["totalProcessed"] == 2

    # 4. View Audit Logs
    audit_resp = await client.get("/api/v1/admin/audit-logs", headers=adm_headers)
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert "items" in audit_data
    assert audit_data["total"] >= 1

    # 5. User Notifications List & Mark Read
    st_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"})
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    notif_resp = await client.get("/api/v1/notifications", headers=st_headers)
    assert notif_resp.status_code == 200
    assert isinstance(notif_resp.json(), list)

    mr_resp = await client.post("/api/v1/notifications/mark-read", json={}, headers=st_headers)
    assert mr_resp.status_code == 200
    assert mr_resp.json()["success"] is True
