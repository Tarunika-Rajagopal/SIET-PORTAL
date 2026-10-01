"""Isolated test fixtures and seeding for automated pytest runs on SQLite.
Keeps mock test data strictly contained within the test suite and out of production services.
"""
import uuid
from sqlalchemy import select
from database import async_session
from models import User, Faculty, Student, Team, TeamMember, WeeklySubmission
from auth.auth import hash_password


async def seed_test_data():
    """Seed test fixtures for automated pytest execution in SQLite."""
    async with async_session() as session:
        # Check if users already exist
        res = await session.execute(select(User).limit(1))
        if res.scalar_one_or_none():
            return

        # 1. Test Users
        users = [
            User(
                id=uuid.uuid4(),
                email="admin@siet.ac.in",
                password=hash_password("admin@123"),
                name="Department Administrator",
                department="Computer Science and Engineering",
                role="admin",
                designation="System & Database Administrator",
            ),
            User(
                id=uuid.uuid4(),
                email="hod.cse@siet.ac.in",
                password=hash_password("hod@123"),
                name="Dr. N. Saravanan",
                department="Computer Science and Engineering",
                role="hod",
                designation="Professor & Head of Department",
                phone="+91 94432 10987",
            ),
            User(
                id=uuid.uuid4(),
                email="dr.karthik@siet.ac.in",
                password=hash_password("faculty@123"),
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
                password=hash_password("guide@123"),
                name="Dr. P. Manimegalai",
                department="Computer Science and Engineering",
                role="guide",
                designation="Professor & Research Mentor",
                phone="+91 98433 87654",
            ),
            User(
                id=uuid.uuid4(),
                email="student@srishakthi.ac.in",
                password=hash_password("student@123"),
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
        ]
        session.add_all(users)

        # 2. Test Team
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
            members_count=1,
            lead_student="Tarunika Rajgopal",
            lead_roll_no="714023104112",
            is_title_approved=True,
            guide_approval_status="Approved",
            problem_statement="Manual crop scouting is slow.",
            proposed_solution="Custom lightweight YOLOv8 segmentation.",
            abstract="Precision agriculture drone framework.",
            repo_url="https://github.com/SIET-CSE/agri-drone-yolo",
            demo_url="https://agri-drone-demo.siet.ac.in",
        )
        session.add(team)

        # 3. Test Student & TeamMember
        s_id = uuid.uuid4()
        s = Student(
            id=s_id,
            roll_no="714023104112",
            name="Tarunika Rajgopal",
            email="student@srishakthi.ac.in",
            class_section="CSE-B",
            team_no="Team 04",
            project_title=team.project_title,
            guide=team.guide_name,
        )
        session.add(s)

        tm = TeamMember(
            id=uuid.uuid4(),
            team_id=team_id,
            student_id=s_id,
            roll_no="714023104112",
            name="Tarunika Rajgopal",
            email="student@srishakthi.ac.in",
            is_lead=True,
            member_role="Team Lead",
        )
        session.add(tm)

        # 4. Test Weekly Submissions
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
                guide_name=team.guide_name,
            )
            session.add(ws)

        # 5. Test Faculty
        faculties = [
            Faculty(
                id=uuid.uuid4(),
                name="Dr. R. Karthikeyan",
                email="dr.karthik@siet.ac.in",
                designation="Professor",
                role="Advisor & Guide",
                advisor_batch="2023-2027 (III Year)",
                advisor_class="CSE-B",
                specialization="Cloud Distributed Systems & Cybersecurity",
                teams_count=1,
                max_quota=5,
                status="Active",
            ),
            Faculty(
                id=uuid.uuid4(),
                name="Dr. P. Manimegalai",
                email="dr.manimegalai@siet.ac.in",
                designation="Associate Professor",
                role="Guide",
                specialization="AI, Deep Learning & UAV Vision",
                teams_count=1,
                max_quota=5,
                status="Active",
            ),
        ]
        session.add_all(faculties)

        await session.commit()
