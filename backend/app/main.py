import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import init_db, async_session, db_status
from models import User, Faculty, Student, Team, TeamMember, WeeklySubmission, Checklist
from sqlalchemy import select
import uuid
from datetime import datetime

# Routers
from routers.auth_router import router as auth_router
from routers.student_router import router as student_router
from routers.guide_router import router as guide_router
from routers.project_router import router as project_router


async def seed_initial_data():
    """Seed base demonstration data if database is empty"""
    async with async_session() as session:
        # Check if users already exist
        res = await session.execute(select(User).limit(1))
        if res.scalar_one_or_none():
            return

        print("[Seed] Seeding default SIET Portal users, faculty, students, and teams...")

        # 1. Users
        users = [
            User(
                id=uuid.uuid4(),
                email="admin@siet.ac.in",
                password="admin@123",
                name="Department Administrator",
                department="Computer Science and Engineering",
                role="admin",
                designation="System & Database Administrator",
            ),
            User(
                id=uuid.uuid4(),
                email="hod.cse@siet.ac.in",
                password="hod@123",
                name="Dr. N. Saravanan",
                department="Computer Science and Engineering",
                role="hod",
                designation="Professor & Head of Department",
                phone="+91 94432 10987",
            ),
            User(
                id=uuid.uuid4(),
                email="dr.karthik@siet.ac.in",
                password="faculty@123",
                name="Dr. R. Karthikeyan",
                department="Computer Science and Engineering",
                role="advisor",
                designation="Professor & Designated Class Advisor",
                phone="+91 98421 23456",
                class_name="CSE-B",
                section="B",
                batch="2023-2027 (III Year)",
                advisor_class="CSE-B",
                advisor_batch="2023-2027 (III Year)",
            ),
            User(
                id=uuid.uuid4(),
                email="dr.manimegalai@siet.ac.in",
                password="guide@123",
                name="Dr. P. Manimegalai",
                department="Computer Science and Engineering",
                role="guide",
                designation="Professor & Research Mentor",
                phone="+91 98433 87654",
            ),
            User(
                id=uuid.uuid4(),
                email="student@srishakthi.ac.in",
                password="student@123",
                name="Tarunika Rajgopal",
                roll_no="714023104112",
                department="Computer Science and Engineering",
                role="student",
                team_id="TEAM-CSE-Y3-B04",
                team_no="Team 04",
                class_name="CSE-B",
                section="B",
                batch="2023-2027 (III Year)",
                guide_name="Dr. P. Manimegalai",
                advisor_name="Dr. R. Karthikeyan",
            ),
            User(
                id=uuid.uuid4(),
                email="vigneshwaran.m@srishakthi.ac.in",
                password="student@123",
                name="Vigneshwaran M",
                roll_no="714023104178",
                department="Computer Science and Engineering",
                role="student",
                team_id="TEAM-CSE-Y3-B04",
                team_no="Team 04",
                class_name="CSE-B",
                section="B",
                batch="2023-2027 (III Year)",
            ),
            User(
                id=uuid.uuid4(),
                email="vishnupriya.s@srishakthi.ac.in",
                password="student@123",
                name="Vishnu Priya S",
                roll_no="714023104189",
                department="Computer Science and Engineering",
                role="student",
                team_id="TEAM-CSE-Y3-B04",
                team_no="Team 04",
                class_name="CSE-B",
                section="B",
                batch="2023-2027 (III Year)",
            ),
            User(
                id=uuid.uuid4(),
                email="kavitha.r@srishakthi.ac.in",
                password="student@123",
                name="Kavitha R",
                roll_no="714023104066",
                department="Computer Science and Engineering",
                role="student",
                team_id="TEAM-CSE-Y3-B04",
                team_no="Team 04",
                class_name="CSE-B",
                section="B",
                batch="2023-2027 (III Year)",
            ),
        ]
        session.add_all(users)

        # 2. Team 04
        team_id = uuid.uuid4()
        team = Team(
            id=team_id,
            team_id="TEAM-CSE-Y3-B04",
            team_no="Team 04",
            class_name="CSE-B",
            batch="2023-2027 (III Year)",
            project_title="Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
            submitted_title="Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
            guide_name="Dr. P. Manimegalai",
            guide_email="dr.manimegalai@siet.ac.in",
            advisor_name="Dr. R. Karthikeyan",
            advisor_email="dr.karthik@siet.ac.in",
            status="In Progress",
            progress=40,
            capacity=4,
            members_count=4,
            lead_student="Tarunika Rajgopal",
            lead_roll_no="714023104112",
            is_title_approved=True,
            guide_approval_status="Approved",
            problem_statement="Manual crop scouting across vast farmland is slow and fails to arrest disease outbreaks early.",
            proposed_solution="Custom lightweight YOLOv8 segmentation on drone companion computer with offline inference.",
            abstract="Precision agriculture autonomous drone framework featuring real-time disease classification and cloud advisory dashboard.",
            repo_url="https://github.com/SIET-CSE/agri-drone-yolo",
            demo_url="https://agri-drone-demo.siet.ac.in",
        )
        session.add(team)

        # 3. Students & Team Members
        student_records = [
            ("714023104112", "Tarunika Rajgopal", "student@srishakthi.ac.in", True, "Team Lead"),
            ("714023104178", "Vigneshwaran M", "vigneshwaran.m@srishakthi.ac.in", False, "Team Member"),
            ("714023104189", "Vishnu Priya S", "vishnupriya.s@srishakthi.ac.in", False, "Team Member"),
            ("714023104066", "Kavitha R", "kavitha.r@srishakthi.ac.in", False, "Team Member"),
        ]

        for roll, name, email, is_lead, role in student_records:
            s_id = uuid.uuid4()
            s = Student(
                id=s_id,
                roll_no=roll,
                name=name,
                email=email,
                class_section="CSE-B",
                team_no="Team 04",
                project_title="Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
                guide="Dr. P. Manimegalai",
            )
            session.add(s)

            tm = TeamMember(
                id=uuid.uuid4(),
                team_id=team_id,
                student_id=s_id,
                roll_no=roll,
                name=name,
                email=email,
                is_lead=is_lead,
                member_role=role,
            )
            session.add(tm)

        # 4. Weekly Submissions
        weeks_data = [
            (1, "Problem Statement & Scope Formulation", "Approved", 88.0, "Approved. Thorough scope."),
            (2, "Literature Survey & Related Works", "Approved", 92.0, "Clear architectural justification."),
            (3, "Dataset Collection & Preprocessing", "Submitted", None, "Awaiting review."),
            (4, "System Architecture & Block Diagram", "Pending", None, None),
        ]
        for w, title, status_val, score_val, comm in weeks_data:
            ws = WeeklySubmission(
                id=uuid.uuid4(),
                team_id=team_id,
                week=w,
                title=title,
                status=status_val,
                submission_date="15 Feb 2026" if status_val != "Pending" else None,
                score=score_val,
                max_score=100.0,
                comments=comm,
                project_title=team.project_title,
                guide_name="Dr. P. Manimegalai",
            )
            session.add(ws)

        await session.commit()
        print("[Seed] Seed data committed successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
        try:
            await seed_initial_data()
        except Exception as e:
            print(f"[Seed] Seeding skipped or failed: {e}")
    except Exception as e:
        print(f"[Startup] Database unavailable: {e}")
        print("[Startup] Server will start, but DB-dependent endpoints will fail.")
    yield
    # Shutdown


app = FastAPI(
    title="SIET Project Portal API",
    version="1.0.0",
    description="FastAPI Backend for SIET CSE Project Portal matching frontend apiClient endpoints.",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite development server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(student_router)
app.include_router(guide_router)
app.include_router(project_router)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    detail = str(exc)
    if "connect" in detail.lower() or "connection" in detail.lower():
        return JSONResponse(
            status_code=503,
            content={"detail": f"Database connection failed: {detail}"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {detail}"},
    )


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SIET Project Portal Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    if db_status["connected"]:
        return {"status": "healthy", "database": "connected"}
    return JSONResponse(
        status_code=503,
        content={"status": "unhealthy", "database": "disconnected", "error": db_status["error"]},
    )
