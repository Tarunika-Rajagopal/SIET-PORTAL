"""Marks service - weekly marks CRUD and authorization for teams."""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models import WeeklyMark, WeeklyMemberMark, Team, User
from repositories.team_repository import TeamRepository
from repositories.marks_repository import MarksRepository


class MarksService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.team_repo = TeamRepository(session)
        self.marks_repo = MarksRepository(session)

    async def find_team(self, team_id: str) -> Team:
        team = await self.team_repo.get_by_team_id_string(team_id)
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        return team

    def check_team_access(self, team: Team, user: User) -> None:
        if user.role == "student":
            if user.team_id != team.team_id and user.team_id != str(team.id):
                raise HTTPException(status_code=403, detail="You are not authorized to view marks for this team")
        elif user.role == "guide":
            guide_name = user.name or ""
            is_guide = False
            if team.guide_email and team.guide_email.lower() == user.email.lower():
                is_guide = True
            elif team.guide_name and guide_name and guide_name.lower() in team.guide_name.lower():
                is_guide = True
            if not is_guide:
                raise HTTPException(status_code=403, detail="You are not authorized to view marks for this team")

    async def get_all_team_marks(self, team_id: str, user: User) -> Dict[int, Any]:
        team = await self.find_team(team_id)
        self.check_team_access(team, user)

        rows = await self.marks_repo.list_by_team(team.id)
        result = {}
        for wm in rows:
            member_marks = {}
            for mm in (wm.member_marks or []):
                member_marks[mm.roll_no] = float(mm.mark) if mm.mark else 0
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

        member_marks = {}
        for mm in (row.member_marks or []):
            member_marks[mm.roll_no] = float(mm.mark) if mm.mark else 0

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
        avg = round(sum(marks_vals) / len(marks_vals), 1) if marks_vals else 0

        if existing:
            existing.team_average = avg
            existing.remarks = remarks
            existing.graded_by = graded_by
            existing.graded_at = datetime.now(timezone.utc)
            if existing.member_marks:
                await self.marks_repo.delete_member_marks(list(existing.member_marks))
            for rno, mark in member_marks.items():
                await self.marks_repo.add_member_mark(
                    WeeklyMemberMark(
                        id=uuid.uuid4(),
                        weekly_mark_id=existing.id,
                        roll_no=rno,
                        mark=mark,
                    )
                )
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
            for rno, mark in member_marks.items():
                await self.marks_repo.add_member_mark(
                    WeeklyMemberMark(
                        id=uuid.uuid4(),
                        weekly_mark_id=wm.id,
                        roll_no=rno,
                        mark=mark,
                    )
                )
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
        else:
            wms = await self.marks_repo.list_by_team(team.id)
            for wm in wms:
                if wm.member_marks:
                    await self.marks_repo.delete_member_marks(list(wm.member_marks))
                await self.marks_repo.delete_weekly_mark(wm)

        await self.session.commit()
        return {"success": True, "message": "Marks deleted"}
