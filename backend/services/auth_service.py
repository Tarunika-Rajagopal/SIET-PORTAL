"""Authentication service handling user login, credential verification, and token issuance."""
from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models import User
from schemas import LoginRequest, LoginResponse
from repositories.user_repository import UserRepository
from auth import verify_password, create_access_token


def format_user_dict(u: User) -> Dict[str, Any]:
    initials = "".join(p[0] for p in (u.name or "").replace(".", " ").split() if p)[:2].upper() or "XX"
    return {
        "id": str(u.id),
        "email": u.email,
        "name": u.name,
        "rollNo": u.roll_no,
        "department": u.department,
        "role": u.role,
        "designation": u.designation,
        "phone": u.phone,
        "year": u.year,
        "batch": u.batch,
        "class": u.class_name,
        "section": u.section,
        "yearSemester": u.year_semester,
        "advisorClass": u.advisor_class,
        "advisorBatch": u.advisor_batch,
        "teamId": u.team_id,
        "teamNo": u.team_no,
        "projectTitle": u.project_title,
        "guideName": u.guide_name,
        "advisorName": u.advisor_name,
        "initials": initials,
    }


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def authenticate(self, login_term: str, password: str) -> Optional[User]:
        term = (login_term or "").strip()
        if not term:
            return None
        user = await self.user_repo.get_by_login(term)
        if not user or not user.password:
            return None
        if not verify_password(password, user.password):
            return None
        return user

    async def login(self, req: LoginRequest) -> LoginResponse:
        user = await self.authenticate(req.emailOrRoll, req.password)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials. Please verify your email/roll and password.",
            )
        token = create_access_token(str(user.id), user.role)
        return LoginResponse(success=True, token=token, user=format_user_dict(user))
