import asyncio
import os
import sys
from pathlib import Path
import uuid

# Force SQLite for test isolation
os.environ["USE_SQLITE"] = "true"

# Ensure backend and backend/app are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
from httpx import AsyncClient, ASGITransport

from main import app
from database import init_db
from database.models import Team
from repositories.team_repository import TeamRepository

@pytest.mark.asyncio
async def test_all_teams_cross_section_isolation():
    """Verify that multiple teams with the same team_no (e.g. Team 01 in CSE-A, CSE-B, CSE-C)
    are strictly isolated by TeamRepository and do not collide or hijack each other."""
    from database import async_session
    await init_db()
    async with async_session() as session:
        repo = TeamRepository(session)

        # Create three distinct teams in three different class sections
        team_a = Team(
            id=uuid.uuid4(),
            team_id="TEAM-CSE-A-01",
            team_no="Team 01",
            batch="2022-2026",
            class_name="III-CSE-A",
            project_title="Section A Project Alpha",
            guide_name="Guide A",
            guide_email="guide.a@siet.ac.in",
        )
        team_b = Team(
            id=uuid.uuid4(),
            team_id="TEAM-CSE-B-01",
            team_no="Team 01",
            batch="2022-2026",
            class_name="III-CSE-B",
            project_title="Section B Project Beta",
            guide_name="Guide B",
            guide_email="guide.b@siet.ac.in",
        )
        team_c = Team(
            id=uuid.uuid4(),
            team_id="TEAM-CSE-C-01",
            team_no="Team 01",
            batch="2022-2026",
            class_name="III-CSE-C",
            project_title="Section C Project Gamma",
            guide_name="Guide C",
            guide_email="guide.c@siet.ac.in",
        )
        session.add_all([team_a, team_b, team_c])
        await session.commit()

        try:
            # Test lookup by exact team_id
            res_a = await repo.get_by_team_id_string("TEAM-CSE-A-01")
            assert res_a is not None
            assert res_a.id == team_a.id
            assert res_a.class_name == "III-CSE-A"
            assert res_a.project_title == "Section A Project Alpha"

            res_b = await repo.get_by_team_id_string("TEAM-CSE-B-01")
            assert res_b is not None
            assert res_b.id == team_b.id
            assert res_b.class_name == "III-CSE-B"
            assert res_b.project_title == "Section B Project Beta"

            res_c = await repo.get_by_team_id_string("TEAM-CSE-C-01")
            assert res_c is not None
            assert res_c.id == team_c.id
            assert res_c.class_name == "III-CSE-C"
            assert res_c.project_title == "Section C Project Gamma"

            # Verify get_with_members resolves exact team
            wm_b = await repo.get_with_members("TEAM-CSE-B-01")
            assert wm_b is not None
            assert wm_b.id == team_b.id
            assert wm_b.project_title == "Section B Project Beta"
        finally:
            # Clean up
            await session.delete(team_a)
            await session.delete(team_b)
            await session.delete(team_c)
            await session.commit()


@pytest.mark.asyncio
async def test_tech_stack_field_flow_and_no_ppt_pdf_screenshot_required():
    """Verify end-to-end data flow:
    1. Student submits Tech Stack and Frameworks (technologyUsed) without PPT/PDF/Screenshot
    2. Backend persists it to database
    3. Guide weekly submissions endpoint returns technologyUsed, technologiesUsed list, and techStack string
    4. Submitting without PPT, PDF, or Output Screenshot succeeds completely."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        from tests.test_fixtures import seed_test_data as seed_initial_data
        from database import async_session
        from database.models import WeeklySubmission, Team
        from sqlalchemy import select
        await init_db()
        await seed_initial_data()

        # Ensure Week 2 is in an editable state for testing
        async with async_session() as db_session:
            t_res = await db_session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))
            team_obj = t_res.scalar_one_or_none()
            if team_obj:
                w2_res = await db_session.execute(
                    select(WeeklySubmission).where(
                        WeeklySubmission.team_id == team_obj.id,
                        WeeklySubmission.week == 2
                    )
                )
                sub2 = w2_res.scalar_one_or_none()
                if sub2:
                    sub2.status = "Pending"
                    await db_session.commit()

        # 1. Login as Student
        login_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "student@srishakthi.ac.in",
            "password": "student@123"
        })
        assert login_res.status_code == 200, f"Student login failed: {login_res.text}"
        s_token = login_res.json()["token"]
        s_headers = {"Authorization": f"Bearer {s_token}"}

        # 2. Student submits deliverables with Tech Stack and Frameworks
        # Zero PPT, zero PDF, zero Output Screenshot uploaded
        tech_input = "FastAPI, React, PyTorch, PostgreSQL, TailwindCSS"
        submit_res = await ac.post("/api/v1/student/submissions/2", json={
            "projectTitle": "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
            "problemStatement": "Autonomous drone disease detection.",
            "solution": "Edge YOLOv8 model on lightweight UAV payload.",
            "technologyUsed": tech_input,
            "obstaclesFaced": "Inference latency on low power embedded edge device.",
            "abstract": "Framework for automated crop disease classification and yield advisory.",
            "repoUrl": "https://github.com/SIET-CSE/crop-drone",
            "demoUrl": "https://demo.siet.ac.in",
            "isSubmit": True
        }, headers=s_headers)
        assert submit_res.status_code == 200, f"Submit deliverable failed: {submit_res.text}"
        sub_data = submit_res.json()
        assert sub_data["technologyUsed"] == tech_input

        # 3. Student fetches submission to confirm persistence
        get_res = await ac.get("/api/v1/student/submissions/2", headers=s_headers)
        assert get_res.status_code == 200
        assert get_res.json()["technologyUsed"] == tech_input

        # 4. Guide Login & Query Weekly Submissions
        g_login = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "dr.manimegalai@siet.ac.in",
            "password": "guide@123"
        })
        assert g_login.status_code == 200, f"Guide login failed: {g_login.text}"
        g_token = g_login.json()["token"]
        g_headers = {"Authorization": f"Bearer {g_token}"}

        g_subs = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
        assert g_subs.status_code == 200, f"Guide weekly subs failed: {g_subs.text}"
        pending_list = g_subs.json()
        assert len(pending_list) >= 1

        target_sub = next((s for s in pending_list if s["teamId"] == "TEAM-CSE-Y3-B04" and s["weekNumber"] == 2), None)
        assert target_sub is not None, "Target team week 2 submission not found in guide response"

        # 5. Verify Tech Stack data representation for Guide Portal
        assert target_sub["technologyUsed"] == tech_input
        assert target_sub["techStack"] == tech_input
        assert isinstance(target_sub["technologiesUsed"], list)
        assert "FastAPI" in target_sub["technologiesUsed"]
        assert "React" in target_sub["technologiesUsed"]
        assert "PyTorch" in target_sub["technologiesUsed"]

        # 6. Verify PPT, PDF, Output Screenshot are completely absent from payload
        for removed in ["pptUrl", "presentationFileName", "reportUrl", "images", "screenshotFile", "presentationFile", "pdfFile"]:
            assert removed not in target_sub, f"Field '{removed}' should not be present in weekly submission"

        # 7. Guide endorses/reviews submission
        sub_id = target_sub["id"]
        review_res = await ac.post(f"/api/v1/guide/submissions/{sub_id}/review", json={
            "status": "APPROVED",
            "comments": "Endorsed with full technical stack verified."
        }, headers=g_headers)
        assert review_res.status_code == 200, f"Review failed: {review_res.text}"
        assert review_res.json()["status"] in ["Approved", "APPROVED"]
