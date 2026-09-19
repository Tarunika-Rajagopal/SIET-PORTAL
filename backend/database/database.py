import ssl as _ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import get_settings

settings = get_settings()

db_status = {"connected": False, "error": None}

# Build async database URL for Supabase PostgreSQL
_raw = settings.DATABASE_URL
if _raw.startswith("postgresql://"):
    _db_url = _raw.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _raw.startswith("postgres://"):
    _db_url = _raw.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    _db_url = _raw

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": _ssl.create_default_context()},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables on Supabase PostgreSQL."""
    global db_status
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        db_status["connected"] = True
        print("[DB] Connected to Supabase PostgreSQL successfully.")
    except Exception as exc:
        db_status["error"] = str(exc)
        print(f"[DB] Failed to connect to Supabase: {exc}")
        raise
