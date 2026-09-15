import pytest
from httpx import AsyncClient
from app.core.database import AsyncSessionLocal
from app.models.projects import Project
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_project_workflows(client: AsyncClient):
    # Reset project status for idempotency across test runs
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Project))
        projects = res.scalars().all()
        for p in projects:
            p.status = "PENDING"
            p.guide_approval_status = "Pending Review"
            p.is_locked = False
        await session.commit()

    # 1. Login as Student (Tarunika)
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # 2. Get student project
    proj_resp = await client.get("/api/v1/student/project", headers=st_headers)
    assert proj_resp.status_code == 200
    proj = proj_resp.json()
    assert "teamId" in proj
    assert "title" in proj

    # 3. Submit title update
    team_id = proj["teamId"]
    project_id = proj["id"]

    update_resp = await client.put(
        f"/api/v1/projects/team/{team_id}/title",
        headers=st_headers,
        json={"title": "Updated AI Deliverables Tracking Platform", "abstract": "Updated system abstract."}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["submittedTitle"] == "Updated AI Deliverables Tracking Platform"

    # 4. Guide approves title
    guide_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "dr.manimegalai@siet.ac.in", "password": "guide@123"}
    )
    guide_token = guide_login.json()["token"]
    guide_headers = {"Authorization": f"Bearer {guide_token}"}

    appr_resp = await client.post(
        f"/api/v1/projects/{project_id}/title-approval",
        headers=guide_headers,
        json={"status": "Approved", "feedback": "Title is appropriate and clear."}
    )
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "APPROVED"

    # 5. Fetch title history
    hist_resp = await client.get(f"/api/v1/projects/{project_id}/title-history", headers=st_headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert isinstance(history, list)
    assert len(history) >= 1
