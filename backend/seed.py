import asyncio
from app.core.database import AsyncSessionLocal, engine, Base
from app.repositories.academic_repository import AcademicRepository
from app.repositories.user_repository import UserRepository
from app.repositories.faculty_student_repository import FacultyStudentRepository
from app.repositories.team_repository import TeamRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.submission_repository import SubmissionRepository
from app.core.security import get_password_hash
from app.core.logging import logger
from sqlalchemy.future import select
from app.models.academic import Batch, Section, AcademicWeek
from app.models.teams import Team, TeamMember
from app.models.projects import Project
from app.models.submissions import WeeklySubmission

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        academic_repo = AcademicRepository(db)
        user_repo = UserRepository(db)
        fs_repo = FacultyStudentRepository(db)
        team_repo = TeamRepository(db)
        proj_repo = ProjectRepository(db)
        sub_repo = SubmissionRepository(db)

        logger.info("Starting database seeding process...")

        # 1. Seed Department
        dept = await academic_repo.get_department_by_code("CSE")
        if not dept:
            dept = await academic_repo.create_department("Computer Science and Engineering", "CSE")
            logger.info("Created department: Computer Science and Engineering")

        # 2. Seed Batch
        res_batch = await db.execute(select(Batch).where(Batch.department_id == dept.id, Batch.name == "2023-2027 (III Year)"))
        batch = res_batch.scalars().first()
        if not batch:
            batch = await academic_repo.create_batch(dept.id, "2023-2027 (III Year)", start_year=2023, end_year=2027)
            logger.info("Created batch: 2023-2027 (III Year)")

        # 3. Seed Section
        res_sec = await db.execute(select(Section).where(Section.batch_id == batch.id, Section.name == "CSE-B"))
        section = res_sec.scalars().first()
        if not section:
            section = await academic_repo.create_section(batch.id, "CSE-B")
            logger.info("Created section: CSE-B")

        # 4. Seed Academic Weeks (0-16, Week 0 is current)
        for w_num in range(0, 17):
            res_w = await db.execute(select(AcademicWeek).where(AcademicWeek.batch_id == batch.id, AcademicWeek.week_number == w_num))
            existing_w = res_w.scalars().first()
            if not existing_w:
                await academic_repo.create_academic_week(
                    week_number=w_num,
                    is_current=(w_num == 0),
                    batch_id=batch.id
                )
        logger.info("Seeded academic weeks 0 to 16 (Week 0 marked current)")

        # 5. Seed Roles
        role_names = ["student", "guide", "advisor", "hod", "admin"]
        roles_dict = {}
        for r_name in role_names:
            role = await user_repo.get_role_by_name(r_name)
            if not role:
                role = await user_repo.create_role(r_name, f"{r_name.capitalize()} Role")
            roles_dict[r_name] = role
        logger.info("Seeded 5 standard RBAC roles: student, guide, advisor, hod, admin")

        # 6. Seed Accounts
        # A. Student - Lead
        student_user = await user_repo.get_user_by_email("student@srishakthi.ac.in")
        if not student_user:
            student_user = await user_repo.create_user(
                email="student@srishakthi.ac.in",
                password_hash=get_password_hash("student@123"),
                name="Tarunika Rajgopal",
                department_id=dept.id
            )
            await user_repo.assign_role_to_user(student_user.id, roles_dict["student"].id)
            student_rec = await fs_repo.create_student(
                user_id=student_user.id,
                roll_no="714023104112",
                batch_id=batch.id,
                section_id=section.id
            )
            logger.info("Seeded student account: student@srishakthi.ac.in")
        else:
            student_rec = await fs_repo.get_student_by_user_id(student_user.id)

        # Team Members (Vigneshwaran M, Vishnu Priya S, Kavitha R)
        other_members_data = [
            ("vigneshwaran.m@srishakthi.ac.in", "Vigneshwaran M", "714023104178", "Team Member"),
            ("vishnupriya.s@srishakthi.ac.in", "Vishnu Priya S", "714023104189", "Team Member"),
            ("kavitha.r@srishakthi.ac.in", "Kavitha R", "714023104066", "Team Member")
        ]
        other_student_recs = []
        for email, name, roll_no, m_role in other_members_data:
            u = await user_repo.get_user_by_email(email)
            if not u:
                u = await user_repo.create_user(
                    email=email,
                    password_hash=get_password_hash("student@123"),
                    name=name,
                    department_id=dept.id
                )
                await user_repo.assign_role_to_user(u.id, roles_dict["student"].id)
                s_rec = await fs_repo.create_student(
                    user_id=u.id,
                    roll_no=roll_no,
                    batch_id=batch.id,
                    section_id=section.id
                )
            else:
                s_rec = await fs_repo.get_student_by_user_id(u.id)
            other_student_recs.append((s_rec, m_role))

        # B. Guide
        guide_user = await user_repo.get_user_by_email("dr.manimegalai@siet.ac.in")
        if not guide_user:
            guide_user = await user_repo.create_user(
                email="dr.manimegalai@siet.ac.in",
                password_hash=get_password_hash("guide@123"),
                name="Dr. P. Manimegalai",
                department_id=dept.id,
                designation="Professor"
            )
            await user_repo.assign_role_to_user(guide_user.id, roles_dict["guide"].id)
            await fs_repo.create_faculty(
                user_id=guide_user.id,
                employee_id="EMP-CSE-001",
                designation="Professor",
                specialization="Artificial Intelligence & Machine Learning",
                guide_quota=5
            )
            logger.info("Seeded guide account: dr.manimegalai@siet.ac.in")

        # C. Advisor
        advisor_user = await user_repo.get_user_by_email("dr.karthik@siet.ac.in")
        if not advisor_user:
            advisor_user = await user_repo.create_user(
                email="dr.karthik@siet.ac.in",
                password_hash=get_password_hash("faculty@123"),
                name="Dr. R. Karthikeyan",
                department_id=dept.id,
                designation="Associate Professor"
            )
            await user_repo.assign_role_to_user(advisor_user.id, roles_dict["advisor"].id)
            await user_repo.assign_role_to_user(advisor_user.id, roles_dict["guide"].id)
            await fs_repo.create_faculty(
                user_id=advisor_user.id,
                employee_id="EMP-CSE-002",
                designation="Associate Professor",
                specialization="Cloud Computing & Distributed Systems",
                guide_quota=5
            )
            logger.info("Seeded advisor account: dr.karthik@siet.ac.in (Roles: advisor, guide)")

        # D. HOD
        hod_user = await user_repo.get_user_by_email("hod.cse@siet.ac.in")
        if not hod_user:
            hod_user = await user_repo.create_user(
                email="hod.cse@siet.ac.in",
                password_hash=get_password_hash("hod@123"),
                name="Dr. N. Saravanan",
                department_id=dept.id,
                designation="Professor & HOD"
            )
            await user_repo.assign_role_to_user(hod_user.id, roles_dict["hod"].id)
            await user_repo.assign_role_to_user(hod_user.id, roles_dict["guide"].id)
            await fs_repo.create_faculty(
                user_id=hod_user.id,
                employee_id="EMP-CSE-000",
                designation="Professor & HOD",
                specialization="Data Science & Cybersecurity",
                guide_quota=5
            )
            logger.info("Seeded HOD account: hod.cse@siet.ac.in (Roles: hod, guide)")

        # E. Admin
        admin_user = await user_repo.get_user_by_email("admin@siet.ac.in")
        if not admin_user:
            admin_user = await user_repo.create_user(
                email="admin@siet.ac.in",
                password_hash=get_password_hash("admin@123"),
                name="Department Administrator",
                department_id=dept.id,
                designation="System Administrator"
            )
            await user_repo.assign_role_to_user(admin_user.id, roles_dict["admin"].id)
            logger.info("Seeded admin account: admin@siet.ac.in")

        # 7. Seed Team & Project
        res_t = await db.execute(select(Team).where(Team.batch_id == batch.id, Team.section_id == section.id, Team.team_no == "Team 04"))
        team = res_t.unique().scalars().first()
        if not team:
            team = await team_repo.create_team(
                team_no="Team 04",
                batch_id=batch.id,
                section_id=section.id,
                advisor_id=advisor_user.id
            )
            await team_repo.assign_guide(team.id, guide_user.id)
            if student_rec:
                await team_repo.add_team_member(team.id, student_rec.id, member_role="Team Lead")
            for s_rec, m_role in other_student_recs:
                if s_rec:
                    await team_repo.add_team_member(team.id, s_rec.id, member_role=m_role)

            # Create Project for Team 04 with empty title initially
            proj = await proj_repo.create_project(
                team_id=team.id,
                title="",
                abstract=""
            )
            proj.status = "PENDING"
            proj.guide_approval_status = "Pending Review"

            logger.info("Seeded Team 04 with 4 members and unsubmitted project")
        else:
            # Ensure all 4 members are assigned
            existing_members = await db.execute(select(TeamMember).where(TeamMember.team_id == team.id))
            m_set = {m.student_id for m in existing_members.scalars().all()}
            if student_rec and student_rec.id not in m_set:
                await team_repo.add_team_member(team.id, student_rec.id, member_role="Team Lead")
            for s_rec, m_role in other_student_recs:
                if s_rec and s_rec.id not in m_set:
                    await team_repo.add_team_member(team.id, s_rec.id, member_role=m_role)

            res_p = await db.execute(select(Project).where(Project.team_id == team.id))
            proj = res_p.scalars().first()
            if not proj:
                proj = await proj_repo.create_project(
                    team_id=team.id,
                    title="",
                    abstract=""
                )
            proj.status = "PENDING"
            proj.guide_approval_status = "Pending Review"

        await db.commit()
        logger.info("Database seeding successfully completed!")

if __name__ == "__main__":
    asyncio.run(seed_data())
