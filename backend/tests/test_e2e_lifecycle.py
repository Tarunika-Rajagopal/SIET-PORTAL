"""End-to-End (E2E) Lifecycle Workflow Tests for SIET Portal.
Validates multi-role cross-portal workflows:
1. Student submission -> Guide evaluation -> Student grade verification.
2. HOD release lock enforcement (403 when locked, 200 when unlocked).
3. Project title proposal -> Guide approval -> Student team reflection.
4. Advisor class oversight & available guides inspection.
"""
import os
import sys
from pathlib import Path

# Force SQLite for test isolation
os.environ["USE_SQLITE"] = "true"

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db
from tests.test_fixtures import seed_test_data as seed_initial_data


async def setup_test_environment():
    await init_db()
    await seed_initial_data()


async def get_token(ac: AsyncClient, email: str, pwd: str) -> str:
    res = await ac.post("/api/v1/auth/login", json={"emailOrRoll": email, "password": pwd})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["token"]


@pytest.mark.asyncio
async def test_e2e_submission_and_guide_evaluation_flow():
    """E2E Flow: HOD unlocks week -> Student submits -> Guide grades -> Student views score."""
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        hod_token = await get_token(ac, "hod.cse@siet.ac.in", "hod@123")
        stu_token = await get_token(ac, "student@srishakthi.ac.in", "student@123")
        guide_token = await get_token(ac, "dr.manimegalai@siet.ac.in", "guide@123")

        hod_headers = {"Authorization": f"Bearer {hod_token}"}
        stu_headers = {"Authorization": f"Bearer {stu_token}"}
        guide_headers = {"Authorization": f"Bearer {guide_token}"}

        # Ensure Week 3 is in a submittable state if DB has state from previous runs
        from database.database import async_session
        from database.models import WeeklySubmission, Team
        from sqlalchemy import select
        async with async_session() as db_session:
            t_res = await db_session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))
            team_obj = t_res.scalar_one_or_none()
            if team_obj:
                w3_res = await db_session.execute(
                    select(WeeklySubmission).where(
                        WeeklySubmission.team_id == team_obj.id,
                        WeeklySubmission.week == 3
                    )
                )
                w3_sub = w3_res.scalar_one_or_none()
                if w3_sub:
                    w3_sub.status = "Draft"
                    w3_sub.score = None
                    await db_session.commit()

        # 1. HOD releases Week 3
        rel_res = await ac.put(
            "/api/v1/hod/week-releases/3",
            json={"released": True},
            headers=hod_headers,
        )
        assert rel_res.status_code == 200
        assert rel_res.json()["released"] is True

        # 2. Student submits Week 3 deliverables
        submission_payload = {
            "title": "Week 3 Deliverables - Preprocessed Drone Vision Dataset",
            "problemStatement": "Crop pest segmentation dataset normalization.",
            "solution": "Augmented 1200 drone aerial frames with Roboflow pipeline.",
            "technologyUsed": "Python, OpenCV, Albumentations",
            "obstaclesFaced": "Varying illumination in midday drone flights.",
            "abstract": "Normalized agricultural aerial imagery with bounding polygons.",
            "repoUrl": "https://github.com/SIET-CSE/agri-drone-dataset",
            "demoUrl": "https://agri-drone-demo.siet.ac.in",
            "isSubmit": True,
        }
        sub_res = await ac.post(
            "/api/v1/student/submissions/3",
            json=submission_payload,
            headers=stu_headers,
        )
        assert sub_res.status_code == 200
        assert sub_res.json().get("status") == "Submitted"

        # 3. Guide inspects weekly submissions
        guide_subs_res = await ac.get("/api/v1/guide/submissions/weekly", headers=guide_headers)
        assert guide_subs_res.status_code == 200
        all_subs = guide_subs_res.json()
        target_sub = next((s for s in all_subs if s.get("weekNumber") == 3 or s.get("week") == 3), None)
        assert target_sub is not None, "Submitted week 3 not found in Guide submissions"
        sub_id = target_sub["id"]

        # 4. Guide reviews and scores the submission
        review_payload = {
            "status": "APPROVED",
            "score": 94.0,
            "comments": "Superb preprocessing pipeline and comprehensive augmentations.",
        }
        rev_res = await ac.post(
            f"/api/v1/guide/submissions/{sub_id}/review",
            json=review_payload,
            headers=guide_headers,
        )
        assert rev_res.status_code == 200

        # 5. Student verifies updated submission and grade
        stu_sub_res = await ac.get("/api/v1/student/submissions/3", headers=stu_headers)
        assert stu_sub_res.status_code == 200
        stu_sub_data = stu_sub_res.json()
        assert stu_sub_data.get("status") == "Approved"
        assert stu_sub_data.get("score") == 94.0
        assert "Superb" in (stu_sub_data.get("comments") or "")


@pytest.mark.asyncio
async def test_e2e_hod_lock_enforcement():
    """E2E Flow: When HOD locks a week, student submission is strictly blocked with 403."""
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        hod_token = await get_token(ac, "hod.cse@siet.ac.in", "hod@123")
        stu_token = await get_token(ac, "student@srishakthi.ac.in", "student@123")

        hod_headers = {"Authorization": f"Bearer {hod_token}"}
        stu_headers = {"Authorization": f"Bearer {stu_token}"}

        # 1. HOD locks Week 4
        lock_res = await ac.put(
            "/api/v1/hod/week-releases/4",
            json={"released": False},
            headers=hod_headers,
        )
        assert lock_res.status_code == 200
        assert lock_res.json()["released"] is False

        # 2. Student verifies week 4 shows locked in releases
        rel_res = await ac.get("/api/v1/student/week-releases", headers=stu_headers)
        assert rel_res.status_code == 200
        releases = rel_res.json().get("releases", {})
        assert releases.get("4") is False

        # 3. Student attempts to submit deliverables for locked Week 4 -> Expect 403 Forbidden
        sub_res = await ac.post(
            "/api/v1/student/submissions/4",
            json={
                "title": "Week 4 System Architecture",
                "solution": "Edge TPU drone companion pipeline",
                "isSubmit": True,
            },
            headers=stu_headers,
        )
        assert sub_res.status_code == 403
        assert "locked" in sub_res.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_e2e_project_title_proposal_and_approval():
    """E2E Flow: Student updates title -> Guide approves -> Team details reflect approval."""
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        stu_token = await get_token(ac, "student@srishakthi.ac.in", "student@123")
        guide_token = await get_token(ac, "dr.manimegalai@siet.ac.in", "guide@123")

        stu_headers = {"Authorization": f"Bearer {stu_token}"}
        guide_headers = {"Authorization": f"Bearer {guide_token}"}

        # 1. Student fetches own team to get team identifier
        team_res = await ac.get("/api/v1/student/team", headers=stu_headers)
        assert team_res.status_code == 200
        team_data = team_res.json()
        team_id = team_data.get("teamId") or team_data.get("team_id") or "TEAM-CSE-Y3-B04"

        # 2. Student submits updated title proposal
        new_title = "Edge-AI Autonomous Crop Health & Drone Monitoring System"
        up_res = await ac.put(
            f"/api/v1/projects/team/{team_id}/title",
            json={"title": new_title},
            headers=stu_headers,
        )
        assert up_res.status_code == 200

        # 3. Guide approves title
        appr_res = await ac.post(
            f"/api/v1/projects/{team_id}/title-approval",
            json={
                "decision": "APPROVED",
                "remarks": "Title well-aligned with department research scope.",
            },
            headers=guide_headers,
        )
        assert appr_res.status_code == 200

        # 4. Student verifies team record reflects updated title and approval
        refreshed_team = await ac.get("/api/v1/student/team", headers=stu_headers)
        assert refreshed_team.status_code == 200
        data = refreshed_team.json()
        assert data.get("isTitleApproved") is True or data.get("titleApproved") is True or data.get("guideApprovalStatus") == "Approved"


@pytest.mark.asyncio
async def test_e2e_advisor_class_and_guide_oversight():
    """E2E Flow: Advisor monitors assigned class teams and available faculty guides."""
    await setup_test_environment()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        adv_token = await get_token(ac, "dr.karthik@siet.ac.in", "faculty@123")
        adv_headers = {"Authorization": f"Bearer {adv_token}"}

        # 1. Advisor fetches class teams
        teams_res = await ac.get("/api/v1/advisor/teams?className=CSE-B", headers=adv_headers)
        assert teams_res.status_code == 200
        teams = teams_res.json()
        assert isinstance(teams, list)
        assert len(teams) > 0

        # 2. Advisor fetches available guides
        guides_res = await ac.get("/api/v1/advisor/available-guides", headers=adv_headers)
        assert guides_res.status_code == 200
        guides = guides_res.json()
        assert isinstance(guides, list)
        assert len(guides) > 0
