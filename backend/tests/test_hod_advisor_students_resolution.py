"""Test HOD Portal Advisor Student Count and Unassigned Staff Bug Resolution.
Verifies:
1. Bug 1: Advisor displayed student count == Actual students returned by /hod/advisors/{id}/students
2. Bug 2: Unassigned advisor has count = 0 and returns 0 students (empty list, no leakage)
3. Data isolation between different advisors and class sections
"""
import os
import sys
from pathlib import Path
import uuid
import pytest

os.environ["USE_SQLITE"] = "true"

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "app"))

from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db, async_session
from models import User, Faculty, Student, Team, TeamMember
from auth.auth import hash_password, create_access_token


@pytest.mark.asyncio
async def test_hod_advisor_student_count_and_unassigned_isolation():
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as ac:
        suffix = uuid.uuid4().hex[:8]
        cls_a = f"CSE-RES-A-{suffix[:4]}"
        cls_b = f"CSE-RES-B-{suffix[:4]}"
        batch_name = "2023-2027 (III Year)"

        hod_id = uuid.uuid4()
        adv_a_id = uuid.uuid4()
        adv_b_id = uuid.uuid4()
        adv_unassigned_id = uuid.uuid4()
        stu_a1_id = uuid.uuid4()
        stu_a2_id = uuid.uuid4()
        stu_a3_id = uuid.uuid4()
        stu_b1_id = uuid.uuid4()
        stu_b2_id = uuid.uuid4()

        r_a1 = f"7140{suffix[:4]}01"
        r_a2 = f"7140{suffix[:4]}02"
        r_a3 = f"7140{suffix[:4]}03"
        r_b1 = f"7140{suffix[:4]}11"
        r_b2 = f"7140{suffix[:4]}12"

        async with async_session() as session:
            # 1. Create HOD User
            hod_user = User(
                id=hod_id,
                email=f"hod.{suffix}@siet.ac.in",
                password=hash_password("hod@123"),
                name="Dr. HOD Test",
                role="hod",
                department="Computer Science and Engineering",
            )
            session.add(hod_user)

            # 2. Advisor A (Assigned to cls_a)
            adv_a = Faculty(
                id=adv_a_id,
                email=f"advisor.a.{suffix}@siet.ac.in",
                name="Prof. Advisor Alpha",
                designation="Assistant Professor",
                role="Advisor",
                advisor_class=cls_a,
                advisor_batch=batch_name,
                status="Active",
            )
            session.add(adv_a)

            # 3. Advisor B (Assigned to cls_b)
            adv_b = Faculty(
                id=adv_b_id,
                email=f"advisor.b.{suffix}@siet.ac.in",
                name="Prof. Advisor Beta",
                designation="Associate Professor",
                role="Advisor",
                advisor_class=cls_b,
                advisor_batch=batch_name,
                status="Active",
            )
            session.add(adv_b)

            # 4. Unassigned Advisor (Role Advisor, but no class/batch assigned)
            adv_unassigned = Faculty(
                id=adv_unassigned_id,
                email=f"advisor.unassigned.{suffix}@siet.ac.in",
                name="Prof. Unassigned Staff",
                designation="Lecturer",
                role="Advisor",
                advisor_class=None,
                advisor_batch=None,
                status="Available",
            )
            session.add(adv_unassigned)

            # 5. Students in cls_a (3 students)
            stu_a1 = Student(
                id=stu_a1_id,
                roll_no=r_a1,
                name="Alpha Student One",
                email=f"a1.{suffix}@srishakthi.ac.in",
                class_section=cls_a,
                batch=batch_name,
            )
            stu_a2 = Student(
                id=stu_a2_id,
                roll_no=r_a2,
                name="Alpha Student Two",
                email=f"a2.{suffix}@srishakthi.ac.in",
                class_section=cls_a,
                batch=batch_name,
            )
            stu_a3 = Student(
                id=stu_a3_id,
                roll_no=r_a3,
                name="Alpha Student Three",
                email=f"a3.{suffix}@srishakthi.ac.in",
                class_section=cls_a,
                batch=batch_name,
            )
            session.add_all([stu_a1, stu_a2, stu_a3])

            # 6. Students in cls_b (2 students)
            stu_b1 = Student(
                id=stu_b1_id,
                roll_no=r_b1,
                name="Beta Student One",
                email=f"b1.{suffix}@srishakthi.ac.in",
                class_section=cls_b,
                batch=batch_name,
            )
            stu_b2 = Student(
                id=stu_b2_id,
                roll_no=r_b2,
                name="Beta Student Two",
                email=f"b2.{suffix}@srishakthi.ac.in",
                class_section=cls_b,
                batch=batch_name,
            )
            session.add_all([stu_b1, stu_b2])

            await session.commit()

        try:
            # Generate HOD auth token
            token = create_access_token(str(hod_id), "hod")
            headers = {"Authorization": f"Bearer {token}"}

            # ─── Verification 1: GET /api/v1/hod/advisors ───
            res_adv = await ac.get("/api/v1/hod/advisors", headers=headers)
            assert res_adv.status_code == 200, f"Failed to get advisors: {res_adv.text}"
            advisors_list = res_adv.json()

            adv_a_item = next((a for a in advisors_list if a["id"] == str(adv_a_id)), None)
            adv_b_item = next((a for a in advisors_list if a["id"] == str(adv_b_id)), None)
            adv_unassigned_item = next((a for a in advisors_list if a["id"] == str(adv_unassigned_id)), None)

            assert adv_a_item is not None, "Advisor Alpha must be in advisors list"
            assert adv_b_item is not None, "Advisor Beta must be in advisors list"
            assert adv_unassigned_item is not None, "Unassigned Advisor must be in advisors list"

            # Check Bug 2 in summary list: Unassigned Advisor has 0 students
            assert adv_unassigned_item["studentsCount"] == 0, (
                f"Unassigned advisor studentsCount must be 0, got {adv_unassigned_item['studentsCount']}"
            )
            assert adv_unassigned_item["teamsCount"] == 0
            assert adv_unassigned_item["status"] == "Available"

            # Check assigned counts
            assert adv_a_item["studentsCount"] == 3
            assert adv_b_item["studentsCount"] == 2

            # ─── Verification 2: GET /api/v1/hod/advisors/{adv_a_id}/students (Advisor Alpha) ───
            res_stu_a = await ac.get(f"/api/v1/hod/advisors/{adv_a_id}/students", headers=headers)
            assert res_stu_a.status_code == 200
            students_a = res_stu_a.json()

            # BUG 1 CHECK: Count in list == Count in detail (EXACT MATCH!)
            assert len(students_a) == adv_a_item["studentsCount"], (
                f"Advisor Alpha displayed count ({adv_a_item['studentsCount']}) != actual students ({len(students_a)})"
            )
            assert len(students_a) == 3
            # Class isolation: Alpha must ONLY have cls_a students
            for s in students_a:
                assert s["classSection"] == cls_a
                assert s["advisor"] == "Prof. Advisor Alpha"
            assert {r_a1, r_a2, r_a3} == {s["rollNo"] for s in students_a}

            # ─── Verification 3: GET /api/v1/hod/advisors/{adv_b_id}/students (Advisor Beta) ───
            res_stu_b = await ac.get(f"/api/v1/hod/advisors/{adv_b_id}/students", headers=headers)
            assert res_stu_b.status_code == 200
            students_b = res_stu_b.json()

            # BUG 1 CHECK: Count in list == Count in detail (EXACT MATCH!)
            assert len(students_b) == adv_b_item["studentsCount"], (
                f"Advisor Beta displayed count ({adv_b_item['studentsCount']}) != actual students ({len(students_b)})"
            )
            assert len(students_b) == 2
            # Class isolation: Beta must ONLY have cls_b students
            for s in students_b:
                assert s["classSection"] == cls_b
                assert s["advisor"] == "Prof. Advisor Beta"
            assert {r_b1, r_b2} == {s["rollNo"] for s in students_b}

            # ─── Verification 4: GET /api/v1/hod/advisors/{adv_unassigned_id}/students (Unassigned) ───
            res_stu_unassigned = await ac.get(f"/api/v1/hod/advisors/{adv_unassigned_id}/students", headers=headers)
            assert res_stu_unassigned.status_code == 200
            students_unassigned = res_stu_unassigned.json()

            # BUG 2 CHECK: Unassigned staff MUST return empty list (0 students)
            assert len(students_unassigned) == 0, (
                f"Unassigned advisor must have 0 students, got {len(students_unassigned)}"
            )
            assert len(students_unassigned) == adv_unassigned_item["studentsCount"]

            # ─── Verification 5: Data Isolation check (No overlap) ───
            roll_nos_a = {s["rollNo"] for s in students_a}
            roll_nos_b = {s["rollNo"] for s in students_b}
            assert roll_nos_a.isdisjoint(roll_nos_b), "Advisor A and Advisor B student rosters must not overlap"

        finally:
            # Clean up test rows to avoid leaking into other tests
            async with async_session() as session:
                for sid in [stu_a1_id, stu_a2_id, stu_a3_id, stu_b1_id, stu_b2_id]:
                    s = await session.get(Student, sid)
                    if s:
                        await session.delete(s)
                for fid in [adv_a_id, adv_b_id, adv_unassigned_id]:
                    f = await session.get(Faculty, fid)
                    if f:
                        await session.delete(f)
                h = await session.get(User, hod_id)
                if h:
                    await session.delete(h)
                await session.commit()
