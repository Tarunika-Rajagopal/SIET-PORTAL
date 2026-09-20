import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import settings
from database.database import Base
import database.models  # Ensures all 18 models are loaded into Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """Resolve database connection URL dynamically from alembic config, environment, or settings."""
    ini_url = config.get_main_option("sqlalchemy.url")
    if ini_url and ini_url.strip():
        url = ini_url.strip()
    else:
        env_url = os.getenv("DATABASE_URL")
        if env_url and env_url.strip():
            url = env_url.strip()
        else:
            url = settings.DATABASE_URL

    use_sqlite = (
        os.getenv("USE_SQLITE", "").lower() in ("true", "1")
        or url.startswith("sqlite")
        or not url
    )
    if use_sqlite:
        if url and url.startswith("sqlite"):
            return url
        test_dir = backend_dir / "tests"
        test_dir.mkdir(parents=True, exist_ok=True)
        db_file = test_dir / "siet_portal.db"
        return f"sqlite+aiosqlite:///{db_file.as_posix()}"

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    url = get_url()
    connect_args = {}
    if not url.startswith("sqlite"):
        connect_args = {
            "ssl": "require",
            "statement_cache_size": 0,
        }

    connectable = create_async_engine(
        url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

