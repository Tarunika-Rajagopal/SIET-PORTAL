"""Utility functions for cleanly and completely purging teams and students from the database."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, or_, func

from models import (
    Team,
    TeamMember,
    WeeklySubmission,
    GuideNotice,
    ReviewScore,
    RubricCriterion,
    WeeklyMark,
    WeeklyMemberMark,
    TitleApproval,
    Checklist,
    Student,
    User,
    Faculty,
)
from repositories.team_repository import TeamRepository
from repositories.student_repository import StudentRepository
from repositories.user_repository import UserRepository


async def purge_team_completely(session: AsyncSession, team: Team) -> Dict[str, Any]:
    """
    Completely and permanently removes a team and ALL connected details from the database:
    - Weekly submissions and deliverables
    - Guide notices
    - Milestone review scores and rubric criteria
    - Weekly advisor/guide marks and member marks
    - Title approvals
    - Checklist tracking
    - Team membership rows
    - Resets all member students back to 'Unassigned' in both students and users tables
    - Decrements the assigned guide's active teams count in faculty table
    - Deletes the team entity itself
    """
    team_uuid = team.id
    team_no = team.team_no
    guide_email = (team.guide_email or "").strip().lower()

    # 1. Gather all weekly submission IDs for this team
    sub_ids_res = await session.execute(
        select(WeeklySubmission.id).where(WeeklySubmission.team_id == team_uuid)
    )
    sub_ids = list(sub_ids_res.scalars().all())

    # 2. Delete all guide notices referencing this team or its submissions
    notice_cond = [GuideNotice.team_id == team_uuid]
    if sub_ids:
        notice_cond.append(GuideNotice.submission_id.in_(sub_ids))
    await session.execute(delete(GuideNotice).where(or_(*notice_cond)))

    # 3. Delete rubric criteria referencing review scores of this team
    rev_ids_res = await session.execute(
        select(ReviewScore.id).where(ReviewScore.team_id == team_uuid)
    )
    rev_ids = list(rev_ids_res.scalars().all())
    if rev_ids:
        await session.execute(
            delete(RubricCriterion).where(RubricCriterion.review_id.in_(rev_ids))
        )

    # 4. Delete review scores for this team
    await session.execute(
        delete(ReviewScore).where(ReviewScore.team_id == team_uuid)
    )

    # 5. Delete weekly member marks referencing weekly marks of this team
    wm_ids_res = await session.execute(
        select(WeeklyMark.id).where(WeeklyMark.team_id == team_uuid)
    )
    wm_ids = list(wm_ids_res.scalars().all())
    if wm_ids:
        await session.execute(
            delete(WeeklyMemberMark).where(WeeklyMemberMark.weekly_mark_id.in_(wm_ids))
        )

    # 6. Delete weekly marks for this team
    await session.execute(
        delete(WeeklyMark).where(WeeklyMark.team_id == team_uuid)
    )

    # 7. Delete weekly submissions for this team
    await session.execute(
        delete(WeeklySubmission).where(WeeklySubmission.team_id == team_uuid)
    )

    # 8. Delete title approvals for this team
    await session.execute(
        delete(TitleApproval).where(TitleApproval.team_id == team_uuid)
    )

    # 9. Delete checklists for this team
    await session.execute(
        delete(Checklist).where(Checklist.team_id == team_uuid)
    )

    # 10. Fetch all member roll numbers for this team before deletion
    mbrs_res = await session.execute(
        select(TeamMember).where(TeamMember.team_id == team_uuid)
    )
    members = list(mbrs_res.scalars().all())
    member_roll_nos = [m.roll_no.strip() for m in members if m.roll_no]

    # Delete team member entries
    await session.execute(
        delete(TeamMember).where(TeamMember.team_id == team_uuid)
    )

    # 11. Reset students to Unassigned in students table
    student_cond = [Student.team_no == team_no]
    if member_roll_nos:
        student_cond.append(Student.roll_no.in_(member_roll_nos))
    await session.execute(
        update(Student)
        .where(or_(*student_cond))
        .values(
            team_no="Unassigned",
            project_title="",
            guide="Unassigned",
            updated_at=datetime.now(timezone.utc)
        )
    )

    # 12. Reset students in users table
    user_cond = [
        User.team_id == str(team_uuid),
        User.team_id == team.team_id,
        User.team_no == team_no,
    ]
    if member_roll_nos:
        user_cond.append(User.roll_no.in_(member_roll_nos))
    await session.execute(
        update(User)
        .where(or_(*user_cond))
        .values(
            team_id=None,
            team_no=None,
            project_title=None,
            guide_name=None,
            updated_at=datetime.now(timezone.utc)
        )
    )

    # 13. Decrement guide teams_count in faculty table
    if guide_email:
        await session.execute(
            update(Faculty)
            .where(func.lower(Faculty.email) == guide_email)
            .values(
                teams_count=func.greatest(0, Faculty.teams_count - 1),
                updated_at=datetime.now(timezone.utc)
            )
        )
    elif team.guide_name:
        await session.execute(
            update(Faculty)
            .where(func.lower(Faculty.name) == team.guide_name.strip().lower())
            .values(
                teams_count=func.greatest(0, Faculty.teams_count - 1),
                updated_at=datetime.now(timezone.utc)
            )
        )

    # 14. Delete the team entity itself
    await session.delete(team)
    await session.flush()

    return {
        "success": True,
        "message": f"Team {team_no} and all associated submissions, marks, and records permanently deleted.",
        "purgedMembersCount": len(members),
    }


async def purge_student_completely(
    session: AsyncSession,
    roll_no: str,
    student_repo: StudentRepository,
    user_repo: UserRepository,
    team_repo: TeamRepository,
) -> Dict[str, Any]:
    """
    Completely and permanently removes a student and their entire record from the database:
    - Removes individual weekly member marks
    - Removes membership in any team
    - If student was the sole member of a team, purges that team and all its submissions/marks
    - If team has remaining members, updates team members_count, reassigns lead, and recalculates averages
    - Removes student entity from students table
    - Removes user entity from users table
    """
    clean_roll = roll_no.strip()
    s = await student_repo.get_by_roll_no(clean_roll)
    u = await user_repo.get_by_roll_no(clean_roll)

    if not s and not u:
        return {"success": False, "message": f"Student with roll number '{clean_roll}' not found"}

    student_id = s.id if s else None

    # 1. Delete all weekly member marks for this student
    wmm_cond = [WeeklyMemberMark.roll_no.ilike(clean_roll)]
    if student_id:
        wmm_cond.append(WeeklyMemberMark.student_id == student_id)
    await session.execute(delete(WeeklyMemberMark).where(or_(*wmm_cond)))

    # 2. Check team memberships
    tm_cond = [TeamMember.roll_no.ilike(clean_roll)]
    if student_id:
        tm_cond.append(TeamMember.student_id == student_id)
    tm_res = await session.execute(select(TeamMember).where(or_(*tm_cond)))
    memberships = list(tm_res.scalars().all())

    team_candidates = set()
    for tm in memberships:
        team_candidates.add(tm.team_id)
        await session.delete(tm)
    await session.flush()

    if s and s.team_no and s.team_no != "Unassigned":
        t_by_no = await team_repo.get_by_team_id_string(s.team_no)
        if t_by_no:
            team_candidates.add(t_by_no.id)

    if u and u.team_id:
        t_by_uid = await team_repo.get_by_team_id_string(u.team_id)
        if t_by_uid:
            team_candidates.add(t_by_uid.id)

    for target_team_id in team_candidates:
        team = await team_repo.get_by_id(target_team_id)
        if team:
            remaining_members = await team_repo.list_members_by_team_id(target_team_id)
            active_students = (await session.execute(
                select(Student).where(
                    Student.team_no == team.team_no,
                    Student.roll_no != clean_roll
                )
            )).scalars().all()

            if not remaining_members and not active_students:
                # All members of the team have been deleted; purge the entire team, submissions, and marks!
                await purge_team_completely(session, team)
            else:
                team.members_count = len(remaining_members)
                if team.lead_roll_no and team.lead_roll_no.strip().lower() == clean_roll.lower():
                    if remaining_members:
                        remaining_members[0].is_lead = True
                        team.lead_student = remaining_members[0].name
                        team.lead_roll_no = remaining_members[0].roll_no
                    else:
                        team.lead_student = ""
                        team.lead_roll_no = ""

                # Recalculate WeeklyMark averages for remaining members
                wm_res = await session.execute(
                    select(WeeklyMark).where(WeeklyMark.team_id == team.id)
                )
                for wm in wm_res.scalars().all():
                    avg_res = await session.execute(
                        select(func.avg(WeeklyMemberMark.mark)).where(
                            WeeklyMemberMark.weekly_mark_id == wm.id
                        )
                    )
                    new_avg = avg_res.scalar()
                    wm.team_average = round(float(new_avg), 1) if new_avg is not None else 0


    # 3. Delete Student entity
    if s:
        await session.delete(s)

    # 4. Delete User entity
    if u:
        await session.delete(u)

    await session.commit()
    return {"success": True, "message": f"Student {clean_roll} and associated details purged from DB."}
