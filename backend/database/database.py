import os
import ssl as _ssl

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

try:
    from config import get_settings
except ImportError:
    from backend.config import get_settings

settings = get_settings()

db_status = {"connected": False, "error": None}

from pathlib import Path

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

            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))

        db_status["connected"] = True
        db_type = "PostgreSQL"
        print(f"[DB] Connected to {db_type} successfully.")

    except Exception as exc:
        db_status["error"] = str(exc)
        print(f"[DB] Failed to connect to database: {exc}")
        raise