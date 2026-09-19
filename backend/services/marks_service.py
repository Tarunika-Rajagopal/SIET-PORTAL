"""Marks service - weekly marks CRUD for advisor."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import WeeklyMark, WeeklyMemberMark, Student


class MarksService:

    @staticmethod
    async def get_weekly_marks(db, team_db_id, week_number):
        row = (await db.execute(
            select(WeeklyMark).where(
                WeeklyMark.team_id == team_db_id,
                WeeklyMark.week_number == week_number,
            )
        )).scalar_one_or_none()
        if not row:
            return None
        member_marks = {}
        for mm in (row.member_marks or []):
            member_marks[mm.roll_no] = float(mm.mark) if mm.mark else 0
        return {
            "teamId": str(row.team_id), "weekNumber": row.week_number,
            "memberMarks": member_marks,
            "teamAverage": float(row.team_average) if row.team_average else 0,
            "remarks": row.remarks or "",
            "gradedAt": row.graded_at.isoformat() if row.graded_at else "",
            "gradedBy": row.graded_by or "Class Advisor",
        }

    @staticmethod
    async def save_weekly_marks(db, team_db_id, week_number, member_marks,
                                 remarks="", graded_by="Class Advisor"):
        existing = (await db.execute(
            select(WeeklyMark).where(
                WeeklyMark.team_id == team_db_id,
                WeeklyMark.week_number == week_number,
            )
        )).scalar_one_or_none()

        marks_vals = [v for v in member_marks.values() if isinstance(v, (int, float))]
        avg = round(sum(marks_vals) / len(marks_vals), 1) if marks_vals else 0

        if existing:
            existing.team_average = avg
            existing.remarks = remarks
            existing.graded_by = graded_by
            existing.graded_at = datetime.now(timezone.utc)
            for mm in existing.member_marks:
                await db.delete(mm)
            for rno, mark in member_marks.items():
                db.add(WeeklyMemberMark(
                    id=uuid.uuid4(), weekly_mark_id=existing.id,
                    roll_no=rno, mark=mark,
                ))
            await db.commit()
            return {"success": True, "message": "Marks updated", "teamAverage": avg}
        else:
            wm = WeeklyMark(
                id=uuid.uuid4(), team_id=team_db_id, week_number=week_number,
                team_average=avg, remarks=remarks, graded_by=graded_by,
            )
            db.add(wm)
            await db.flush()
            for rno, mark in member_marks.items():
                db.add(WeeklyMemberMark(
                    id=uuid.uuid4(), weekly_mark_id=wm.id,
                    roll_no=rno, mark=mark,
                ))
            await db.commit()
            return {"success": True, "message": "Marks saved", "teamAverage": avg}

    @staticmethod
    async def delete_weekly_marks(db, team_db_id, week_number=None):
        q = select(WeeklyMark).where(WeeklyMark.team_id == team_db_id)
        if week_number is not None:
            q = q.where(WeeklyMark.week_number == week_number)
        rows = (await db.execute(q)).scalars().all()
        for wm in rows:
            for mm in (await db.execute(
                select(WeeklyMemberMark).where(WeeklyMemberMark.weekly_mark_id == wm.id)
            )).scalars().all():
                await db.delete(mm)
            await db.delete(wm)
        await db.commit()
        return {"success": True, "message": "Marks deleted"}

    @staticmethod
    async def get_all_team_marks(db, team_db_id):
        rows = (await db.execute(
            select(WeeklyMark).where(WeeklyMark.team_id == team_db_id)
        )).scalars().all()
        result = {}
        for wm in rows:
            member_marks = {}
            for mm in (wm.member_marks or []):
                member_marks[mm.roll_no] = float(mm.mark) if mm.mark else 0
            result[wm.week_number] = {
                "teamId": str(wm.team_id), "weekNumber": wm.week_number,
                "memberMarks": member_marks,
                "teamAverage": float(wm.team_average) if wm.team_average else 0,
                "remarks": wm.remarks or "",
                "gradedAt": wm.graded_at.isoformat() if wm.graded_at else "",
                "gradedBy": wm.graded_by or "Class Advisor",
            }
        return result
