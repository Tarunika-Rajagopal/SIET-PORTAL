"""HOD service - provides department-wide views using repositories."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct, or_
from sqlalchemy.orm.attributes import flag_modified

from models import Team, TeamMember, HodHistory, Student, Faculty, User, Setting
from repositories.user_repository import UserRepository
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from repositories.audit_repository import AuditRepository
from repositories.faculty_repository import FacultyRepository
from repositories.student_repository import StudentRepository


def _ser_hod_team(t: Team, members: Optional[List[TeamMember]] = None) -> Dict[str, Any]:
    mbrs = members or []
    return {
        "id": t.team_id or str(t.id),
        "teamNo": t.team_no,
        "projectTitle": t.project_title or "",
        "batch": t.batch or "",
        "classSection": t.class_name or "",
        "status": t.status.value if hasattr(t.status, "value") else (t.status or "In Progress"),
        "progress": t.progress or 0,
        "rejectionReason": t.rejection_reason or "",
        "guideApprovalStatus": t.guide_approval_status or "Pending",
        "advisor": {
            "name": t.advisor_name or "",
            "email": t.advisor_email or "",
            "designation": "Professor",
        },
        "guide": {
            "name": t.guide_name or "",
            "email": t.guide_email or "",
            "designation": t.guide_designation or "Associate Professor",
            "specialization": t.domain or "AI & Deep Learning",
        },
        "members": [
            {
                "rollNo": m.roll_no,
                "name": m.name,
                "email": m.email,
                "isLead": m.is_lead,
            }
            for m in mbrs
        ],
    }


class HODService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.team_repo = TeamRepository(session)
        self.sub_repo = SubmissionRepository(session)
        self.audit_repo = AuditRepository(session)
        self.faculty_repo = FacultyRepository(session)
        self.student_repo = StudentRepository(session)

    async def get_advisors(
        self, batch_filter: Optional[str] = None, class_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Return all faculty and users designated as class advisors with real team/student counts."""
        fac_advisors = await self.faculty_repo.list_advisors(batch=batch_filter, class_name=class_filter)
        user_advisors = await self.user_repo.list_by_roles(["advisor"])

        seen_emails = set()
        result = []

        for f in fac_advisors:
            if not f.email:
                continue
            email_lower = f.email.lower()
            seen_emails.add(email_lower)
            batch = f.advisor_batch or ""
            cls = f.advisor_class or ""

            tc = []
            if cls and batch:
                tc = await self.team_repo.list_by_class(cls, batch)
            if not tc and f.name:
                tc = await self.team_repo.list_by_advisor_name(f.name)

            stu_count = sum(len(t.members or []) for t in tc)
            result.append({
                "id": str(f.id),
                "name": f.name,
                "email": f.email,
                "designation": f.designation or "Faculty",
                "batch": batch,
                "assignedClass": cls,
                "teamsCount": len(tc),
                "studentsCount": stu_count,
                "status": "Active" if (len(tc) > 0 or cls) else "Available",
            })

        for u in user_advisors:
            if not u.email or u.email.lower() in seen_emails:
                continue
            batch = u.advisor_batch or ""
            cls = u.advisor_class or ""
            if batch_filter and batch_filter != "ALL" and batch and batch != batch_filter:
                continue
            if class_filter and class_filter != "ALL" and cls and cls != class_filter:
                continue
            tc = await self.team_repo.list_by_advisor_name(u.name or "")
            stu_count = sum(len(t.members or []) for t in tc)
            result.append({
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "designation": u.designation or "Professor",
                "batch": batch,
                "assignedClass": cls,
                "teamsCount": len(tc),
                "studentsCount": stu_count,
                "status": "Active" if (len(tc) > 0 or cls) else "Available",
            })
        return result

    async def get_students(
        self, batch_filter: Optional[str] = None, class_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Return all enrolled students mapped to their assigned teams, guide, and advisor."""
        students = await self.student_repo.list_all()
        teams = await self.team_repo.list_all(batch=batch_filter, class_name=class_filter)

        team_map = {}
        for t in teams:
            for m in (t.members or []):
                team_map[m.roll_no.strip()] = t

        result = []
        for s in students:
            rno = (s.roll_no or "").strip()
            t = team_map.get(rno)
            batch = s.batch or (t.batch if t else "")
            cls = s.class_section or (t.class_name if t else "")

            # Apply batch and class filters
            if batch_filter and batch_filter != "ALL" and batch and batch != batch_filter:
                continue
            if class_filter and class_filter != "ALL" and cls and cls != class_filter:
                continue

            status_val = "Unassigned"
            if t:
                status_val = t.status.value if hasattr(t.status, "value") else (t.status or "In Progress")

            result.append({
                "rollNo": rno,
                "name": s.name or "",
                "email": s.email or "",
                "batch": batch,
                "classSection": cls,
                "teamNo": t.team_no if t else "Unassigned",
                "teamId": (t.team_id or str(t.id)) if t else "",
                "projectTitle": (t.project_title or "") if t else "",
                "status": status_val,
                "guide": (t.guide_name or s.guide or "") if t else (s.guide or ""),
                "advisor": (t.advisor_name or "") if t else "",
            })
        return result

    async def get_teams(
        self,
        batch_filter: Optional[str] = None,
        class_filter: Optional[str] = None,
        search_term: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        teams = await self.team_repo.list_all(batch=batch_filter, class_name=class_filter)
        result = []
        for t in teams:
            mbrs = t.members or []
            team_dict = _ser_hod_team(t, mbrs)
            if search_term:
                sq = search_term.lower()
                in_title = sq in (t.project_title or "").lower()
                in_team = sq in (t.team_no or "").lower()
                in_members = any(sq in (m.name or "").lower() or sq in (m.roll_no or "").lower() for m in mbrs)
                in_guide = sq in (t.guide_name or "").lower()
                in_advisor = sq in (t.advisor_name or "").lower()
                if not (in_title or in_team or in_members or in_guide or in_advisor):
                    continue
            subs = await self.sub_repo.list_by_team(t.id)
            team_dict["submissions"] = [
                {
                    "id": str(s.id),
                    "week": s.week,
                    "title": s.title or f"Week {s.week}",
                    "dueDate": s.due_date or "",
                    "status": s.status.value if hasattr(s.status, "value") else (s.status or "Pending"),
                    "submissionDate": s.submission_date or "",
                    "fileName": s.file_name or "",
                    "fileSize": s.file_size or "",
                    "comments": s.comments or "",
                    "score": float(s.score) if s.score is not None else None,
                    "maxScore": float(s.max_score) if s.max_score is not None else 100.0,
                    "projectTitle": s.project_title or t.project_title or "",
                    "problemStatement": s.problem_statement or "",
                    "solution": s.solution or "",
                    "technologyUsed": s.technology_used or "",
                    "obstaclesFaced": s.obstacles_faced or "",
                    "abstract": s.abstract or "",
                    "presentationFile": s.presentation_file or "",
                    "pdfFile": s.pdf_file or "",
                    "repoUrl": s.repo_url or "",
                    "demoUrl": s.demo_url or "",
                    "screenshotFile": s.screenshot_file or "",
                    "guideName": s.guide_name or t.guide_name or "",
                    "guideReviewDate": s.guide_review_date or "",
                }
                for s in subs
            ]
            result.append(team_dict)
        return result

    async def get_faculty_list(self) -> List[Dict[str, Any]]:
        """Return real faculty members from database with real team counts and computed progress."""
        fac_rows = await self.faculty_repo.list_all()
        user_rows = await self.user_repo.list_by_roles(["guide", "advisor"])

        seen_emails = set()
        result = []

        for f in fac_rows:
            if not f.email:
                continue
            email_lower = f.email.lower()
            seen_emails.add(email_lower)
            tc = await self.team_repo.list_by_guide_name(f.name or "")
            if not tc and f.advisor_class and f.advisor_batch:
                tc = await self.team_repo.list_by_class(f.advisor_class, f.advisor_batch)

            avg_prog = round(sum(t.progress or 0 for t in tc) / len(tc)) if tc else 0
            status_val = "Overloaded" if len(tc) >= 4 else ("Normal" if len(tc) > 0 else "Available")

            role_str = f.role.value if hasattr(f.role, "value") else str(f.role or "Faculty")
            result.append({
                "id": str(f.id),
                "name": f.name,
                "designation": f.designation or "Faculty",
                "email": f.email,
                "phone": "",
                "role": role_str,
                "advisorClass": f.advisor_class or "",
                "teamsCount": len(tc),
                "avgStudentProgress": avg_prog,
                "status": status_val,
            })

        for u in user_rows:
            if not u.email or u.email.lower() in seen_emails:
                continue
            tc = await self.team_repo.list_by_guide_name(u.name or "")
            avg_prog = round(sum(t.progress or 0 for t in tc) / len(tc)) if tc else 0
            status_val = "Overloaded" if len(tc) >= 4 else ("Normal" if len(tc) > 0 else "Available")
            result.append({
                "id": str(u.id),
                "name": u.name,
                "designation": u.designation or "Faculty",
                "email": u.email,
                "phone": u.phone or "",
                "role": (u.role or "").capitalize(),
                "advisorClass": u.advisor_class or "",
                "teamsCount": len(tc),
                "avgStudentProgress": avg_prog,
                "status": status_val,
            })
        return result

    async def get_statistics(self) -> Dict[str, Any]:
        """Compute real, database-driven statistics for the HOD dashboard."""
        teams = await self.team_repo.list_all()
        s_res = await self.session.execute(select(func.count(Student.id)))
        student_count = s_res.scalar() or 0
        if student_count == 0:
            student_count = sum(len(t.members or []) for t in teams)

        guide_names = set(t.guide_name for t in teams if t.guide_name)
        advisor_names = set(t.advisor_name for t in teams if t.advisor_name)
        faculty_rows = await self.faculty_repo.list_all()

        total_teams = len(teams)
        active_projects = sum(1 for t in teams if (t.status.value if hasattr(t.status, "value") else str(t.status)) != "Rejected")
        pending_approvals = sum(1 for t in teams if (t.guide_approval_status or "") == "Pending" or (t.status.value if hasattr(t.status, "value") else str(t.status)) == "Review Required")

        avg_progress = round(sum(t.progress or 0 for t in teams) / total_teams) if total_teams > 0 else 0
        weeks_summary = await self.sub_repo.get_weeks_summary()

        return {
            "totalStudents": student_count,
            "totalTeams": total_teams,
            "totalGuides": len(guide_names),
            "totalAdvisors": len(advisor_names),
            "totalFaculty": len(faculty_rows),
            "activeProjects": active_projects,
            "pendingApprovals": pending_approvals,
            "departmentProgress": avg_progress,
            "weeklySummary": weeks_summary,
        }

    async def get_filter_options(self) -> Dict[str, List[str]]:
        """Return distinct batches and classes present in the database."""
        t_batches = (await self.session.execute(select(distinct(Team.batch)).where(Team.batch.isnot(None)))).scalars().all()
        u_batches = (await self.session.execute(select(distinct(User.batch)).where(User.batch.isnot(None)))).scalars().all()
        s_batches = (await self.session.execute(select(distinct(Student.batch)).where(Student.batch.isnot(None)))).scalars().all()
        batches = sorted(list(set(b.strip() for b in (t_batches + u_batches + s_batches) if b and b.strip() and b.strip() != "string")))

        t_classes = (await self.session.execute(select(distinct(Team.class_name)).where(Team.class_name.isnot(None)))).scalars().all()
        u_classes = (await self.session.execute(select(distinct(User.class_name)).where(User.class_name.isnot(None)))).scalars().all()
        s_classes = (await self.session.execute(select(distinct(Student.class_section)).where(Student.class_section.isnot(None)))).scalars().all()
        classes = sorted(list(set(c.strip() for c in (t_classes + u_classes + s_classes) if c and c.strip() and c.strip() != "string")))

        return {
            "batches": batches,
            "classes": classes,
        }

    async def log_history(
        self,
        action_type: str,
        target: str,
        details: str,
        class_section: str,
        batch: str,
        performed_by: str,
    ) -> Dict[str, Any]:
        hid = uuid.uuid4()
        h = HodHistory(
            id=hid,
            date=datetime.now(timezone.utc).strftime("%d %b %Y"),
            action_type=action_type,
            target=target,
            class_section=class_section,
            batch=batch,
            details=details,
            performed_by=performed_by,
        )
        await self.audit_repo.create_hod_history(h)
        await self.session.commit()
        return {"id": str(hid), "success": True}

    async def get_history(self) -> List[Dict[str, Any]]:
        rows = await self.audit_repo.list_hod_history()
        return [
            {
                "id": str(h.id),
                "timestamp": h.timestamp.isoformat() if h.timestamp else "",
                "date": h.date or "",
                "actionType": h.action_type or "",
                "target": h.target or "",
                "classSection": h.class_section or "",
                "batch": h.batch or "",
                "details": h.details or "",
                "performedBy": h.performed_by or "",
            }
            for h in rows
        ]

    async def get_weekly_submissions_summary(self) -> List[Dict[str, Any]]:
        """Get summary of weekly submissions for weeks 1 through 4."""
        return await self.sub_repo.get_weeks_summary()

    async def delete_weekly_submissions(self, weeks: List[int], performed_by: str) -> Dict[str, Any]:
        """Permanently delete all student submissions for specified weeks and audit log."""
        if not weeks:
            return {"success": False, "deletedCount": 0, "weeks": []}
        deleted_count = await self.sub_repo.delete_by_weeks(weeks)
        
        # Log to HOD history audit log
        weeks_str = ", ".join(f"Week {w}" for w in sorted(weeks))
        try:
            await self.log_history(
                action_type="Submission Reviewed",
                target=weeks_str,
                details=f"Permanently purged all student deliverables and submissions for {weeks_str} ({deleted_count} records removed).",
                class_section="ALL",
                batch="ALL",
                performed_by=performed_by,
            )
        except Exception as e:
            print(f"[HODService] Warning: Could not write HOD history: {e}")
        return {
            "success": True,
            "deletedCount": deleted_count,
            "weeks": weeks,
            "message": f"Successfully deleted submissions for {weeks_str}."
        }

    async def get_week_releases(self) -> Dict[str, bool]:
        """Return release status for all 4 weekly submissions from database."""
        res = await self.session.execute(select(Setting).where(Setting.key == "week_release_status"))
        setting = res.scalar_one_or_none()
        default_status = {"1": True, "2": True, "3": False, "4": False}
        if not setting:
            setting = Setting(key="week_release_status", value=default_status)
            self.session.add(setting)
            await self.session.commit()
            return default_status

        val = setting.value
        if isinstance(val, dict):
            for w in ("1", "2", "3", "4"):
                if w not in val:
                    val[w] = default_status.get(w, False)
            return {k: bool(v) for k, v in val.items()}
        return default_status

    async def update_week_release(self, week: int, released: bool, performed_by: str) -> Dict[str, Any]:
        """Update release status for a specific week and log the governance action."""
        res = await self.session.execute(
            select(Setting).where(Setting.key == "week_release_status").with_for_update()
        )
        setting = res.scalar_one_or_none()
        default_status = {"1": True, "2": True, "3": False, "4": False}
        if not setting:
            setting = Setting(key="week_release_status", value=default_status)
            self.session.add(setting)

        current_val = dict(setting.value) if isinstance(setting.value, dict) else dict(default_status)
        current_val[str(week)] = bool(released)
        setting.value = current_val
        setting.updated_at = datetime.now(timezone.utc)
        flag_modified(setting, "value")
        self.session.add(setting)
        await self.session.commit()

        # Audit history log in background try-catch
        action_verb = "released" if released else "locked"
        details = f"HOD {action_verb} submissions for Week {week}. Student portal submission access is {'unlocked' if released else 'locked'}."
        try:
            await self.log_history(
                action_type="Submission Reviewed",
                target=f"Week {week}",
                details=details,
                class_section="All Classes",
                batch="All Batches",
                performed_by=performed_by,
            )
            await self.session.commit()
        except Exception as e:
            print(f"[HODService] Warning: Could not write HOD history for week release: {e}")

        return {
            "week": week,
            "released": bool(released),
            "releases": current_val,
        }

