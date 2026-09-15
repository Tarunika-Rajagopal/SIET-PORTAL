from typing import List, Tuple
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.dependencies.auth_deps import get_current_user_and_role, require_role
from app.services.auth_service import AuthService
from app.schemas.auth import LoginRequest, LoginResponse, SwitchRoleRequest, SwitchRoleResponse, UserResponse
from app.repositories.user_repository import UserRepository
from app.models.users import User

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db_session)
):
    service = AuthService(db)
    return await service.login(req)

@router.post("/switch-role", response_model=SwitchRoleResponse)
async def switch_role(
    req: SwitchRoleRequest,
    user_and_role: Tuple[User, str] = Depends(get_current_user_and_role),
    db: AsyncSession = Depends(get_db_session)
):
    user, active_role = user_and_role
    service = AuthService(db)
    return await service.switch_role(user, req)

@router.get("/me", response_model=UserResponse)
async def get_me(
    user_and_role: Tuple[User, str] = Depends(get_current_user_and_role),
    db: AsyncSession = Depends(get_db_session)
):
    user, active_role = user_and_role
    service = AuthService(db)
    return service.get_me(user, active_role)

@router.post("/session")
async def session_check(
    user_and_role: Tuple[User, str] = Depends(get_current_user_and_role),
    db: AsyncSession = Depends(get_db_session)
):
    user, active_role = user_and_role
    service = AuthService(db)
    return {
        "active": True,
        "user": service.get_me(user, active_role)
    }

@router.post("/logout")
async def logout(
    user_and_role: Tuple[User, str] = Depends(get_current_user_and_role)
):
    return {"success": True, "message": "Logged out successfully"}

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db_session)
):
    repo = UserRepository(db)
    service = AuthService(db)
    users = await repo.get_all_users()
    return [service._build_user_response(u, u.roles[0].name if u.roles else "student") for u in users]
