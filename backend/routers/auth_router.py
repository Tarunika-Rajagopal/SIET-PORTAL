"""POST /api/v1/auth/login"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import authenticate_user, create_access_token
from schemas import LoginRequest, LoginResponse
from models import User

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _user_dict(u: User) -> dict:
    initials = "".join(p[0] for p in u.name.replace(".", " ").split() if p)[:2].upper() or "XX"
    return {
        "id": str(u.id), "email": u.email, "name": u.name,
        "rollNo": u.roll_no, "department": u.department, "role": u.role,
        "designation": u.designation, "phone": u.phone,
        "year": u.year, "batch": u.batch,
        "class": u.class_name, "section": u.section,
        "yearSemester": u.year_semester,
        "advisorClass": u.advisor_class, "advisorBatch": u.advisor_batch,
        "teamId": u.team_id, "teamNo": u.team_no,
        "projectTitle": u.project_title,
        "guideName": u.guide_name, "advisorName": u.advisor_name,
        "initials": initials,
    }


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, req.emailOrRoll, req.password)
    if not user:
        raise HTTPException(401, "Invalid credentials. Please verify your email/roll and password.")
    token = create_access_token(str(user.id), user.role)
    return LoginResponse(success=True, token=token, user=_user_dict(user))
