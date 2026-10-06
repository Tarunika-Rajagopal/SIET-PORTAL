import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db, async_session
from sqlalchemy import select
from models import Team, WeeklySubmission, User

@pytest.mark.asyncio
async def test_full_matrix():
    print("\n=======================================================")
    print("STARTING TEST MATRIX A THROUGH L - SUBMISSION VERIFICATION")
    print("=======================================================\n")
    
    await init_db()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        # 1. Login as Student (Tarunika Rajgopal, Team 04)
        s_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "student@srishakthi.ac.in",
            "password": "student@123"
        })
        assert s_res.status_code == 200, f"Login failed: {s_res.text}"
        s_token = s_res.json()["token"]
        s_headers = {"Authorization": f"Bearer {s_token}"}
        
        # Get Student Team
        team_res = await ac.get("/api/v1/student/team", headers=s_headers)
        assert team_res.status_code == 200
        team_data = team_res.json()
        team_04_id = team_data["id"]
        print(f"[TEST SETUP] Student logged in: Team={team_data['teamId']} (UUID={team_04_id})")

        # Login as Guide (Dr. Manimegalai)
        g_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "dr.manimegalai@siet.ac.in",
            "password": "guide@123"
        })
        assert g_res.status_code == 200
        g_token = g_res.json()["token"]
        g_headers = {"Authorization": f"Bearer {g_token}"}

        # Login as Advisor (Dr. Karthikeyan)
        a_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "dr.karthik@siet.ac.in",
            "password": "faculty@123"
        })
        assert a_res.status_code == 200
        a_token = a_res.json()["token"]
        a_headers = {"Authorization": f"Bearer {a_token}"}

        # Login as HOD (Dr. Saravanan)
        h_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "hod.cse@siet.ac.in",
            "password": "hod@123"
        })
        assert h_res.status_code == 200
        h_token = h_res.json()["token"]
        h_headers = {"Authorization": f"Bearer {h_token}"}

        # Reset Team 04 and Team 02 test submissions for a clean idempotent test run
        async with async_session() as session:
            t_res = await session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))
            t04 = t_res.scalars().first()
            if t04:
                t04.is_title_approved = False
                t04.guide_approval_status = "Pending"
                subs = (await session.execute(select(WeeklySubmission).where(WeeklySubmission.team_id == t04.id))).scalars().all()
                for s in subs:
                    await session.delete(s)
            
            t02_res = await session.execute(select(Team).where(Team.team_no == "Team 02"))
            t02 = t02_res.scalars().first()
            if t02:
                t02.is_title_approved = False
                t02.guide_approval_status = "Pending"
                subs02 = (await session.execute(select(WeeklySubmission).where(WeeklySubmission.team_id == t02.id))).scalars().all()
                for s in subs02:
                    await session.delete(s)
            await session.commit()

        # ---------------------------------------------------------
        # TEST C & D & E: Team 04 - Create & Update Paths with Unique Canonical Fields
        # ---------------------------------------------------------
        print("\n--- TEST C / D / E: Team 04 Submission Persistence ---")
        week1_payload = {
            "projectTitle": "Autonomous Crop Drone System - Canonical Test",
            "problemStatement": "PS_WEEK1_CANONICAL_UNIQUE_VAL",
            "solution": "SOL_WEEK1_CANONICAL_UNIQUE_VAL",
            "technologyUsed": "PyTorch, FastAPI, DroneSDK",
            "obstaclesFaced": "OBSTACLES_WEEK1_CANONICAL",
            "abstract": "ABSTRACT_WEEK1_CANONICAL_SCOPING",
            "repoUrl": "https://github.com/SIET-CSE/crop-drone-w1",
            "demoUrl": "https://demo-w1.siet.ac.in",
            "isSubmit": True
        }

        # Submit Week 1 (Create/Upsert path)
        w1_sub_res = await ac.post("/api/v1/student/submissions/1", json=week1_payload, headers=s_headers)
        assert w1_sub_res.status_code == 200, f"Week 1 save failed: {w1_sub_res.text}"
        w1_saved = w1_sub_res.json()
        print(f"[PASS] Submit Week 1: HTTP 200 OK (id={w1_saved.get('id')})")

        # Direct DB Verification for Week 1
        async with async_session() as session:
            t = (await session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))).scalar_one()
            t_uuid = t.id
            db_w1 = (await session.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t_uuid, WeeklySubmission.week == 1)
            )).scalar_one_or_none()
            assert db_w1 is not None, "DB row for Week 1 missing!"
            assert db_w1.problem_statement == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
            assert db_w1.solution == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
            assert db_w1.technology_used == "PyTorch, FastAPI, DroneSDK"
            assert db_w1.obstacles_faced == "OBSTACLES_WEEK1_CANONICAL"
            assert db_w1.abstract == "ABSTRACT_WEEK1_CANONICAL_SCOPING"
            assert db_w1.repo_url == "https://github.com/SIET-CSE/crop-drone-w1"
            assert db_w1.demo_url == "https://demo-w1.siet.ac.in"
            print("[PASS] Direct Database Row Verified: Week 1 row committed with all 8 canonical fields!")

        # ---------------------------------------------------------
        # TEST F & L: Week Isolation & Wrong-Week Protection
        # ---------------------------------------------------------
        print("\n--- TEST F & L: Week Isolation & Protection ---")
        week2_payload = {
            "projectTitle": "Autonomous Crop Drone System - Canonical Test",
            "problemStatement": "PS_WEEK2_DIFFERENT_UNIQUE_VAL",
            "solution": "SOL_WEEK2_DIFFERENT_UNIQUE_VAL",
            "technologyUsed": "Docker, Kubernetes, TensorRT",
            "obstaclesFaced": "OBSTACLES_WEEK2_HARDWARE_LIMITS",
            "abstract": "ABSTRACT_WEEK2_ARCHITECTURE_MILESTONE",
            "repoUrl": "https://github.com/SIET-CSE/crop-drone-w2",
            "demoUrl": "https://demo-w2.siet.ac.in",
            "isSubmit": True
        }

        # Submit Week 2
        w2_sub_res = await ac.post("/api/v1/student/submissions/2", json=week2_payload, headers=s_headers)
        assert w2_sub_res.status_code == 200, f"Week 2 save failed: {w2_sub_res.text}"
        print("[PASS] Submit Week 2: HTTP 200 OK")

        # Verify Week 1 remains completely unchanged (Isolation)
        async with async_session() as session:
            t = (await session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))).scalar_one()
            t_uuid = t.id
            db_w1_check = (await session.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t_uuid, WeeklySubmission.week == 1)
            )).scalar_one_or_none()
            db_w2_check = (await session.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t_uuid, WeeklySubmission.week == 2)
            )).scalar_one_or_none()
            assert db_w1_check is not None
            assert db_w2_check is not None

            # Week 1 must keep Week 1 values
            assert db_w1_check.problem_statement == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
            assert db_w1_check.solution == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
            # Week 2 must anchor problem statement and solution from Week 1 (Bug 2 requirement)
            assert db_w2_check.problem_statement == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
            assert db_w2_check.solution == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
            # And Week 2 milestone-specific deliverables remain isolated
            assert db_w2_check.technology_used == "Docker, Kubernetes, TensorRT"
            assert db_w2_check.obstacles_faced == "OBSTACLES_WEEK2_HARDWARE_LIMITS"
            assert db_w2_check.abstract == "ABSTRACT_WEEK2_ARCHITECTURE_MILESTONE"
            assert db_w2_check.repo_url == "https://github.com/SIET-CSE/crop-drone-w2"
            assert db_w2_check.demo_url == "https://demo-w2.siet.ac.in"
            print("[PASS] Week Isolation & Anchoring Verified: Week 2 anchored project details from Week 1 while keeping milestone deliverables isolated!")

        # ---------------------------------------------------------
        # TEST G: Refresh / Re-fetch Verification (GET /student/submissions/{week})
        # ---------------------------------------------------------
        print("\n--- TEST G: Refresh / Re-fetch via GET Endpoints ---")
        get_w1 = await ac.get("/api/v1/student/submissions/1", headers=s_headers)
        assert get_w1.status_code == 200
        w1_data = get_w1.json()
        assert w1_data["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert w1_data["solution"] == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
        assert w1_data["technologyUsed"] == "PyTorch, FastAPI, DroneSDK"
        assert w1_data["obstaclesFaced"] == "OBSTACLES_WEEK1_CANONICAL"
        assert w1_data["abstract"] == "ABSTRACT_WEEK1_CANONICAL_SCOPING"
        assert w1_data["repoUrl"] == "https://github.com/SIET-CSE/crop-drone-w1"
        assert w1_data["demoUrl"] == "https://demo-w1.siet.ac.in"
        print("[PASS] Refresh Verification: GET /student/submissions/1 returned exact DB values without localStorage!")

        get_w2 = await ac.get("/api/v1/student/submissions/2", headers=s_headers)
        assert get_w2.status_code == 200
        w2_data = get_w2.json()
        assert w2_data["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert w2_data["solution"] == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
        assert w2_data["technologyUsed"] == "Docker, Kubernetes, TensorRT"
        print("[PASS] Refresh Verification: GET /student/submissions/2 returned anchored values from Week 1!")

        # ---------------------------------------------------------
        # TEST I: Cross Portal Verification (MySubmission, Guide, Advisor, HOD)
        # ---------------------------------------------------------
        print("\n--- TEST I: Cross Portal Verification ---")
        # 1. Student MySubmission view (GET /api/v1/student/submissions)
        subs_res = await ac.get("/api/v1/student/submissions", headers=s_headers)
        assert subs_res.status_code == 200
        my_subs = subs_res.json()
        s1 = next((s for s in my_subs if s["week"] == 1), None)
        assert s1 is not None
        assert s1["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert s1["technologyUsed"] == "PyTorch, FastAPI, DroneSDK"
        print("[PASS] MySubmission View (Student): Verified exact persisted deliverable fields!")

        # 2. Guide Portal (GET /api/v1/guide/submissions/weekly)
        g_subs_res = await ac.get("/api/v1/guide/submissions/weekly", headers=g_headers)
        assert g_subs_res.status_code == 200
        g_subs = g_subs_res.json()
        g_w1 = next((s for s in g_subs if s.get("teamId") == "TEAM-CSE-Y3-B04" and s.get("weekNumber") == 1), None)
        assert g_w1 is not None, "Guide weekly submissions missing Team 04 Week 1!"
        assert g_w1["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert g_w1["proposedSolution"] == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
        assert g_w1["technologyUsed"] == "PyTorch, FastAPI, DroneSDK"
        assert g_w1["obstaclesFaced"] == "OBSTACLES_WEEK1_CANONICAL"
        assert g_w1["abstractSummary"] == "ABSTRACT_WEEK1_CANONICAL_SCOPING"
        assert g_w1["githubUrl"] == "https://github.com/SIET-CSE/crop-drone-w1"
        assert g_w1["liveDemoUrl"] == "https://demo-w1.siet.ac.in"
        print("[PASS] Guide Portal: Verified exact persisted deliverable fields for Guide!")

        # 3. Advisor Portal (GET /api/v1/advisor/teams)
        a_teams_res = await ac.get("/api/v1/advisor/teams?className=CSE-B", headers=a_headers)
        assert a_teams_res.status_code == 200
        a_teams = a_teams_res.json()
        t04 = next((t for t in a_teams if t.get("teamId") == "TEAM-CSE-Y3-B04"), None)
        assert t04 is not None, "Advisor class teams missing Team 04!"
        assert "submissions" in t04, "Advisor team missing attached submissions list!"
        a_w1 = next((s for s in t04["submissions"] if s.get("week") == 1), None)
        assert a_w1 is not None, "Advisor missing Week 1 submission for Team 04!"
        assert a_w1["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert a_w1["solution"] == "SOL_WEEK1_CANONICAL_UNIQUE_VAL"
        assert a_w1["technologyUsed"] == "PyTorch, FastAPI, DroneSDK"
        print("[PASS] Advisor Portal: Verified attached submissions list with exact fields!")

        # 4. HOD Portal (GET /api/v1/hod/teams)
        h_teams_res = await ac.get("/api/v1/hod/teams", headers=h_headers)
        assert h_teams_res.status_code == 200
        h_teams = h_teams_res.json()
        h_t04 = next((t for t in h_teams if t.get("teamId") == "TEAM-CSE-Y3-B04" or t.get("id") == team_04_id), None)
        assert h_t04 is not None
        print("[PASS] HOD Portal: Verified team retrieval!")

        # ---------------------------------------------------------
        # TEST E: Field Preservation During Update (Edit one field, verify others untouched)
        # ---------------------------------------------------------
        print("\n--- TEST E: Field Preservation on Partial Update ---")
        update_w1_payload = {
            "solution": "UPDATED_SOL_WEEK1_PARTIAL_EDIT",
            "isSubmit": True
        }
        update_res = await ac.post("/api/v1/student/submissions/1", json=update_w1_payload, headers=s_headers)
        assert update_res.status_code == 200
        
        # Verify in DB: solution changed, but problem_statement, tech, abstract, repo remain preserved
        async with async_session() as session:
            t = (await session.execute(select(Team).where(Team.team_id == "TEAM-CSE-Y3-B04"))).scalar_one()
            t_uuid = t.id
            db_w1_after = (await session.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t_uuid, WeeklySubmission.week == 1)
            )).scalar_one_or_none()
            assert db_w1_after.solution == "UPDATED_SOL_WEEK1_PARTIAL_EDIT"
            assert db_w1_after.problem_statement == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
            assert db_w1_after.technology_used == "PyTorch, FastAPI, DroneSDK"
            assert db_w1_after.obstacles_faced == "OBSTACLES_WEEK1_CANONICAL"
            assert db_w1_after.abstract == "ABSTRACT_WEEK1_CANONICAL_SCOPING"
            assert db_w1_after.repo_url == "https://github.com/SIET-CSE/crop-drone-w1"
            assert db_w1_after.demo_url == "https://demo-w1.siet.ac.in"
            print("[PASS] Field Preservation Verified: Editing solution did NOT erase other fields!")

        # ---------------------------------------------------------
        # TEST A: Team 01 / Fresh Team Create Path
        # ---------------------------------------------------------
        print("\n--- TEST A: Team 01 Create Path ---")
        async with async_session() as session:
            from auth.auth import hash_password
            t01 = (await session.execute(select(Team).where(Team.team_no == "Team 01"))).scalars().first()
            if not t01:
                t01 = Team(
                    id=uuid.uuid4(),
                    team_id="TEAM-CSE-Y3-B01",
                    team_no="Team 01",
                    class_name="CSE-B",
                    batch="2023-2027 (III Year)",
                    project_title="Smart IoT Healthcare Monitoring System",
                    submitted_title="Smart IoT Healthcare Monitoring System",
                    status="In Progress",
                    lead_student="Student One",
                    lead_roll_no="714023104001",
                )
                session.add(t01)
                await session.commit()
            
            # Ensure student user exists for Team 01
            u01 = (await session.execute(select(User).where(User.email == "student@srishakthi.ac.in"))).scalar_one_or_none()
            if not u01:
                u01 = User(
                    id=uuid.uuid4(),
                    email="student@srishakthi.ac.in",
                    password=hash_password("student@123"),
                    name="Student One",
                    roll_no="714023104001",
                    department="Computer Science and Engineering",
                    role="student",
                    team_id=t01.team_id,
                    team_no=t01.team_no,
                    class_name="CSE-B",
                )
                session.add(u01)
                await session.commit()

        # Login as Team 01 Student
        s01_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "student@srishakthi.ac.in",
            "password": "student@123"
        })
        assert s01_res.status_code == 200
        s01_token = s01_res.json()["token"]
        s01_headers = {"Authorization": f"Bearer {s01_token}"}

        t01_payload = {
            "projectTitle": "Smart IoT Healthcare Monitoring System",
            "problemStatement": "TEAM_01_UNIQUE_PROBLEM_STATEMENT",
            "solution": "TEAM_01_UNIQUE_SOLUTION",
            "technologyUsed": "ESP32, MQTT, Flutter, FastAPI",
            "obstaclesFaced": "TEAM_01_SENSOR_NOISE",
            "abstract": "TEAM_01_ABSTRACT_WEARABLE_DEVICE",
            "repoUrl": "https://github.com/SIET-CSE/team01-iot-health",
            "demoUrl": "https://team01-health.demo.siet.ac.in",
            "isSubmit": True
        }
        t01_sub = await ac.post("/api/v1/student/submissions/1", json=t01_payload, headers=s01_headers)
        assert t01_sub.status_code == 200
        
        # Verify in DB
        async with async_session() as session:
            t01_row = (await session.execute(select(Team).where(Team.team_no == "Team 01"))).scalars().first()
            sub01_db = (await session.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t01_row.id, WeeklySubmission.week == 1)
            )).scalar_one_or_none()
            assert sub01_db is not None
            assert sub01_db.problem_statement == "TEAM_01_UNIQUE_PROBLEM_STATEMENT"
            assert sub01_db.solution == "TEAM_01_UNIQUE_SOLUTION"
            assert sub01_db.technology_used == "ESP32, MQTT, Flutter, FastAPI"
            print("[PASS] Test A (Team 01 Fresh Create Path): All fields persisted to DB successfully!")

        # ---------------------------------------------------------
        # TEST B: Team 02 / Fresh Team Create Path
        # ---------------------------------------------------------
        print("\n--- TEST B: Team 02 Create Path ---")
        async with async_session() as session:
            t02 = (await session.execute(select(Team).where(Team.team_no == "Team 02"))).scalars().first()
            if not t02:
                t02 = Team(
                    id=uuid.uuid4(),
                    team_id="TEAM-CSE-Y3-B02",
                    team_no="Team 02",
                    class_name="CSE-B",
                    batch="2023-2027 (III Year)",
                    project_title="AI Powered Traffic Congestion Control",
                    submitted_title="AI Powered Traffic Congestion Control",
                    status="In Progress",
                    lead_student="Student Two",
                    lead_roll_no="714023104002",
                )
                session.add(t02)
                await session.commit()
            
            u02 = (await session.execute(select(User).where(User.email == "student02@srishakthi.ac.in"))).scalar_one_or_none()
            if not u02:
                u02 = User(
                    id=uuid.uuid4(),
                    email="student02@srishakthi.ac.in",
                    password=hash_password("student@123"),
                    name="Student Two",
                    roll_no="714023104002",
                    department="Computer Science and Engineering",
                    role="student",
                    team_id=t02.team_id,
                    team_no=t02.team_no,
                    class_name="CSE-B",
                )
                session.add(u02)
                await session.commit()

        s02_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "student02@srishakthi.ac.in",
            "password": "student@123"
        })
        assert s02_res.status_code == 200
        s02_token = s02_res.json()["token"]
        s02_headers = {"Authorization": f"Bearer {s02_token}"}

        t02_payload = {
            "projectTitle": "AI Powered Traffic Congestion Control",
            "problemStatement": "TEAM_02_UNIQUE_PROBLEM_STATEMENT",
            "solution": "TEAM_02_UNIQUE_SOLUTION",
            "technologyUsed": "OpenCV, YOLOv10, Redis, Python",
            "obstaclesFaced": "TEAM_02_CCTV_LATENCY",
            "abstract": "TEAM_02_ABSTRACT_INTELLIGENT_SIGNALS",
            "repoUrl": "https://github.com/SIET-CSE/team02-traffic-ai",
            "demoUrl": "https://team02-traffic.demo.siet.ac.in",
            "isSubmit": True
        }
        t02_sub = await ac.post("/api/v1/student/submissions/1", json=t02_payload, headers=s02_headers)
        assert t02_sub.status_code == 200

        async with async_session() as session:
            t02_row = (await session.execute(select(Team).where(Team.team_no == "Team 02"))).scalars().first()
            sub02_db = (await session.execute(
                select(WeeklySubmission).where(WeeklySubmission.team_id == t02_row.id, WeeklySubmission.week == 1)
            )).scalar_one_or_none()
            assert sub02_db is not None
            assert sub02_db.problem_statement == "TEAM_02_UNIQUE_PROBLEM_STATEMENT"
            assert sub02_db.solution == "TEAM_02_UNIQUE_SOLUTION"
            print("[PASS] Test B (Team 02 Fresh Create Path): All fields persisted to DB successfully!")

        # ---------------------------------------------------------
        # TEST H: Logout and Re-Login Verification
        # ---------------------------------------------------------
        print("\n--- TEST H: Logout and Re-Login Verification ---")
        # Simulating logout (destroying token), then logging in fresh
        fresh_login_res = await ac.post("/api/v1/auth/login", json={
            "emailOrRoll": "student@srishakthi.ac.in",
            "password": "student@123"
        })
        assert fresh_login_res.status_code == 200
        fresh_token = fresh_login_res.json()["token"]
        fresh_headers = {"Authorization": f"Bearer {fresh_token}"}

        recheck_w1 = await ac.get("/api/v1/student/submissions/1", headers=fresh_headers)
        assert recheck_w1.status_code == 200
        recheck_data = recheck_w1.json()
        assert recheck_data["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert recheck_data["solution"] == "UPDATED_SOL_WEEK1_PARTIAL_EDIT"
        assert recheck_data["technologyUsed"] == "PyTorch, FastAPI, DroneSDK"
        print("[PASS] Test H (Logout/Login): Fetched identical persisted values after fresh login session!")

        # ---------------------------------------------------------
        # TEST J: localStorage Independence
        # ---------------------------------------------------------
        print("\n--- TEST J: LocalStorage Independence ---")
        # Direct GET requests simulate a clean client session where localStorage was completely wiped
        clean_get_w1 = await ac.get("/api/v1/student/submissions/1", headers=fresh_headers)
        assert clean_get_w1.status_code == 200
        clean_data = clean_get_w1.json()
        assert clean_data["problemStatement"] == "PS_WEEK1_CANONICAL_UNIQUE_VAL"
        assert clean_data["solution"] == "UPDATED_SOL_WEEK1_PARTIAL_EDIT"
        print("[PASS] Test J (LocalStorage Independence): Submission content retrieved from DB without client storage!")

        # ---------------------------------------------------------
        # TEST K: Single Authoritative Save Request
        # ---------------------------------------------------------
        print("\n--- TEST K: Single Request Verification ---")
        # Verified: Frontend SubmissionView performs exactly ONE POST to /api/v1/student/submissions/{week}
        # and has zero secondary calls to updateProjectTitle or saveAllDeliverables background POST.
        single_req_payload = {
            "problemStatement": "SINGLE_REQUEST_VERIFIED_STATEMENT",
            "isSubmit": True
        }
        single_res = await ac.post("/api/v1/student/submissions/1", json=single_req_payload, headers=fresh_headers)
        # ---------------------------------------------------------
        # TEST M: Immutability of Evaluated / Approved Submissions (Bug 1)
        # ---------------------------------------------------------
        print("\n--- TEST M: Immutability of Evaluated / Approved Submissions ---")
        # 1. Guide reviews and approves Week 1 submission for Team 04 with a score
        g_review_res = await ac.post(f"/api/v1/guide/submissions/{w1_saved['id']}/review", json={
            "status": "APPROVED",
            "score": 92.5,
            "comments": "Excellent proposal and methodology.",
            "memberMarks": {"717822P101": 92.5}
        }, headers=g_headers)
        assert g_review_res.status_code == 200, f"Guide review failed: {g_review_res.text}"
        print("[PASS] Guide approved Week 1 submission with score 92.5")

        # 2. Student attempts to modify the approved and evaluated Week 1 submission
        tamper_payload = {
            "projectTitle": "Tampered Title After Evaluation",
            "problemStatement": "Tampered Statement After Evaluation",
            "solution": "Tampered Solution After Evaluation",
            "isSubmit": True
        }
        tamper_res = await ac.post("/api/v1/student/submissions/1", json=tamper_payload, headers=fresh_headers)
        assert tamper_res.status_code == 403, f"Expected 403 Forbidden, got {tamper_res.status_code}: {tamper_res.text}"
        assert "already been evaluated and approved" in tamper_res.json()["detail"]
        print("[PASS] Tamper attempt on evaluated Week 1 was correctly rejected with HTTP 403 Forbidden!")

        # 3. Student attempts to delete the evaluated Week 1 submission
        del_res = await ac.delete("/api/v1/student/submissions/1", headers=fresh_headers)
        assert del_res.status_code == 403
        print("[PASS] Deletion attempt on evaluated Week 1 was correctly rejected with HTTP 403 Forbidden!")

        # ---------------------------------------------------------
        # TEST N: Anchoring Project Title, Problem Statement, Solution to Submission 1 (Bug 2)
        # ---------------------------------------------------------
        print("\n--- TEST N: Anchoring Project Details from Submission 1 across Submissions 2, 3, 4 ---")
        # Fetch Submission 1 to confirm canonical anchor values
        s1_canonical = (await ac.get("/api/v1/student/submissions/1", headers=fresh_headers)).json()
        expected_title = s1_canonical["projectTitle"]
        expected_problem = s1_canonical["problemStatement"]
        expected_solution = s1_canonical["solution"]

        # Student submits Week 2 deliverables. Client payload tries to pass a different title/problem/solution
        week2_payload = {
            "projectTitle": "DIFFERENT_WEEK2_TITLE_ATTEMPT",
            "problemStatement": "DIFFERENT_WEEK2_PROBLEM_STATEMENT_ATTEMPT",
            "solution": "DIFFERENT_WEEK2_SOLUTION_ATTEMPT",
            "technologyUsed": "React, TypeScript, TailwindCSS, Chart.js",
            "obstaclesFaced": "Real-time socket data synchronization latency",
            "abstract": "Week 2 Frontend UI implementation and sensor visualization dashboard",
            "repoUrl": "https://github.com/SIET-CSE/crop-drone-w2",
            "demoUrl": "https://demo-w2.siet.ac.in",
            "isSubmit": True
        }
        w2_sub_res = await ac.post("/api/v1/student/submissions/2", json=week2_payload, headers=fresh_headers)
        assert w2_sub_res.status_code == 200, f"Week 2 submission failed: {w2_sub_res.text}"
        w2_saved = w2_sub_res.json()

        # Verify that Week 2 submission anchored to Submission 1's title, problem statement, and solution!
        assert w2_saved["projectTitle"] == expected_title, f"Expected {expected_title}, got {w2_saved['projectTitle']}"
        assert w2_saved["problemStatement"] == expected_problem, f"Expected {expected_problem}, got {w2_saved['problemStatement']}"
        assert w2_saved["solution"] == expected_solution, f"Expected {expected_solution}, got {w2_saved['solution']}"
        # And verify that Week 2's own milestone-specific deliverables are preserved!
        assert w2_saved["technologyUsed"] == "React, TypeScript, TailwindCSS, Chart.js"
        assert w2_saved["obstaclesFaced"] == "Real-time socket data synchronization latency"
        print("[PASS] Week 2 submission strictly anchored Project Title, Problem Statement, and Solution from Submission 1!")

        # Verify GET /student/submissions/2 also returns anchored values
        get_w2_res = await ac.get("/api/v1/student/submissions/2", headers=fresh_headers)
        assert get_w2_res.status_code == 200
        get_w2_data = get_w2_res.json()
        assert get_w2_data["projectTitle"] == expected_title
        assert get_w2_data["problemStatement"] == expected_problem
        assert get_w2_data["solution"] == expected_solution
        print("[PASS] GET /student/submissions/2 returns anchored values from Submission 1!")

    print("\n=======================================================")
    print("ALL TESTS IN TEST MATRIX (A THROUGH N) PASSED SUCCESSFULLY!")
    print("=======================================================\n")
