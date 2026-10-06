"""Team repository for database access on Team and TeamMember entities."""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String, or_, func
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
        cleaned = (team_id_str or "").strip()
        if not cleaned:
            return None

        # 1. Exact UUID match
        try:
            parsed_uuid = uuid.UUID(cleaned)
            res = await self.session.execute(select(Team).where(Team.id == parsed_uuid))
            team = res.scalars().first()
            if team:
                return team
        except (ValueError, TypeError):
            pass

        # 2. Exact team_id match (case-insensitive)
        res = await self.session.execute(
            select(Team).where(func.lower(Team.team_id) == cleaned.lower())
        )
        team = res.scalars().first()
        if team:
            return team

        # 3. Exact team_no match (case-insensitive, e.g. "Team 01")
        res = await self.session.execute(
            select(Team).where(func.lower(Team.team_no) == cleaned.lower())
        )
        team = res.scalars().first()
        if team:
            return team

        # 4. Fallback digits match ONLY if cleaned input is numeric digits (e.g. "1" or "01")
        if cleaned.isdigit():
            num = int(cleaned)
            res = await self.session.execute(
                select(Team).where(
                    or_(
                        Team.team_no == f"Team {num:02d}",
                        Team.team_no == f"Team {num}",
                    )
                )
            )
            team = res.scalars().first()
            if team:
                return team

        return None

    async def get_with_members(self, team_identifier: uuid.UUID | str) -> Optional[Team]:
        q = select(Team).options(selectinload(Team.members))
        if isinstance(team_identifier, uuid.UUID):
            res = await self.session.execute(q.where(Team.id == team_identifier))
            return res.scalars().first()

        cleaned = str(team_identifier or "").strip()
        if not cleaned:
            return None

        # 1. Exact UUID match
        try:
            parsed_uuid = uuid.UUID(cleaned)
            res = await self.session.execute(q.where(Team.id == parsed_uuid))
            team = res.scalars().first()
            if team:
                return team
        except (ValueError, TypeError):
            pass

        # 2. Exact team_id match
        res = await self.session.execute(q.where(func.lower(Team.team_id) == cleaned.lower()))
        team = res.scalars().first()
        if team:
            return team

        # 3. Exact team_no match
        res = await self.session.execute(q.where(func.lower(Team.team_no) == cleaned.lower()))
        team = res.scalars().first()
        if team:
            return team

        # 4. Fallback digits match ONLY if cleaned input is numeric digits
        if cleaned.isdigit():
            num = int(cleaned)
            res = await self.session.execute(
                q.where(
                    or_(
                        Team.team_no == f"Team {num:02d}",
                        Team.team_no == f"Team {num}",
                    )
                )
            )
            team = res.scalars().first()
            if team:
                return team

        return None

    async def get_with_members_and_submissions(self, team_identifier: uuid.UUID | str) -> Optional[Team]:
        q = select(Team).options(
            selectinload(Team.members),
            selectinload(Team.submissions),
        )
        if isinstance(team_identifier, uuid.UUID):
            res = await self.session.execute(q.where(Team.id == team_identifier))
            return res.scalars().first()

        cleaned = str(team_identifier or "").strip()
        if not cleaned:
            return None

        # 1. Exact UUID match
        try:
            parsed_uuid = uuid.UUID(cleaned)
            res = await self.session.execute(q.where(Team.id == parsed_uuid))
            team = res.scalars().first()
            if team:
                return team
        except (ValueError, TypeError):
            pass

        # 2. Exact team_id match
        res = await self.session.execute(q.where(func.lower(Team.team_id) == cleaned.lower()))
        team = res.scalars().first()
        if team:
            return team

        # 3. Exact team_no match
        res = await self.session.execute(q.where(func.lower(Team.team_no) == cleaned.lower()))
        team = res.scalars().first()
        if team:
            return team

        # 4. Fallback digits match ONLY if cleaned input is numeric digits
        if cleaned.isdigit():
            num = int(cleaned)
            res = await self.session.execute(
                q.where(
                    or_(
                        Team.team_no == f"Team {num:02d}",
                        Team.team_no == f"Team {num}",
                    )
                )
            )
            team = res.scalars().first()
            if team:
                return team

        return None

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
            conditions.append(func.lower(Team.guide_email) == guide_email.strip().lower())
        if guide_name:
            clean_name = guide_name.strip()
            for prefix in ["Dr.", "dr.", "Prof.", "prof.", "Mr.", "mr.", "Mrs.", "mrs.", "Ms.", "ms."]:
                if clean_name.startswith(prefix):
                    clean_name = clean_name[len(prefix):].strip()
            conditions.append(func.lower(Team.guide_name) == guide_name.strip().lower())
            if clean_name != guide_name.strip():
                conditions.append(func.lower(Team.guide_name) == clean_name.lower())
                conditions.append(func.lower(Team.guide_name) == f"dr. {clean_name.lower()}")
                conditions.append(func.lower(Team.guide_name) == f"prof. {clean_name.lower()}")
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

    async def list_all_with_members_only(self) -> List[Team]:
        """Lightweight variant of list_all that only eagerly loads members (not submissions).
        Use this for endpoints like marks/all that never need submission data."""
        q = select(Team).options(
            selectinload(Team.members),
        ).order_by(Team.team_no)
        res = await self.session.execute(q)
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
