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

    async def get_advisor_students(self, advisor_id: str) -> List[Dict[str, Any]]:
        """Return the exact isolated list of enrolled students for a specific advisor ID."""
        cleaned_id = str(advisor_id or "").strip()
        if not cleaned_id:
            return []

        # 1. Lookup advisor by ID (Faculty first, then User)
        advisor = None
        try:
            parsed_uuid = uuid.UUID(cleaned_id)
            advisor = await self.faculty_repo.get_by_id(parsed_uuid)
            if not advisor:
                advisor = await self.user_repo.get_by_id(parsed_uuid)
        except (ValueError, TypeError):
            advisor = await self.faculty_repo.get_by_email(cleaned_id)
            if not advisor:
                advisor = await self.user_repo.get_by_email(cleaned_id)

        if not advisor:
            return []

        # 2. If advisor is unassigned (no class assigned), strictly return empty
        cls = (getattr(advisor, "advisor_class", None) or "").strip()
        batch = (getattr(advisor, "advisor_batch", None) or "").strip()
        if not cls:
            return []

        # 3. Fetch students enrolled in this advisor's class & batch
        students = []
        if batch and batch != "ALL":
            students = await self.student_repo.list_by_class_and_batch(cls, batch)
        if not students:
            students = await self.student_repo.list_by_class_section(cls)

        # 4. Fetch teams in this class & batch for team/guide metadata mapping
        teams = await self.team_repo.list_by_class(cls, batch if (batch and batch != "ALL") else None)
        team_map = {}
        for t in teams:
            for m in (t.members or []):
                team_map[m.roll_no.strip()] = t

        result = []
        seen_roll_nos = set()

        for s in students:
            rno = (s.roll_no or "").strip()
            if not rno or rno in seen_roll_nos:
                continue
            seen_roll_nos.add(rno)
            t = team_map.get(rno)
            s_batch = s.batch or batch or (t.batch if t else "")
            s_cls = s.class_section or cls or (t.class_name if t else "")

            status_val = "Unassigned"
            if t:
                status_val = t.status.value if hasattr(t.status, "value") else (t.status or "In Progress")

            result.append({
                "rollNo": rno,
                "name": s.name or "",
                "email": s.email or "",
                "batch": s_batch,
                "classSection": s_cls,
                "teamNo": t.team_no if t else (s.team_no or "Unassigned"),
                "teamId": (t.team_id or str(t.id)) if t else "",
                "projectTitle": (t.project_title or s.project_title or "") if t else (s.project_title or ""),
                "status": status_val,
                "guide": (t.guide_name or s.guide or "Unassigned") if t else (s.guide or "Unassigned"),
                "advisor": advisor.name or "",
            })

        # 5. Fallback for test fixtures where TeamMembers exist but Student table rows were not inserted
        if not result and teams:
            for t in teams:
                for m in (t.members or []):
                    rno = (m.roll_no or "").strip()
                    if not rno or rno in seen_roll_nos:
                        continue
                    seen_roll_nos.add(rno)
                    status_val = t.status.value if hasattr(t.status, "value") else (t.status or "In Progress")
                    result.append({
                        "rollNo": rno,
                        "name": m.name or "",
                        "email": m.email or "",
                        "batch": t.batch or batch or "",
                        "classSection": t.class_name or cls or "",
                        "teamNo": t.team_no or "Unassigned",
                        "teamId": t.team_id or str(t.id),
                        "projectTitle": t.project_title or "",
                        "status": status_val,
                        "guide": t.guide_name or "Unassigned",
                        "advisor": advisor.name or "",
                    })

        return result

    async def get_advisors(
        self, batch_filter: Optional[str] = None, class_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Return all faculty and users designated as class advisors with real team/student counts."""
        fac_advisors = await self.faculty_repo.list_advisors(batch=batch_filter, class_name=class_filter)
        user_advisors = await self.user_repo.list_by_roles(["advisor"])

        # Prefetch ALL teams once to avoid N+1 per-advisor queries
        all_teams = await self.team_repo.list_all_with_members_only()

        # Build lookup indexes
        teams_by_class_batch: Dict[str, List] = {}
        teams_by_advisor: Dict[str, List] = {}
        for t in all_teams:
            key = f"{(t.class_name or '').strip().lower()}|{(t.batch or '').strip().lower()}"
            if key != "|":
                teams_by_class_batch.setdefault(key, []).append(t)
            an = (t.advisor_name or "").strip().lower()
            if an:
                teams_by_advisor.setdefault(an, []).append(t)

        seen_emails = set()
        result = []

        for f in fac_advisors:
            if not f.email:
                continue
            email_lower = f.email.lower()
            seen_emails.add(email_lower)
            batch = f.advisor_batch or ""
            cls = f.advisor_class or ""
            if not cls:
                stu_count = 0
                tc_count = 0
            else:
                stu_list = await self.get_advisor_students(str(f.id))
                stu_count = len(stu_list)
                tc = []
                if cls and batch:
                    key = f"{cls.strip().lower()}|{batch.strip().lower()}"
                    tc = teams_by_class_batch.get(key, [])
                if not tc and cls:
                    tc = [t for t in all_teams if (t.class_name or "").strip().lower() == cls.strip().lower()]
                tc_count = len(tc)

            result.append({
                "id": str(f.id),
                "name": f.name,
                "email": f.email,
                "designation": f.designation or "Faculty",
                "batch": batch,
                "assignedClass": cls,
                "teamsCount": tc_count,
                "studentsCount": stu_count,
                "status": "Active" if (tc_count > 0 or cls) else "Available",
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

            if not cls:
                stu_count = 0
                tc_count = 0
            else:
                stu_list = await self.get_advisor_students(str(u.id))
                stu_count = len(stu_list)
                tc = []
                if cls and batch:
                    key = f"{cls.strip().lower()}|{batch.strip().lower()}"
                    tc = teams_by_class_batch.get(key, [])
                if not tc and cls:
                    tc = [t for t in all_teams if (t.class_name or "").strip().lower() == cls.strip().lower()]
                tc_count = len(tc)

            result.append({
                "id": str(u.id),
                "name": u.name,
                "email": u.email,
                "designation": u.designation or "Professor",
                "batch": batch,
                "assignedClass": cls,
                "teamsCount": tc_count,
                "studentsCount": stu_count,
                "status": "Active" if (tc_count > 0 or cls) else "Available",
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
            subs = sorted(t.submissions or [], key=lambda s: s.week if s.week is not None else 0)
            team_dict["submissions"] = [
                {
                    "id": str(s.id),
                    "week": s.week,
                    "weekNumber": s.week,
                    "title": s.title or f"Week {s.week}",
                    "dueDate": s.due_date or "",
                    "status": s.status.value if hasattr(s.status, "value") else (s.status or "Pending"),
                    "isCompleted": bool(s.is_completed) if hasattr(s, "is_completed") and s.is_completed is not None else (s.status in ("Submitted", "Approved")),
                    "submissionDate": s.submission_date or "",
                    "fileName": s.file_name or "",
                    "fileSize": s.file_size or "",
                    "comments": s.comments or "",
                    "score": float(s.score) if s.score is not None else None,
                    "maxScore": float(s.max_score) if s.max_score is not None else 100.0,
                    "projectTitle": s.project_title or t.project_title or "",
                    "guideName": s.guide_name or t.guide_name or "",
                    "guideReviewDate": s.guide_review_date or "",
                }
                for s in subs
            ]
            review_map = {
                s.week: bool(s.is_completed) if hasattr(s, "is_completed") and s.is_completed is not None else (s.status in ("Submitted", "Approved"))
                for s in subs if s.week is not None
            }
            team_dict["reviews"] = [
                {"reviewNumber": r, "isCompleted": review_map.get(r, False)}
                for r in (1, 2, 3, 4)
            ]
            result.append(team_dict)
        return result

    async def get_submission_detail(self, team_id_or_str: str, week: int) -> Optional[Dict[str, Any]]:
        """Return complete detailed submission with all deliverable text fields on demand."""
        cleaned = str(team_id_or_str).strip()
        team = await self.team_repo.get_by_team_id_string(cleaned)
        if not team:
            try:
                parsed_uuid = uuid.UUID(cleaned)
                team = await self.team_repo.get_by_id(parsed_uuid)
            except (ValueError, TypeError):
                pass
        if not team:
            return None

        sub = await self.sub_repo.get_by_team_and_week(team.id, week)
        if not sub:
            return None

        return {
            "id": str(sub.id),
            "teamId": team.team_id or str(team.id),
            "week": sub.week,
            "weekNumber": sub.week,
            "title": sub.title or f"Week {sub.week}",
            "dueDate": sub.due_date or "",
            "status": sub.status.value if hasattr(sub.status, "value") else (sub.status or "Pending"),
            "isCompleted": bool(sub.is_completed) if hasattr(sub, "is_completed") and sub.is_completed is not None else (sub.status in ("Submitted", "Approved")),
            "submissionDate": sub.submission_date or "",
            "fileName": sub.file_name or "",
            "fileSize": sub.file_size or "",
            "comments": sub.comments or "",
            "score": float(sub.score) if sub.score is not None else None,
            "maxScore": float(sub.max_score) if sub.max_score is not None else 100.0,
            "projectTitle": sub.project_title or team.project_title or "",
            "problemStatement": sub.problem_statement or "",
            "solution": sub.solution or "",
            "proposedSolution": sub.solution or "",
            "technologyUsed": sub.technology_used or "",
            "technologiesUsed": [x.strip() for x in (sub.technology_used or "").split(",") if x.strip()],
            "obstaclesFaced": sub.obstacles_faced or "",
            "problemsFaced": sub.obstacles_faced or "",
            "abstract": sub.abstract or "",
            "abstractSummary": sub.abstract or "",
            "presentationFile": sub.presentation_file or "",
            "pdfFile": sub.pdf_file or "",
            "repoUrl": sub.repo_url or "",
            "githubUrl": sub.repo_url or "",
            "demoUrl": sub.demo_url or "",
            "liveDemoUrl": sub.demo_url or "",
            "guideName": sub.guide_name or team.guide_name or "",
            "guideReviewDate": sub.guide_review_date or "",
        }

    async def get_faculty_list(self) -> List[Dict[str, Any]]:
        """Return real faculty members from database with real team counts and computed progress."""
        fac_rows = await self.faculty_repo.list_all()
        user_rows = await self.user_repo.list_by_roles(["guide", "advisor"])

        # Prefetch ALL teams once to avoid N+1 per-faculty queries
        all_teams = await self.team_repo.list_all_with_members_only()

        # Build lookup indexes for in-memory matching
        teams_by_guide: Dict[str, List] = {}
        teams_by_class_batch: Dict[str, List] = {}
        for t in all_teams:
            gn = (t.guide_name or "").strip().lower()
            if gn:
                teams_by_guide.setdefault(gn, []).append(t)
            key = f"{(t.class_name or '').strip().lower()}|{(t.batch or '').strip().lower()}"
            if key != "|":
                teams_by_class_batch.setdefault(key, []).append(t)

        def _find_teams_for_guide(name: str, advisor_class: str = "", advisor_batch: str = "") -> list:
            gn = (name or "").strip().lower()
            tc = teams_by_guide.get(gn, [])
            if not tc and advisor_class and advisor_batch:
                key = f"{advisor_class.strip().lower()}|{advisor_batch.strip().lower()}"
                tc = teams_by_class_batch.get(key, [])
            return tc

        seen_emails = set()
        result = []

        for f in fac_rows:
            if not f.email:
                continue
            email_lower = f.email.lower()
            seen_emails.add(email_lower)
            tc = _find_teams_for_guide(f.name or "", f.advisor_class or "", f.advisor_batch or "")

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
            tc = _find_teams_for_guide(u.name or "")
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
        setting = res.scalars().first()
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
        setting = res.scalars().first()
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

