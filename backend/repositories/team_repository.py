"""Team repository for database access on Team and TeamMember entities."""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String, or_
from sqlalchemy.orm import selectinload

from models import Team, TeamMember


class TeamRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, team_id: uuid.UUID) -> Optional[Team]:
        res = await self.session.execute(select(Team).where(Team.id == team_id))
        return res.scalars().first()

    @staticmethod
    def _class_variants(raw: str) -> List[str]:
        raw = (raw or "").strip()
        if not raw:
            return []
        v = {raw, raw.upper()}
        clean = raw.replace(" ", "").replace("-", "").upper()
        v.add(clean)
        if clean.startswith("IV"):
            clean = clean[2:]
            v.add(clean)
        if clean and clean[-1].isalpha():
            sec = clean[-1]
            v.update([f"CSE-{sec}", f"CSE {sec}", f"IV CSE-{sec}", f"IV CSE {sec}", sec])
        return list(v)

    async def get_by_team_id_string(self, team_id_str: str) -> Optional[Team]:
        cleaned = team_id_str.strip()
        digits = "".join(c for c in cleaned if c.isdigit())
        num = int(digits) if digits else None
        conds = [Team.team_id == cleaned, Team.team_no == cleaned]
        try:
            parsed_uuid = uuid.UUID(cleaned)
            conds.append(Team.id == parsed_uuid)
        except (ValueError, TypeError):
            conds.append(cast(Team.id, String) == cleaned)

        if num is not None:
            conds.extend([
                Team.team_no == f"Team {num:02d}",
                Team.team_no == f"Team {num}",
                Team.team_id.ilike(f"%{digits}%"),
            ])

        res = await self.session.execute(select(Team).where(or_(*conds)))
        return res.scalars().first()

    async def get_with_members(self, team_identifier: uuid.UUID | str) -> Optional[Team]:
        q = select(Team).options(selectinload(Team.members))
        if isinstance(team_identifier, uuid.UUID):
            q = q.where(Team.id == team_identifier)
        else:
            cleaned = str(team_identifier).strip()
            digits = "".join(c for c in cleaned if c.isdigit())
            num = int(digits) if digits else None

            conds = [Team.team_id == cleaned, Team.team_no == cleaned]
            try:
                parsed_uuid = uuid.UUID(cleaned)
                conds.append(Team.id == parsed_uuid)
            except (ValueError, TypeError):
                conds.append(cast(Team.id, String) == cleaned)

            if num is not None:
                conds.extend([
                    Team.team_no == f"Team {num:02d}",
                    Team.team_no == f"Team {num}",
                    Team.team_id.ilike(f"%{digits}%"),
                ])
            q = q.where(or_(*conds))
        res = await self.session.execute(q)
        return res.scalars().first()

    async def get_with_members_and_submissions(self, team_identifier: uuid.UUID | str) -> Optional[Team]:
        q = select(Team).options(
            selectinload(Team.members),
            selectinload(Team.submissions),
        )
        if isinstance(team_identifier, uuid.UUID):
            q = q.where(Team.id == team_identifier)
        else:
            cleaned = str(team_identifier).strip()
            digits = "".join(c for c in cleaned if c.isdigit())
            num = int(digits) if digits else None

            conds = [Team.team_id == cleaned, Team.team_no == cleaned]
            try:
                parsed_uuid = uuid.UUID(cleaned)
                conds.append(Team.id == parsed_uuid)
            except (ValueError, TypeError):
                conds.append(cast(Team.id, String) == cleaned)

            if num is not None:
                conds.extend([
                    Team.team_no == f"Team {num:02d}",
                    Team.team_no == f"Team {num}",
                    Team.team_id.ilike(f"%{digits}%"),
                ])
            q = q.where(or_(*conds))
        res = await self.session.execute(q)
        return res.scalars().first()

    async def list_by_class(self, class_name: str, batch: Optional[str] = None) -> List[Team]:
        variants = self._class_variants(class_name)
        q = select(Team).options(selectinload(Team.members)).where(Team.class_name.in_(variants))
        if batch and batch != "ALL":
            q = q.where(Team.batch == batch)
        res = await self.session.execute(q.order_by(Team.team_no))
        return list(res.scalars().all())

    async def list_by_guide(self, guide_email: Optional[str] = None, guide_name: Optional[str] = None) -> List[Team]:
        conditions = []
        if guide_email:
            conditions.append(Team.guide_email == guide_email)
        if guide_name:
            conditions.append(Team.guide_name.ilike(f"%{guide_name}%"))
        if not conditions:
            return []
        q = select(Team).options(selectinload(Team.members)).where(or_(*conditions))
        res = await self.session.execute(q.order_by(Team.team_no))
        return list(res.scalars().all())

    async def list_all(
        self,
        search: Optional[str] = None,
        batch: Optional[str] = None,
        class_name: Optional[str] = None,
    ) -> List[Team]:
        q = select(Team).options(
            selectinload(Team.members),
            selectinload(Team.submissions),
        )
        if batch and batch != "ALL":
            q = q.where(Team.batch == batch)
        if class_name and class_name != "ALL":
            q = q.where(Team.class_name == class_name)
        if search:
            s = f"%{search.strip()}%"
            q = q.where(
                or_(
                    Team.team_no.ilike(s),
                    Team.project_title.ilike(s),
                    Team.guide_name.ilike(s),
                    Team.team_id.ilike(s),
                )
            )
        res = await self.session.execute(q.order_by(Team.team_no))
        return list(res.scalars().all())

    async def create(self, team: Team) -> Team:
        self.session.add(team)
        return team

    async def delete(self, team: Team) -> None:
        await self.session.delete(team)

    async def add_member(self, member: TeamMember) -> TeamMember:
        self.session.add(member)
        return member

    async def remove_member(self, member: TeamMember) -> None:
        await self.session.delete(member)

    async def get_member_by_roll(self, team_id: uuid.UUID, roll_no: str) -> Optional[TeamMember]:
        res = await self.session.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.roll_no == roll_no.strip(),
            )
        )
        return res.scalars().first()

    async def list_members_by_team_id(self, team_id: uuid.UUID) -> List[TeamMember]:
        res = await self.session.execute(
            select(TeamMember).where(TeamMember.team_id == team_id)
        )
        return list(res.scalars().all())

    async def get_team_by_member_roll_no(self, roll_no: str) -> Optional[Team]:
        res = await self.session.execute(
            select(Team)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .options(selectinload(Team.members))
            .where(TeamMember.roll_no == roll_no.strip())
            .distinct()
        )
        return res.scalars().first()

    async def list_by_advisor_name(self, advisor_name: str) -> List[Team]:
        res = await self.session.execute(
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.advisor_name.ilike(f"%{advisor_name.strip()}%"))
        )
        return list(res.scalars().all())

    async def list_by_guide_name(self, guide_name: str) -> List[Team]:
        res = await self.session.execute(
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.guide_name == guide_name.strip())
        )
        return list(res.scalars().all())

    async def get_by_guide_id(self, guide_id: str) -> List[Team]:
        res = await self.session.execute(
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.guide_id == guide_id)
        )
        return list(res.scalars().all())

    async def get_by_advisor_id(self, advisor_id: str) -> List[Team]:
        res = await self.session.execute(
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.advisor_id == advisor_id)
        )
        return list(res.scalars().all())
