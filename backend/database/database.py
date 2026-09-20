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

engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=False,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        pool_timeout=10,
        connect_args={
            "ssl": "require",
            "statement_cache_size": 0,
            "command_timeout": 10,
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
    """Initialize database connection with retry for Supabase cold starts.
    Production PostgreSQL/Supabase schema is managed via Alembic migrations.
    """
    global db_status
    max_retries = 3

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
