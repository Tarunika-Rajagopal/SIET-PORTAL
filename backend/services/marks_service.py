"""Marks service - weekly marks CRUD and authorization for teams."""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import WeeklyMark, WeeklyMemberMark, Team, TeamMember, User
from repositories.team_repository import TeamRepository
from repositories.marks_repository import MarksRepository
from repositories.submission_repository import SubmissionRepository


def _normalize_faculty_name(name: Optional[str]) -> str:
    if not name:
        return ""
    cleaned = name.lower().strip()
    for prefix in ["dr.", "dr ", "prof.", "prof ", "mr.", "mr ", "mrs.", "mrs ", "ms.", "ms "]:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return " ".join(cleaned.split())


def _is_guide_for_team(user: User, team: Optional[Team]) -> bool:
    if not team:
        return False
    if team.guide_email and user.email:
        return team.guide_email.strip().lower() == user.email.strip().lower()
    if team.guide_name and user.name:
        return _normalize_faculty_name(team.guide_name) == _normalize_faculty_name(user.name)
    return False


class MarksService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.marks_repo = MarksRepository(session)
        self.sub_repo = SubmissionRepository(session)

    async def find_team(self, team_id: str) -> Team:
        team = await self.team_repo.get_by_team_id_string(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        return team

    def check_team_access(self, team: Team, user: User) -> None:
        user_role = (user.role or "").lower()
        if user_role == "student":
            if user.team_id != team.team_id and user.team_id != str(team.id):
                raise HTTPException(status_code=403, detail="You are not authorized to view marks for this team")
        elif "guide" in user_role:
            if not _is_guide_for_team(user, team):
                raise HTTPException(status_code=403, detail="You are not authorized to view marks for this team")

    async def _get_team_members(self, team_id_uuid: uuid.UUID) -> list:
        res = await self.session.execute(select(TeamMember).where(TeamMember.team_id == team_id_uuid))
        return res.scalars().all()

    @staticmethod
    def _align_member_marks(wm_member_marks: list, wm_team_average: Optional[float], current_members: list) -> Dict[str, float]:
        raw_marks: Dict[str, float] = {}
        for mm in (wm_member_marks or []):
            if mm.roll_no:
                raw_marks[mm.roll_no.strip()] = float(mm.mark) if mm.mark is not None else 0.0

        if not current_members:
            return raw_marks

        current_roll_nos = [m.roll_no.strip() for m in current_members if m.roll_no]
        avg_val = float(wm_team_average) if wm_team_average is not None else 0.0

        # Unmatched marks from old or reassigned member slots
        unmatched_marks = [
            mark for rno, mark in raw_marks.items()
            if not any(rno.lower() == cr.lower() for cr in current_roll_nos)
        ]

        result_marks: Dict[str, float] = {}
        for tm in current_members:
            if not tm.roll_no:
                continue
            rno = tm.roll_no.strip()
            matched_key = next((k for k in raw_marks.keys() if k.lower() == rno.lower()), None)
            if matched_key is not None:
                result_marks[rno] = raw_marks[matched_key]
            else:
                assigned = unmatched_marks.pop(0) if unmatched_marks else avg_val
                result_marks[rno] = assigned

        return result_marks

    async def get_all_marks(self) -> Dict[str, Dict[int, Any]]:
        rows = await self.marks_repo.list_all_marks()
        result: Dict[str, Dict[int, Any]] = {}
        teams = await self.team_repo.list_all()
        team_id_to_no = {str(t.id): t.team_no for t in teams}
        team_id_to_str_id = {str(t.id): t.team_id for t in teams}
        team_id_to_class = {str(t.id): (t.class_name or "") for t in teams}

        # Track team_no frequency across all classes
        team_no_counts: Dict[str, int] = {}
        for t in teams:
            if t.team_no:
                clean_no = t.team_no.strip().lower()
                team_no_counts[clean_no] = team_no_counts.get(clean_no, 0) + 1

        # Build in-memory team members map directly from eagerly loaded team.members
        # (team_repo.list_all already fetches members via selectinload in a single batch query)
        team_members_map: Dict[str, list] = {
            str(t.id): list(t.members or []) for t in teams
        }

        for wm in rows:
            t_uuid = str(wm.team_id)
            t_no = team_id_to_no.get(t_uuid, t_uuid)
            t_id_str = team_id_to_str_id.get(t_uuid, t_uuid)
            t_class = team_id_to_class.get(t_uuid, "")
            current_members = team_members_map.get(t_uuid, [])

            member_marks = self._align_member_marks(wm.member_marks or [], wm.team_average, current_members)

            entry = {
                "teamId": t_no or t_id_str or t_uuid,
                "weekNumber": wm.week_number,
                "memberMarks": member_marks,
                "teamAverage": float(wm.team_average) if wm.team_average else 0,
                "remarks": wm.remarks or "",
                "gradedAt": wm.graded_at.isoformat() if wm.graded_at else "",
                "gradedBy": wm.graded_by or "Class Advisor",
            }

            keys_to_index = [t_uuid]
            if t_id_str:
                keys_to_index.append(t_id_str)
            if t_class and t_no:
                keys_to_index.append(f"{t_class} {t_no}".strip())
                keys_to_index.append(f"{t_class}-{t_no}".strip())
            # Only add bare t_no if it is unique across all teams to prevent cross-class collisions
            if t_no and team_no_counts.get(t_no.strip().lower(), 0) == 1:
                keys_to_index.append(t_no)

            for key in set(keys_to_index):
                if not key:
                    continue
                if key not in result:
                    result[key] = {}
                result[key][wm.week_number] = entry

        return result

    async def get_all_team_marks(self, team_id: str, user: User) -> Dict[int, Any]:
        team = await self.find_team(team_id)
        self.check_team_access(team, user)

        rows = await self.marks_repo.list_by_team(team.id)
        current_members = await self._get_team_members(team.id)
        result = {}
        for wm in rows:
            member_marks = self._align_member_marks(wm.member_marks or [], wm.team_average, current_members)
            result[wm.week_number] = {
                "teamId": str(wm.team_id),
                "weekNumber": wm.week_number,
                "memberMarks": member_marks,
                "teamAverage": float(wm.team_average) if wm.team_average else 0,
                "remarks": wm.remarks or "",
                "gradedAt": wm.graded_at.isoformat() if wm.graded_at else "",
                "gradedBy": wm.graded_by or "Class Advisor",
            }
        return result

    async def get_weekly_marks(self, team_id: str, week_number: int, user: User) -> Dict[str, Any]:
        team = await self.find_team(team_id)
        self.check_team_access(team, user)

        row = await self.marks_repo.get_weekly_mark(team.id, week_number)
        if not row:
            raise HTTPException(status_code=404, detail="No marks found for this week")

        current_members = await self._get_team_members(team.id)
        member_marks = self._align_member_marks(row.member_marks or [], row.team_average, current_members)

        return {
            "teamId": str(row.team_id),
            "weekNumber": row.week_number,
            "memberMarks": member_marks,
            "teamAverage": float(row.team_average) if row.team_average else 0,
            "remarks": row.remarks or "",
            "gradedAt": row.graded_at.isoformat() if row.graded_at else "",
            "gradedBy": row.graded_by or "Class Advisor",
        }

    async def save_weekly_marks(
        self,
        team_id: str,
        week_number: int,
        member_marks: dict,
        remarks: str = "",
        graded_by: str = "Class Advisor",
    ) -> Dict[str, Any]:
        team = await self.find_team(team_id)

        existing = await self.marks_repo.get_weekly_mark(team.id, week_number)
        marks_vals = [v for v in member_marks.values() if isinstance(v, (int, float))]
        if marks_vals:
            avg = round(sum(marks_vals) / len(marks_vals), 1)
        else:
            sub = await self.sub_repo.get_by_team_and_week(team.id, week_number)
            if sub and sub.score is not None:
                avg = float(sub.score)
            elif existing and existing.team_average:
                avg = float(existing.team_average)
            else:
                avg = 0.0

        # Align marks to current team members so none are omitted
        current_members = await self._get_team_members(team.id)
        normalized_member_marks: Dict[str, float] = {}
        for rno, mark in member_marks.items():
            if isinstance(mark, (int, float)):
                normalized_member_marks[str(rno).strip()] = float(mark)

        for tm in current_members:
            if not tm.roll_no:
                continue
            rno = tm.roll_no.strip()
            if not any(k.lower() == rno.lower() for k in normalized_member_marks.keys()):
                normalized_member_marks[rno] = avg

        if existing:
            existing.team_average = avg
            existing.remarks = remarks
            existing.graded_by = graded_by
            existing.graded_at = datetime.now(timezone.utc)
            if existing.member_marks:
                await self.marks_repo.delete_member_marks(list(existing.member_marks))
                await self.session.flush()
            for rno, mark in normalized_member_marks.items():
                await self.marks_repo.add_member_mark(
                    WeeklyMemberMark(
                        id=uuid.uuid4(),
                        weekly_mark_id=existing.id,
                        roll_no=rno,
                        mark=mark,
                    )
                )
            try:
                sub = await self.sub_repo.get_by_team_and_week(team.id, week_number)
                if sub:
                    sub.score = avg
                    if remarks:
                        sub.comments = remarks
                    if avg > 0:
                        sub.status = "Approved"
                if avg > 0 and week_number == 1 and team:
                    team.is_title_approved = True
                    team.guide_approval_status = "Approved"
                    team.status = "Approved"
                if avg > 0 and team:
                    team.progress = max(team.progress or 0, min(100, week_number * 25))
            except Exception:
                pass
            await self.session.commit()
            return {"success": True, "message": "Marks updated", "teamAverage": avg}
        else:
            wm = WeeklyMark(
                id=uuid.uuid4(),
                team_id=team.id,
                week_number=week_number,
                team_average=avg,
                remarks=remarks,
                graded_by=graded_by,
            )
            await self.marks_repo.create_weekly_mark(wm)
            await self.session.flush()
            for rno, mark in normalized_member_marks.items():
                await self.marks_repo.add_member_mark(
                    WeeklyMemberMark(
                        id=uuid.uuid4(),
                        weekly_mark_id=wm.id,
                        roll_no=rno,
                        mark=mark,
                    )
                )
            try:
                sub = await self.sub_repo.get_by_team_and_week(team.id, week_number)
                if sub:
                    sub.score = avg
                    if remarks:
                        sub.comments = remarks
                    if avg > 0:
                        sub.status = "Approved"
                if avg > 0 and week_number == 1 and team:
                    team.is_title_approved = True
                    team.guide_approval_status = "Approved"
                    team.status = "Approved"
                if avg > 0 and team:
                    team.progress = max(team.progress or 0, min(100, week_number * 25))
            except Exception:
                pass
            await self.session.commit()
            return {"success": True, "message": "Marks saved", "teamAverage": avg}

    async def delete_weekly_marks(
        self, team_id: str, week_number: Optional[int] = None
    ) -> Dict[str, Any]:
        team = await self.find_team(team_id)

        if week_number is not None:
            wm = await self.marks_repo.get_weekly_mark(team.id, week_number)
            if wm:
                if wm.member_marks:
                    await self.marks_repo.delete_member_marks(list(wm.member_marks))
                await self.marks_repo.delete_weekly_mark(wm)
            try:
                sub = await self.sub_repo.get_by_team_and_week(team.id, week_number)
                if sub:
                    sub.score = None
            except Exception:
                pass
        else:
            wms = await self.marks_repo.list_by_team(team.id)
            for wm in wms:
                if wm.member_marks:
                    await self.marks_repo.delete_member_marks(list(wm.member_marks))
                await self.marks_repo.delete_weekly_mark(wm)
            try:
                subs = await self.sub_repo.list_by_team(team.id)
                for s in subs:
                    s.score = None
            except Exception:
                pass

        await self.session.commit()
        return {"success": True, "message": "Marks deleted"}
