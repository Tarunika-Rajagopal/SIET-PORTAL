import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_student_email_login(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["email"] == "student@srishakthi.ac.in"
    assert data["user"]["rollNo"] == "714023104112"
    assert data["user"]["role"] == "student"
    assert "password_hash" not in str(data)

@pytest.mark.asyncio
async def test_student_roll_number_login(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "714023104112", "password": "student@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["email"] == "student@srishakthi.ac.in"
    assert data["user"]["rollNo"] == "714023104112"

@pytest.mark.asyncio
async def test_invalid_password(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_unknown_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "nonexistent@srishakthi.ac.in", "password": "student@123"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_advisor_login_and_role_switch(client: AsyncClient):
    # 1. Login as Dr. Karthik (roles: advisor, guide)
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"}
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    token = data["token"]
    assert "advisor" in data["user"]["roles"]
    assert "guide" in data["user"]["roles"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test /me
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "dr.karthik@siet.ac.in"

    # 3. Test /session & /logout
    sess_resp = await client.post("/api/v1/auth/session", headers=headers)
    assert sess_resp.status_code == 200
    assert sess_resp.json()["active"] is True

    logout_resp = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["success"] is True

    # 4. Switch role to guide
    switch_resp = await client.post(
        "/api/v1/auth/switch-role",
        headers=headers,
        json={"targetRole": "guide"}
    )
    assert switch_resp.status_code == 200
    switch_data = switch_resp.json()
    assert switch_data["user"]["activeRole"] == "guide"

    # 5. Try invalid role switch (e.g., to admin) -> 403 Forbidden
    invalid_switch = await client.post(
        "/api/v1/auth/switch-role",
        headers=headers,
        json={"targetRole": "admin"}
    )
    assert invalid_switch.status_code == 403

@pytest.mark.asyncio
async def test_invalid_token_protection(client: AsyncClient):
    # No token
    resp1 = await client.get("/api/v1/auth/me")
    assert resp1.status_code == 401

    # Malformed token
    resp2 = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"})
    assert resp2.status_code == 401

@pytest.mark.asyncio
async def test_admin_user_listing_rbac(client: AsyncClient):
    # 1. Student login -> try accessing /users -> 403 Forbidden
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    st_token = st_login.json()["token"]
    st_resp = await client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {st_token}"})
    assert st_resp.status_code == 403

    # 2. Admin login -> try accessing /users -> 200 OK
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "admin@siet.ac.in", "password": "admin@123"}
    )
    admin_token = admin_login.json()["token"]
    admin_resp = await client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_resp.status_code == 200
    users_list = admin_resp.json()
    assert isinstance(users_list, list)
    assert len(users_list) >= 5
