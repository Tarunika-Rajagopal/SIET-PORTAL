import pytest
from httpx import AsyncClient
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.repositories.user_repository import UserRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.academic_repository import AcademicRepository
from app.core.security import get_password_hash
from app.models.submissions import WeeklySubmission
from app.models.academic import Department, Batch, Section

@pytest.mark.asyncio
async def test_path_traversal_and_file_validation(client: AsyncClient):
    # 1. Login as Student
    st_login = await client.post(
        "/api/v1/auth/login",
        json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"}
    )
    assert st_login.status_code == 200
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # Ensure week 6 is draft for testing
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(WeeklySubmission).where(WeeklySubmission.week_number == 6)
        )
        sub_6 = res.scalars().first()
        if sub_6:
            await session.delete(sub_6)
            await session.commit()

    # Create draft for week 6
    save_resp = await client.post(
        "/api/v1/student/submissions/6",
        json={"problemStatement": "Test PS", "solution": "Test Sol", "isSubmit": False},
        headers=st_headers
    )
    assert save_resp.status_code == 200
    submission_id = save_resp.json()["id"]

    # A. Test Path Traversal Filename - should be sanitized securely
    files_pt = {"file": ("../../../../etc/passwd.pdf", b"%PDF-1.4 Mock PDF Content", "application/pdf")}
    up_pt = await client.post(f"/api/v1/submissions/{submission_id}/files", headers=st_headers, files=files_pt)
    assert up_pt.status_code == 201
    file_data = up_pt.json()
    assert "passwd.pdf" in file_data["originalFilename"]
    file_id = file_data["id"]
    await client.delete(f"/api/v1/submissions/{submission_id}/files/{file_id}", headers=st_headers)

    # B. Test Unsupported Extension (.exe)
    files_exe = {"file": ("malware.exe", b"MZ Executable Binary", "application/x-msdownload")}
    up_exe = await client.post(f"/api/v1/submissions/{submission_id}/files", headers=st_headers, files=files_exe)
    assert up_exe.status_code == 400
    assert "Unsupported file format" in up_exe.json()["detail"]

    # C. Test 0-byte Empty File
    files_empty = {"file": ("empty.pdf", b"", "application/pdf")}
    up_empty = await client.post(f"/api/v1/submissions/{submission_id}/files", headers=st_headers, files=files_empty)
    assert up_empty.status_code == 400
    assert "empty" in up_empty.json()["detail"].lower()

    # D. Test Oversized File (> 25MB for PPTX)
    large_content = b"0" * (26 * 1024 * 1024) # 26 MB
    files_large = {"file": ("large.pptx", large_content, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
    up_large = await client.post(f"/api/v1/submissions/{submission_id}/files", headers=st_headers, files=files_large)
    assert up_large.status_code == 400
    assert "exceeds maximum permitted limit" in up_large.json()["detail"]


@pytest.mark.asyncio
async def test_idor_cross_team_access_prevention(client: AsyncClient):
    # Setup second student and second team
    async with AsyncSessionLocal() as session:
        user_repo = UserRepository(session)
        fs_repo = FacultyStudentRepository(session)
        team_repo = TeamRepository(session)
        academic_repo = AcademicRepository(session)

        dept = await academic_repo.get_department_by_code("CSE")
        res_batch = await session.execute(select(Batch).where(Batch.department_id == dept.id))
        batches = list(res_batch.scalars().all())

        res_sec = await session.execute(select(Section).where(Section.batch_id == batches[0].id))
        sections = list(res_sec.scalars().all())

        st2_user = await user_repo.get_user_by_email("student2@srishakthi.ac.in")
        if not st2_user:
            st2_user = await user_repo.create_user(
                email="student2@srishakthi.ac.in",
                password_hash=get_password_hash("student@123"),
                name="Siddharthan V",
                department_id=dept.id
            )
            role_st = await user_repo.get_role_by_name("student")
            await user_repo.assign_role_to_user(st2_user.id, role_st.id)

            st2_rec = await fs_repo.create_student(
                user_id=st2_user.id,
                roll_no="714023104199",
                batch_id=batches[0].id,
                section_id=sections[0].id
            )

            t2 = await team_repo.create_team("Team 99", batches[0].id, sections[0].id)
            await team_repo.add_team_member(t2.id, st2_rec.id, "Team Lead")
            await session.commit()

    # Login as Student 2
    login2 = await client.post("/api/v1/auth/login", json={"emailOrRoll": "student2@srishakthi.ac.in", "password": "student@123"})
    assert login2.status_code == 200
    t2_token = login2.json()["token"]
    t2_headers = {"Authorization": f"Bearer {t2_token}"}

    # Fetch Team 04 (belonging to Student 1)
    login1 = await client.post("/api/v1/auth/login", json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"})
    t1_token = login1.json()["token"]
    t1_headers = {"Authorization": f"Bearer {t1_token}"}

    t1_resp = await client.get("/api/v1/student/team", headers=t1_headers)
    t1_id = t1_resp.json()["id"]

    # Student 2 tries to access Team 1 details -> 403 Forbidden
    t2_get_t1 = await client.get(f"/api/v1/teams/{t1_id}", headers=t2_headers)
    assert t2_get_t1.status_code == 403

    # Student 2 tries to access Team 1 project -> 403 Forbidden
    t2_get_p1 = await client.get(f"/api/v1/projects/team/{t1_id}", headers=t2_headers)
    assert t2_get_p1.status_code == 403

    # Student 2 tries to update Team 1 project title -> 403 Forbidden
    t2_put_p1 = await client.put(f"/api/v1/projects/team/{t1_id}/title", headers=t2_headers, json={"title": "Hacked Title"})
    assert t2_put_p1.status_code == 403


@pytest.mark.asyncio
async def test_submission_finalization_locking(client: AsyncClient):
    # Login as Student 1
    st_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "student@srishakthi.ac.in", "password": "student@123"})
    st_token = st_login.json()["token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # Submit week 1 (already SUBMITTED in seed)
    save_submitted = await client.post(
        "/api/v1/student/submissions/1",
        json={"problemStatement": "Attempting modification of submitted week", "isSubmit": False},
        headers=st_headers
    )
    assert save_submitted.status_code == 400
    assert "already submitted" in save_submitted.json()["detail"].lower()


@pytest.mark.asyncio
async def test_guide_quota_enforcement(client: AsyncClient):
    adv_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.karthik@siet.ac.in", "password": "faculty@123"})
    adv_token = adv_login.json()["token"]
    adv_headers = {"Authorization": f"Bearer {adv_token}"}

    g_login = await client.post("/api/v1/auth/login", json={"emailOrRoll": "dr.manimegalai@siet.ac.in", "password": "guide@123"})
    guide_user_id = g_login.json()["user"]["id"]

    # Reduce guide_quota to 1 for Dr. Manimegalai to test quota limit easily
    async with AsyncSessionLocal() as session:
        fs_repo = FacultyStudentRepository(session)
        fac = await fs_repo.get_faculty_by_user_id(guide_user_id)
        if fac:
            fac.guide_quota = 1
            await session.commit()

    # Create Team 88
    async with AsyncSessionLocal() as session:
        academic_repo = AcademicRepository(session)
        team_repo = TeamRepository(session)
        dept = await academic_repo.get_department_by_code("CSE")
        res_batch = await session.execute(select(Batch).where(Batch.department_id == dept.id))
        batches = list(res_batch.scalars().all())
        res_sec = await session.execute(select(Section).where(Section.batch_id == batches[0].id))
        sections = list(res_sec.scalars().all())

        t88 = await team_repo.create_team("Team 88", batches[0].id, sections[0].id)
        await session.commit()
        t88_id = t88.id

    # Try assigning Team 88 to Dr. Manimegalai (who already has Team 04, active count = 1, quota = 1)
    alloc_resp = await client.post(
        f"/api/v1/teams/{t88_id}/allocate-guide",
        json={"guideId": guide_user_id},
        headers=adv_headers
    )
    assert alloc_resp.status_code == 400
    assert "quota limit" in alloc_resp.json()["detail"].lower()

    # Restore quota to 5
    async with AsyncSessionLocal() as session:
        fs_repo = FacultyStudentRepository(session)
        fac = await fs_repo.get_faculty_by_user_id(guide_user_id)
        if fac:
            fac.guide_quota = 5
            await session.commit()
