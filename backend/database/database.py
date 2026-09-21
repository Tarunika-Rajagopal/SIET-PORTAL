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
        poolclass=NullPool,
        connect_args={
            "ssl": "require",
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
            "command_timeout": 10,
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


async def init_db():
    """Initialize database connection with retry for Supabase cold starts.
    Production PostgreSQL/Supabase schema is managed via Alembic migrations.
    """
    global db_status, engine, async_session
    max_retries = 3

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
        try:
            async with asyncio.timeout(15.0):
                async with engine.begin() as conn:
                    from sqlalchemy import text
                    await conn.execute(text("SELECT 1"))

            db_status["connected"] = True
            db_status["error"] = None
            print(f"[DB] Connected to PostgreSQL (Supabase) successfully (attempt {attempt}).")
            return

        except Exception as exc:
            db_status["error"] = str(exc)
            print(f"[DB] Connection attempt {attempt}/{max_retries} failed: {exc}")
            if attempt < max_retries:
                await asyncio.sleep(2)

    print("[DB] All connection attempts exhausted. DB-dependent endpoints will fail.")

