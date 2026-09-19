"""
Authentication utilities — JWT via PyJWT, password hashing via bcrypt.
"""
from datetime import datetime, timezone, timedelta
import uuid as _uuid

import jwt
import bcrypt
from fastapi import Depends, HTTPException
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
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── JWT helpers ────────────────────────────────────────────────
def create_access_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "role": role, "exp": exp},
                      settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


# ── dependency: current user from JWT ──────────────────────────
async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not creds:
        # Dev convenience: return first student when no token
        r = await db.execute(select(User).where(User.role == "student").limit(1))
        u = r.scalar_one_or_none()
        if u:
            return u
        raise HTTPException(401, "Not authenticated")

    payload = _decode(creds.credentials)
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(401, "Bad token")

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
        raise HTTPException(401, "User not found")
    return user


# ── authenticate by email/roll + password ──────────────────────
async def authenticate_user(db: AsyncSession, login: str, password: str):
    term = (login or "").strip().lower()
    r = await db.execute(
        select(User).where(or_(User.email.ilike(term), User.roll_no.ilike(term)))
    )
    user = r.scalar_one_or_none()
    if not user or not user.password:
        return None
    stored = user.password
    if stored.startswith("$2"):          # bcrypt hash
        if not verify_password(password, stored):
            return None
    else:                                # plaintext seed password
        if password != stored:
            return None
    return user
