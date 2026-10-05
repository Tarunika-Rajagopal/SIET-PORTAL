"""
Authentication utilities — JWT via PyJWT, password hashing via bcrypt, and RBAC authorization.
"""
from datetime import datetime, timezone, timedelta
import time
import uuid as _uuid

import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from starlette.concurrency import run_in_threadpool

from database import get_db
from config import get_settings
from models import User

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)

# Cost factor for NEW hashes. Existing hashes keep the cost they were created
# with (bcrypt stores it inside the hash), so old users are unaffected.
BCRYPT_ROUNDS = 10


# ── password helpers ───────────────────────────────────────────
def hash_password(password: str) -> str:
    """Hash plain password using bcrypt (blocking — use hash_password_async in async routes)."""
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    ).decode("utf-8")


def _is_bcrypt_hash(value: str) -> bool:
    """Return True if the stored value looks like a bcrypt hash."""
    return value.startswith(("$2a$", "$2b$", "$2y$"))


def verify_password(plain: str, stored: str) -> bool:
    """Verify plain password against a stored credential.

    Supports two formats:
    1. bcrypt hash (starts with $2a$/$2b$/$2y$) → bcrypt.checkpw
    2. Legacy plaintext (older seeded users)     → constant-time comparison
    """
    if not plain or not stored:
        return False
    try:
        if _is_bcrypt_hash(stored):
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        # Legacy plaintext comparison (constant-time to avoid timing attacks)
        import hmac
        return hmac.compare_digest(plain, stored)
    except Exception:
        return False


async def hash_password_async(password: str) -> str:
    """Run bcrypt hashing in a worker thread so the event loop is not blocked."""
    return await run_in_threadpool(hash_password, password)


async def verify_password_async(plain: str, stored: str) -> bool:
    """Run password verification in a worker thread so the event loop is not blocked."""
    return await run_in_threadpool(verify_password, plain, stored)


async def rehash_if_needed(user, db) -> None:
    """If user's password is stored as plaintext, rehash it to bcrypt (progressive migration)."""
    if user.password and not _is_bcrypt_hash(user.password):
        user.password = await hash_password_async(user.password)
        db.add(user)
        await db.commit()


# ── JWT helpers ────────────────────────────────────────────────
def create_access_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
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
    except jwt.PyJWTError:
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


# ── small in-memory user cache (per process) ───────────────────
_USER_SESSION_CACHE: dict = {}
_CACHE_TTL_SECONDS = 60.0
_CACHE_MAX_ENTRIES = 1000


def _cache_get(uid: str):
    entry = _USER_SESSION_CACHE.get(uid)
    if entry and entry[1] > time.time():
        return entry[0]
    if entry:
        _USER_SESSION_CACHE.pop(uid, None)
    return None


def _cache_set(uid: str, user: User) -> None:
    # Keep the cache bounded so it cannot grow forever.
    if len(_USER_SESSION_CACHE) >= _CACHE_MAX_ENTRIES:
        now = time.time()
        for key in [k for k, v in _USER_SESSION_CACHE.items() if v[1] <= now]:
            _USER_SESSION_CACHE.pop(key, None)
        if len(_USER_SESSION_CACHE) >= _CACHE_MAX_ENTRIES:
            _USER_SESSION_CACHE.pop(next(iter(_USER_SESSION_CACHE)), None)
    _USER_SESSION_CACHE[uid] = (user, time.time() + _CACHE_TTL_SECONDS)


def invalidate_user_cache(uid: str | None = None) -> None:
    """Call after changing a user's role/password/status so changes apply immediately."""
    if uid is None:
        _USER_SESSION_CACHE.clear()
    else:
        _USER_SESSION_CACHE.pop(str(uid), None)


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

    cached = _cache_get(uid)
    if cached is not None:
        return cached

    user = None

    # Try as UUID first (parse separately so DB errors are not swallowed)
    try:
        parsed_uid = _uuid.UUID(uid)
    except (ValueError, AttributeError, TypeError):
        parsed_uid = None

    if parsed_uid is not None:
        user = (
            await db.execute(select(User).where(User.id == parsed_uid))
        ).scalar_one_or_none()

    # Fallback to email / roll_no (legacy tokens)
    if not user:
        user = (
            await db.execute(
                select(User).where(or_(User.email == uid, User.roll_no == uid))
            )
        ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _cache_set(uid, user)
    return user


# ── dependency: RBAC role authorization ────────────────────────
def require_roles(*allowed_roles: str):
    """
    Dependency factory to enforce Role-Based Access Control.
    Raises HTTP 403 Forbidden if user lacks permitted role.
    """
    allowed = set(r.strip().lower() for r in allowed_roles)

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = set()
        user_role = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role or "")).strip().lower()
        active_role = (current_user.active_role.value if hasattr(current_user.active_role, "value") else str(current_user.active_role or "")).strip().lower()

        if user_role:
            user_roles.add(user_role)
            if "&" in user_role:
                for part in user_role.split("&"):
                    user_roles.add(part.strip())
        if active_role:
            user_roles.add(active_role)
            if "&" in active_role:
                for part in active_role.split("&"):
                    user_roles.add(part.strip())

        # Also inspect Faculty table for dual role assignment
        if current_user.email and not ({"guide", "advisor"}.issubset(user_roles)):
            from models import Faculty
            from database import async_session
            try:
                async with async_session() as s:
                    res_f = await s.execute(select(Faculty).where(Faculty.email == current_user.email))
                    fac = res_f.scalars().first()
                    if fac and fac.role:
                        fac_role = (fac.role.value if hasattr(fac.role, "value") else str(fac.role)).strip().lower()
                        user_roles.add(fac_role)
                        if "&" in fac_role:
                            for part in fac_role.split("&"):
                                user_roles.add(part.strip())
            except Exception:
                pass

        if any(r in allowed for r in user_roles):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Insufficient privileges. Required role: {', '.join(allowed_roles)}",
        )
    return role_checker


# ── authenticate by email/roll + password ──────────────────────
async def authenticate_user(db: AsyncSession, login: str, password: str):
    term = (login or "").strip().lower()
    if not term or not password:
        return None

    # Case-insensitive match that can use the functional indexes
    # ix_users_email_lower / ix_users_roll_no_lower (see SQL below).
    r = await db.execute(
        select(User).where(
            or_(func.lower(User.email) == term, func.lower(User.roll_no) == term)
        )
    )
    user = r.scalar_one_or_none()
    if not user or not user.password:
        return None

    # bcrypt is CPU-heavy: run it in a worker thread so other requests
    # (advisors, filter-options, ...) are not blocked while it runs.
    if not await verify_password_async(password, user.password):
        return None

    return user


# ── SQL to run once on your database ───────────────────────────
# CREATE INDEX IF NOT EXISTS ix_users_email_lower   ON users (lower(email));
# CREATE INDEX IF NOT EXISTS ix_users_roll_no_lower ON users (lower(roll_no));