import os
import time
import asyncio
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

try:
    from config import get_settings
except ImportError:
    from backend.config import get_settings

settings = get_settings()

db_status = {"connected": False, "error": None}


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
        max_overflow=10,
        pool_timeout=30,
        # Check a connection is alive before using it. Without this, a connection
        # silently dropped by Supavisor/Supabase causes a failed or very slow request.
        pool_pre_ping=True,
        # Because of pre_ping, we no longer need to recycle every 3 minutes.
        # Each recycle forces a new TCP + TLS + auth handshake, which is slow
        # when the DB is in another region.
        pool_recycle=1800,
        # Reuse the most recently used connection so fewer connections stay
        # hot and idle ones can expire cleanly.
        pool_use_lifo=True,
        connect_args={
            "ssl": "require",
            "timeout": 15,  # fail fast when connecting (asyncpg default is 60 s)
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
            "command_timeout": 30,
            "server_settings": {
                "application_name": "siet_portal_backend",
                "tcp_keepalives_idle": "30",
                "tcp_keepalives_interval": "10",
                "tcp_keepalives_count": "5",
            },
        },
    )


engine = _create_engine()

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        except (OSError, ConnectionResetError):
            await session.rollback()
            raise


async def check_db_connection() -> bool:
    """Verify and update database connection state."""
    global db_status, engine
    try:
        async with asyncio.timeout(20.0):
            async with engine.begin() as conn:
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


async def warm_pool(n: int = 3) -> None:
    """Open a few connections at startup so the first user requests don't pay
    the TCP + TLS + auth handshake cost."""
    if _is_sqlite():
        return

    async def _ping():
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

    try:
        async with asyncio.timeout(30.0):
            await asyncio.gather(*[_ping() for _ in range(n)])
        print(f"[DB] Pool warmed with {n} connections.", flush=True)
    except Exception as exc:
        print(f"[DB] Pool warm-up skipped: {exc!r}", flush=True)


async def measure_db_latency() -> dict:
    """Diagnostic: shows where DB time goes.

    - checkout_ms      : getting a connection (large = new handshake / cross-region)
    - first_query_ms   : first query on that connection
    - second_query_ms  : ~ ONE network round trip to the DB (the number that matters)
    """
    t0 = time.perf_counter()
    async with engine.connect() as conn:
        t1 = time.perf_counter()
        await conn.execute(text("SELECT 1"))
        t2 = time.perf_counter()
        await conn.execute(text("SELECT 1"))
        t3 = time.perf_counter()
    return {
        "checkout_ms": round((t1 - t0) * 1000),
        "first_query_ms": round((t2 - t1) * 1000),
        "second_query_ms": round((t3 - t2) * 1000),
    }


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
            await warm_pool()
            return
        else:
            print(f"[DB] Connection attempt {attempt}/{max_retries} failed: {db_status['error']}")
            if attempt < max_retries:
                await asyncio.sleep(min(attempt * 2, 5))

    print("[DB] All initial connection attempts exhausted. Retries will continue on demand via /health.")