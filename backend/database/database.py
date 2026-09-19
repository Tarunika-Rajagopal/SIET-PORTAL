import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import get_settings

settings = get_settings()

# Build async database URL
_raw = settings.DATABASE_URL
if _raw.startswith("postgresql://"):
    _db_url = _raw.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _raw.startswith("postgres://"):
    _db_url = _raw.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw.startswith("sqlite"):
    _db_url = _raw if "+aiosqlite" in _raw else _raw.replace("sqlite://", "sqlite+aiosqlite://", 1)
else:
    _db_url = _raw

SQLITE_FALLBACK = "sqlite+aiosqlite:///./siet_portal.db"

db_status = {"connected": False, "error": None}

try:
    engine = create_async_engine(_db_url, echo=False, pool_pre_ping=True)
except Exception:
    engine = create_async_engine(SQLITE_FALLBACK, echo=False)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables. Falls back to SQLite if remote DB is unreachable."""
    global engine, async_session
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        db_status["connected"] = True
    except Exception as exc:
        print(f"[DB] Remote failed ({exc}), falling back to SQLite")
        engine = create_async_engine(SQLITE_FALLBACK, echo=False)
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        db_status["connected"] = True
