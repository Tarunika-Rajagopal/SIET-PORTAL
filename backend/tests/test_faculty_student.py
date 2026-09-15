import pytest
import time
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_faculty_and_student_creation(client: AsyncClient):
    # 1. Admin login
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "admin@siet.ac.in", "password": "admin@123"}
    )
    assert admin_login.status_code == 200
    token = admin_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Student login
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # 3. Test Student creating Faculty -> 403 Forbidden
    timestamp = int(time.time())
    fac_email = f"faculty_{timestamp}@siet.ac.in"
    emp_id = f"EMP-TEST-{timestamp}"
    fac_payload = {
        "email": fac_email,
        "password": "faculty@123",
        "name": "Prof. Test Faculty",
        "employeeId": emp_id,
        "designation": "Assistant Professor",
        "specialization": "Cybersecurity",
        "guideQuota": 5,
        "roles": ["guide"]
    }
    forbidden_fac = await client.post("/api/v1/faculty", json=fac_payload, headers=st_headers)
    assert forbidden_fac.status_code == 403

    # 4. Admin creates Faculty -> 201 Created
    fac_resp = await client.post("/api/v1/faculty", json=fac_payload, headers=headers)
    assert fac_resp.status_code == 201
    fac_data = fac_resp.json()
    assert fac_data["email"] == fac_email
    assert fac_data["employeeId"] == emp_id

    # Duplicate faculty email -> 409 Conflict
    dup_fac = await client.post("/api/v1/faculty", json=fac_payload, headers=headers)
    assert dup_fac.status_code == 409

    # 5. Negative guide quota validation -> 422 Unprocessable Entity
    invalid_quota_payload = fac_payload.copy()
    invalid_quota_payload["email"] = f"invalid_quota_{timestamp}@siet.ac.in"
    invalid_quota_payload["employeeId"] = f"EMP-BAD-{timestamp}"
    invalid_quota_payload["guideQuota"] = -5
    bad_quota_resp = await client.post("/api/v1/faculty", json=invalid_quota_payload, headers=headers)
    assert bad_quota_resp.status_code == 422
