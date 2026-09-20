"""
Authentication utilities — JWT via PyJWT, password hashing via bcrypt, and RBAC authorization.
"""
from datetime import datetime, timezone, timedelta
import uuid as _uuid

import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from config import get_settings
from models import User

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)


# ── password helpers ───────────────────────────────────────────
def hash_password(password: str) -> str:
    """Hash plain password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against bcrypt hash. Returns False for invalid/plaintext hashes."""
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT helpers ────────────────────────────────────────────────
def create_access_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": exp,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, jwt.PyJWTError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── dependency: current user from JWT ──────────────────────────
async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode(creds.credentials)
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = None
    # Try as UUID first
    try:
        user = (await db.execute(select(User).where(User.id == _uuid.UUID(uid)))).scalar_one_or_none()
    except Exception:
        pass

    # Fallback to email / roll_no
    if not user:
        user = (await db.execute(
            select(User).where(or_(User.email == uid, User.roll_no == uid))
        )).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ── dependency: RBAC role authorization ────────────────────────
def require_roles(*allowed_roles: str):
    """
    Dependency factory to enforce Role-Based Access Control.
    Raises HTTP 403 Forbidden if user lacks permitted role.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").strip().lower()
        active_role = (current_user.active_role or "").strip().lower()
        allowed = [r.strip().lower() for r in allowed_roles]

        if user_role in allowed or (active_role and active_role in allowed):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Insufficient privileges. Required role: {', '.join(allowed_roles)}",
        )
    return role_checker


# ── authenticate by email/roll + password ──────────────────────
async def authenticate_user(db: AsyncSession, login: str, password: str):
    term = (login or "").strip().lower()
    r = await db.execute(
        select(User).where(or_(User.email.ilike(term), User.roll_no.ilike(term)))
    )
    user = r.scalar_one_or_none()
    if not user or not user.password:
        return None

    # Enforce strict bcrypt verification — no plaintext fallback
    if not verify_password(password, user.password):
        return None

    return user
