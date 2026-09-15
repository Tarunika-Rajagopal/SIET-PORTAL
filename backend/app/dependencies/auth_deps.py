from typing import Tuple, List, Callable
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_deps import get_db_session
from app.repositories.user_repository import UserRepository
from app.core.security import decode_access_token
from app.exceptions.custom import UnauthorizedException, ForbiddenException
from app.models.users import User

security = HTTPBearer(auto_error=False)

async def get_current_user_and_role(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session)
) -> Tuple[User, str]:
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication token missing")

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException("Invalid or expired authentication token")

    user_id_str = payload.get("sub")
    active_role = payload.get("activeRole")

    if not user_id_str or not active_role:
        raise UnauthorizedException("Malformed authentication token claims")

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid user identity in token")

    repo = UserRepository(db)
    user = await repo.get_user_by_id(user_id)

    if not user or not user.is_active:
        raise UnauthorizedException("User account not found or inactive")

    assigned_roles = [r.name.lower() for r in user.roles]
    if active_role.lower() not in assigned_roles:
        raise ForbiddenException(f"Active role '{active_role}' is no longer assigned to user")

    return user, active_role

async def get_current_user(
    user_and_role: Tuple[User, str] = Depends(get_current_user_and_role)
) -> User:
    return user_and_role[0]

def require_role(required_role: str) -> Callable:
    async def dependency(user_and_role: Tuple[User, str] = Depends(get_current_user_and_role)) -> User:
        user, active_role = user_and_role
        if active_role.lower() != required_role.lower():
            raise ForbiddenException(f"Access denied. Active role must be '{required_role}'.")
        return user
    return dependency

def require_any_role(allowed_roles: List[str]) -> Callable:
    allowed_set = {r.lower() for r in allowed_roles}
    async def dependency(user_and_role: Tuple[User, str] = Depends(get_current_user_and_role)) -> User:
        user, active_role = user_and_role
        if active_role.lower() not in allowed_set:
            raise ForbiddenException(f"Access denied. Requires one of roles: {allowed_roles}")
        return user
    return dependency
