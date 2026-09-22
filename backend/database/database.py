import os
import ssl as _ssl
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

try:
    from config import get_settings
except ImportError:
    from backend.config import get_settings

settings = get_settings()

db_status = {"connected": False, "error": None}

from pathlib import Path
from uuid import uuid4

from sqlalchemy import pool
from sqlalchemy.pool import NullPool

def _is_sqlite() -> bool:
    return (
        os.getenv("USE_SQLITE", "").lower() in ("true", "1")
        or settings.DATABASE_URL.startswith("sqlite")
        or not settings.DATABASE_URL
    )


def _create_engine():
    if _is_sqlite():
        sqlite_path = Path(__file__).resolve().parent.parent / "tests" / "siet_portal.db"
        db_url = f"sqlite+aiosqlite:///{sqlite_path.as_posix()}"
        return create_async_engine(db_url, echo=False)

    return create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "ssl": "require",
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
            "command_timeout": 30,
        },
    )


engine = _create_engine()

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def check_db_connection() -> bool:
    """Verify and update database connection state."""
    global db_status, engine
    try:
        async with asyncio.timeout(20.0):
            async with engine.begin() as conn:
                from sqlalchemy import text
                await conn.execute(text("SELECT 1"))
        db_status["connected"] = True
        db_status["error"] = None
        return True
    except TimeoutError:
        db_status["connected"] = False
        db_status["error"] = "TimeoutError: Connection timed out after 20s (remote Supabase latency or cold start)"
        return False
    except Exception as exc:
        db_status["connected"] = False
        err_msg = str(exc).strip()
        db_status["error"] = err_msg if err_msg else repr(exc)
        return False


async def init_db():
    """Initialize database connection with retry for Supabase cold starts.
    Production PostgreSQL/Supabase schema is managed via Alembic migrations.
    """
    global db_status, engine, async_session
    max_retries = 5

    if _is_sqlite():
        if not str(engine.url).startswith("sqlite"):
            engine = _create_engine()
            async_session.configure(bind=engine)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        db_status["connected"] = True
        db_status["error"] = None
        return

    for attempt in range(1, max_retries + 1):
        if await check_db_connection():
            print(f"[DB] Connected to PostgreSQL (Supabase) successfully (attempt {attempt}).")
            return
        else:
            print(f"[DB] Connection attempt {attempt}/{max_retries} failed: {db_status['error']}")
            if attempt < max_retries:
                await asyncio.sleep(min(attempt * 2, 5))

    print("[DB] All initial connection attempts exhausted. Retries will continue on demand via /health.")

