import os
import ssl as _ssl

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from config import get_settings

settings = get_settings()

db_status = {"connected": False, "error": None}

use_sqlite = (
    os.getenv("USE_SQLITE", "").lower() in ("true", "1")
    or settings.DATABASE_URL.startswith("sqlite")
    or not settings.DATABASE_URL
)

from pathlib import Path

if use_sqlite:
    if settings.DATABASE_URL.startswith("sqlite"):
        sqlite_url = settings.DATABASE_URL
    else:
        test_dir = Path(__file__).resolve().parent.parent / "tests"
        test_dir.mkdir(parents=True, exist_ok=True)
        db_file = test_dir / "siet_portal.db"
        sqlite_url = f"sqlite+aiosqlite:///{db_file.as_posix()}"
    engine = create_async_engine(
        sqlite_url,
        echo=False,
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={
            "ssl": "require",
            "statement_cache_size": 0,
        },
    )

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
    """Initialize database connection and verify status.
    Production PostgreSQL/Supabase schema is managed via Alembic migrations.
    SQLite offline test environments retain create_all for automated test isolation.
    """
    global db_status

    try:
        async with engine.begin() as conn:
            if use_sqlite:
                await conn.run_sync(Base.metadata.create_all)
            else:
                from sqlalchemy import text
                await conn.execute(text("SELECT 1"))

        db_status["connected"] = True
        db_type = "SQLite" if use_sqlite else "PostgreSQL"
        print(f"[DB] Connected to {db_type} successfully.")

    except Exception as exc:
        db_status["error"] = str(exc)
        print(f"[DB] Failed to connect to database: {exc}")
        raise