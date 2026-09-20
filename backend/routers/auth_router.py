"""POST /api/v1/auth/login"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas import LoginRequest, LoginResponse
from services.auth_service import AuthService, format_user_dict as _user_dict

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, service: AuthService = Depends(get_auth_service)):
    return await service.login(req)
