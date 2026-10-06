"""Student service for managing student team queries and deliverable submissions."""
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import User, Team, TeamMember, WeeklySubmission, Setting
from repositories.team_repository import TeamRepository
from repositories.submission_repository import SubmissionRepository
from schemas import SubmitDeliverablesRequest


class StudentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.sub_repo = SubmissionRepository(session)

    @staticmethod
    def _format_team(t: Team) -> dict:
        members = []
        if t.members:
            for m in t.members:
                members.append({
                    "name": m.name,
                    "rollNo": m.roll_no,
                    "email": m.email,
                    "phone": m.phone or "",
                    "isLead": m.is_lead,
                    "role": m.member_role or ("Team Lead" if m.is_lead else "Team Member"),
                })
        return {
            "id": t.team_id or str(t.id),
            "teamId": t.team_id,
            "teamNo": t.team_no,
            "projectTitle": t.project_title or "",
            "submittedTitle": t.submitted_title or t.project_title or "",
            "isTitleApproved": bool(t.is_title_approved),
            "guideApprovalStatus": t.guide_approval_status or "Pending",
            "rejectionReason": t.rejection_reason or "",
            "guideName": t.guide_name or "",
            "advisorName": t.advisor_name or "",
            "batch": t.batch,
            "section": t.class_name,
            "status": t.status or "In Progress",
            "progress": t.progress or 0,
            "problemStatement": t.problem_statement or "",
            "proposedSolution": t.proposed_solution or "",
            "abstract": t.abstract or "",
            "repoUrl": t.repo_url or "",
            "demoUrl": t.demo_url or "",
            "members": members,
        }

    @staticmethod
    def _format_sub(s: WeeklySubmission) -> dict:
        return {
            "id": str(s.id),
            "week": s.week,
            "title": s.title or f"Week {s.week} Deliverables",
            "dueDate": s.due_date or "",
            "status": s.status or "Pending",
            "submissionDate": s.submission_date or "",
            "fileName": s.file_name or "",
            "fileSize": s.file_size or "",
            "comments": s.comments or "",
            "score": float(s.score) if s.score is not None else None,
            "maxScore": float(s.max_score) if s.max_score is not None else 100.0,
            "projectTitle": s.project_title or "",
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
            "guideName": s.guide_name or "",
            "guideReviewDate": s.guide_review_date or "",
        }

    async def _find_team(self, user: User, with_members: bool = False) -> Team:
        team = None
        if user.team_id:
            if with_members:
                team = await self.team_repo.get_with_members(user.team_id)
            else:
                team = await self.team_repo.get_by_team_id_string(user.team_id)

        if not team:
            from sqlalchemy import or_, desc, func
            from models import Student
            clauses = []
            if user.roll_no and user.roll_no.strip():
                clauses.append(func.lower(func.trim(TeamMember.roll_no)) == user.roll_no.strip().lower())
            if user.email and user.email.strip():
                clauses.append(func.lower(func.trim(TeamMember.email)) == user.email.strip().lower())
            if clauses:
                res = await self.session.execute(
                    select(TeamMember)
                    .where(or_(*clauses))
                    .order_by(desc(TeamMember.created_at))
                )
                members = res.scalars().all()
                for tm in members:
                    if tm and tm.team_id:
                        if with_members:
                            team = await self.team_repo.get_with_members(tm.team_id)
                        else:
                            team = await self.team_repo.get_by_id(tm.team_id)
                        if team:
                            if not user.team_id:
                                user.team_id = team.team_id or str(team.id)
                                try:
                                    await self.session.commit()
                                except Exception:
                                    await self.session.rollback()
                            break

            # Secondary fallback: lookup in students table by roll_no or email
            if not team and (user.roll_no or user.email):
                s_clauses = []
                if user.roll_no and user.roll_no.strip():
                    s_clauses.append(func.lower(func.trim(Student.roll_no)) == user.roll_no.strip().lower())
                if user.email and user.email.strip():
                    s_clauses.append(func.lower(func.trim(Student.email)) == user.email.strip().lower())
                if s_clauses:
                    res_s = await self.session.execute(select(Student).where(or_(*s_clauses)))
                    stud = res_s.scalars().first()
                    if stud and stud.class_section and stud.team_no and stud.team_no != "Unassigned":
                        team_candidates = [
                            f"{stud.class_section}-{stud.team_no}",
                            stud.team_no,
                        ]
                        for cand in team_candidates:
                            if with_members:
                                team = await self.team_repo.get_with_members(cand)
                            else:
                                team = await self.team_repo.get_by_team_id_string(cand)
                            if team:
                                if not user.team_id:
                                    user.team_id = team.team_id or str(team.id)
                                    try:
                                        await self.session.commit()
                                    except Exception:
                                        await self.session.rollback()
                                break

        if not team:
            raise HTTPException(404, "Student is not assigned to any team")
        return team

    async def get_team(self, user: User) -> dict:
        team = await self._find_team(user, with_members=True)
        advisor_name = ""
        if team.class_name:
            from models import Faculty
            from sqlalchemy import or_, cast, String
            adv_res = await self.session.execute(
                select(Faculty).where(
                    Faculty.advisor_class.ilike(team.class_name.strip()),
                    or_(
                        cast(Faculty.role, String).ilike("%advisor%"),
                        cast(Faculty.role, String).ilike("%advisor & guide%")
                    )
                )
            )
            adv = adv_res.scalars().first()
            if adv:
                advisor_name = adv.name or ""
                if team.advisor_name != advisor_name:
                    team.advisor_name = advisor_name
                    team.advisor_email = adv.email
                    try:
                        await self.session.commit()
                    except Exception:
                        await self.session.rollback()
            else:
                # No active advisor assigned to this class section
                if team.advisor_name:
                    team.advisor_name = ""
                    team.advisor_email = ""
                    try:
                        await self.session.commit()
                    except Exception:
                        await self.session.rollback()
        else:
            advisor_name = team.advisor_name or ""

        formatted = self._format_team(team)
        formatted["advisorName"] = advisor_name
        return formatted

    async def get_submissions(self, user: User) -> List[dict]:
        team = await self._find_team(user, with_members=False)
        rows = await self.sub_repo.list_by_team(team.id)
        
        # Identify Submission 1 anchor details for carryover to submissions 2, 3, 4
        sub1 = next((s for s in rows if s.week == 1), None)
        anchor_title = (sub1.project_title if sub1 and sub1.project_title else (team.project_title or team.submitted_title or "")).strip()
        anchor_problem = (sub1.problem_statement if sub1 and sub1.problem_statement else (team.problem_statement or "")).strip()
        anchor_solution = (sub1.solution if sub1 and sub1.solution else (team.proposed_solution or "")).strip()

        out = []
        for s in rows:
            formatted = self._format_sub(s)
            if s.week > 1:
                formatted["projectTitle"] = anchor_title or formatted.get("projectTitle") or ""
                formatted["problemStatement"] = anchor_problem or formatted.get("problemStatement") or ""
                formatted["solution"] = anchor_solution or formatted.get("solution") or ""
            else:
                if not formatted.get("projectTitle"):
                    formatted["projectTitle"] = anchor_title or team.project_title or team.submitted_title or ""
            out.append(formatted)
        return out

    async def get_submission_by_week(self, user: User, week: int) -> dict:
        team = await self._find_team(user, with_members=False)
        s = await self.sub_repo.get_by_team_and_week(team.id, week)

        # For weeks 2, 3, 4: anchor project title, problem statement, and proposed solution from Submission 1
        sub1 = await self.sub_repo.get_by_team_and_week(team.id, 1) if week > 1 else None
        anchor_title = (sub1.project_title if sub1 and sub1.project_title else (team.project_title or team.submitted_title or "")).strip()
        anchor_problem = (sub1.problem_statement if sub1 and sub1.problem_statement else (team.problem_statement or "")).strip()
        anchor_solution = (sub1.solution if sub1 and sub1.solution else (team.proposed_solution or "")).strip()

        if not s:
            return {
                "week": week,
                "title": f"Week {week} Deliverables",
                "status": "Pending",
                "projectTitle": anchor_title if week > 1 else (team.project_title or team.submitted_title or ""),
                "problemStatement": anchor_problem if week > 1 else "",
                "solution": anchor_solution if week > 1 else "",
                "technologyUsed": "",
                "obstaclesFaced": "",
                "abstract": "",
                "repoUrl": "",
                "demoUrl": "",
            }
        formatted = self._format_sub(s)
        if week > 1:
            formatted["projectTitle"] = anchor_title or formatted.get("projectTitle") or ""
            formatted["problemStatement"] = anchor_problem or formatted.get("problemStatement") or ""
            formatted["solution"] = anchor_solution or formatted.get("solution") or ""
        else:
            if not formatted.get("projectTitle"):
                formatted["projectTitle"] = team.project_title or team.submitted_title or ""
        return formatted

    async def get_week_releases(self) -> dict:
        """Return release status for all 4 weekly submissions from database."""
        res = await self.session.execute(select(Setting).where(Setting.key == "week_release_status"))
        setting = res.scalars().first()
        default_status = {"1": True, "2": True, "3": False, "4": False}
        if not setting or not isinstance(setting.value, dict):
            return default_status
        return {
            "1": bool(setting.value.get("1", setting.value.get(1, True))),
            "2": bool(setting.value.get("2", setting.value.get(2, True))),
            "3": bool(setting.value.get("3", setting.value.get(3, False))),
            "4": bool(setting.value.get("4", setting.value.get(4, False))),
        }

    async def submit_deliverables(self, user: User, week: int, req: SubmitDeliverablesRequest) -> dict:
        # Strict server-side verification: reject submission if week is locked by HOD
        releases = await self.get_week_releases()
        is_rel = bool(releases.get(str(week), False) or releases.get(int(week), False))
        if not is_rel:
            raise HTTPException(
                status_code=403,
                detail=f"Week {week} submissions are locked and have not been released by the Head of Department."
            )

        team = await self._find_team(user, with_members=False)
        s = await self.sub_repo.get_by_team_and_week(team.id, week)

        # Rule 1: Immutability of evaluated & approved submissions
        # If the milestone submission has already been approved by the guide or evaluated (score awarded),
        # modifications are forbidden unless the guide has explicitly requested revisions / rejected it.
        is_in_revision = (
            (s and s.status in ("Changes Requested", "Revision Required", "Rejected")) or
            (week == 1 and team.guide_approval_status in ("Revision Required", "Rejected"))
        )
        is_approved_or_evaluated = False
        if s:
            if s.status == "Approved" or s.score is not None:
                is_approved_or_evaluated = True
        if week == 1 and (team.is_title_approved or team.guide_approval_status == "Approved"):
            is_approved_or_evaluated = True

        if is_approved_or_evaluated and not is_in_revision:
            raise HTTPException(
                status_code=403,
                detail=f"Week {week} milestone has already been evaluated and approved by your Faculty Guide. Further modifications are not permitted."
            )

        today = datetime.now().strftime("%d %b %Y")
        status = "Submitted" if req.isSubmit else "Draft"

        # Rule 2: Anchor Project Title, Problem Statement, and Proposed Solution & Technical Approach
        # Teams only have authority to modify these project details in Submission 1 before guide approval.
        # For remaining submissions (weeks 2, 3, 4), they remain identical to Submission 1.
        if week > 1:
            sub1 = await self.sub_repo.get_by_team_and_week(team.id, 1)
            anchor_title = (sub1.project_title if sub1 and sub1.project_title else (team.project_title or team.submitted_title or "")).strip()
            anchor_problem = (sub1.problem_statement if sub1 and sub1.problem_statement else (team.problem_statement or "")).strip()
            anchor_solution = (sub1.solution if sub1 and sub1.solution else (team.proposed_solution or "")).strip()
            effective_title = anchor_title
            effective_problem = anchor_problem
            effective_solution = anchor_solution
        else:
            submitted_title = (req.projectTitle or "").strip() if req.projectTitle is not None else ""
            effective_title = submitted_title or team.project_title or team.submitted_title or ""
            effective_problem = req.problemStatement if req.problemStatement is not None else (team.problem_statement or "")
            effective_solution = req.solution if req.solution is not None else (team.proposed_solution or "")

        is_comp = True if req.isSubmit else False

        if not s:
            s = WeeklySubmission(
                id=uuid.uuid4(),
                team_id=team.id,
                week=week,
                title=f"Week {week} Deliverables",
                status=status,
                is_completed=is_comp,
                submission_date=today,
                problem_statement=effective_problem,
                solution=effective_solution,
                technology_used=req.technologyUsed or "",
                obstacles_faced=req.obstaclesFaced or "",
                abstract=req.abstract or "",
                repo_url=req.repoUrl or "",
                demo_url=req.demoUrl or "",
                project_title=effective_title,
                guide_name=team.guide_name or "",
            )
            await self.sub_repo.create(s)
        else:
            s.status = status
            if req.isSubmit:
                s.is_completed = True
            s.submission_date = today
            if req.isSubmit and is_in_revision:
                s.score = None

            s.project_title = effective_title

            sent_fields = getattr(req, "model_fields_set", None) or getattr(req, "__fields_set__", None)
            
            # For week 1: allow problem_statement and solution updates
            # For week > 1: enforce anchor values from Submission 1
            if week > 1:
                s.problem_statement = effective_problem
                s.solution = effective_solution
                field_map = [
                    ("technology_used", "technologyUsed", req.technologyUsed),
                    ("obstacles_faced", "obstaclesFaced", req.obstaclesFaced),
                    ("abstract", "abstract", req.abstract),
                    ("repo_url", "repoUrl", req.repoUrl),
                    ("demo_url", "demoUrl", req.demoUrl),
                ]
            else:
                field_map = [
                    ("problem_statement", "problemStatement", req.problemStatement),
                    ("solution", "solution", req.solution),
                    ("technology_used", "technologyUsed", req.technologyUsed),
                    ("obstacles_faced", "obstaclesFaced", req.obstaclesFaced),
                    ("abstract", "abstract", req.abstract),
                    ("repo_url", "repoUrl", req.repoUrl),
                    ("demo_url", "demoUrl", req.demoUrl),
                ]

            for attr, field_name, val in field_map:
                if sent_fields is not None:
                    if field_name in sent_fields:
                        setattr(s, attr, val or "")
                elif val is not None:
                    setattr(s, attr, val)

        # For Week 1 ONLY: synchronize project details to the Team record
        if week == 1:
            if effective_title:
                team.project_title = effective_title
                team.submitted_title = effective_title
            if req.problemStatement is not None:
                team.problem_statement = req.problemStatement
            if req.solution is not None:
                team.proposed_solution = req.solution
            if req.abstract is not None:
                team.abstract = req.abstract
            if req.repoUrl is not None:
                team.repo_url = req.repoUrl
            if req.demoUrl is not None:
                team.demo_url = req.demoUrl

        team.last_modified = datetime.now()

        await self.session.commit()
        formatted = self._format_sub(s)
        if week > 1:
            formatted["projectTitle"] = effective_title
            formatted["problemStatement"] = effective_problem
            formatted["solution"] = effective_solution
        elif not formatted.get("projectTitle"):
            formatted["projectTitle"] = team.project_title or team.submitted_title or ""
        return formatted

    async def delete_submission(self, user: User, week: int) -> dict:
        team = await self._find_team(user)
        s = await self.sub_repo.get_by_team_and_week(team.id, week)
        if s:
            is_in_revision = (
                s.status in ("Changes Requested", "Revision Required", "Rejected") or
                (week == 1 and team.guide_approval_status in ("Revision Required", "Rejected"))
            )
            is_approved_or_evaluated = (
                s.status == "Approved" or
                s.score is not None or
                (week == 1 and (team.is_title_approved or team.guide_approval_status == "Approved"))
            )
            if is_approved_or_evaluated and not is_in_revision:
                raise HTTPException(
                    status_code=403,
                    detail=f"Cannot delete milestone {week} because it has already been approved or evaluated."
                )
            await self.sub_repo.delete(s)
            await self.session.commit()
        return {"success": True, "message": f"Week {week} submission deleted."}
