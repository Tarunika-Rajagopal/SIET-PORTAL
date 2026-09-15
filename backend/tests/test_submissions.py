import pytest
from httpx import AsyncClient
from app.core.database import AsyncSessionLocal
from app.models.submissions import WeeklySubmission
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_weekly_submissions_and_file_upload(client: AsyncClient):
    # Cleanup week 6 submission if present from prior runs
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(WeeklySubmission).where(WeeklySubmission.week_number == 6))
        existing_sub = res.scalars().first()
        if existing_sub:
            await session.delete(existing_sub)
            await session.commit()

    # 1. Login as Student
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # 2. Get Submissions List
    subs_resp = await client.get("/api/v1/student/submissions", headers=st_headers)
    assert subs_resp.status_code == 200
    subs = subs_resp.json()
    assert isinstance(subs, list)
    assert len(subs) == 6

    # 3. Save Draft for Week 6
    draft_payload = {
        "problemStatement": "Automating project workflow evaluations.",
        "solution": "FastAPI + PostgreSQL backend with React portal.",
        "technologyUsed": "Python, FastAPI, PostgreSQL",
        "repoUrl": "https://github.com/siet-cse/portal",
        "isSubmit": False
    }
    save_resp = await client.post("/api/v1/student/submissions/6", json=draft_payload, headers=st_headers)
    assert save_resp.status_code == 200
    sub_data = save_resp.json()
    assert sub_data["status"] == "DRAFT"
    submission_id = sub_data["id"]

    # 4. Upload File Attachment
    file_content = b"%PDF-1.4 Mock PDF Dossier Content"
    files = {"file": ("final_report.pdf", file_content, "application/pdf")}
    upload_resp = await client.post(
        f"/api/v1/submissions/{submission_id}/files",
        headers=st_headers,
        files=files
    )
    assert upload_resp.status_code == 201
    file_data = upload_resp.json()
    assert file_data["originalFilename"] == "final_report.pdf"
    file_id = file_data["id"]

    # 5. Download File
    dl_resp = await client.get(f"/api/v1/files/download/{file_id}", headers=st_headers)
    assert dl_resp.status_code == 200
    assert dl_resp.content == file_content

    # 6. Delete File
    del_resp = await client.delete(f"/api/v1/submissions/{submission_id}/files/{file_id}", headers=st_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # 7. Final Submit
    submit_payload = draft_payload.copy()
    submit_payload["isSubmit"] = True
    final_resp = await client.post("/api/v1/student/submissions/6", json=submit_payload, headers=st_headers)
    assert final_resp.status_code == 200
    assert final_resp.json()["status"] == "SUBMITTED"
