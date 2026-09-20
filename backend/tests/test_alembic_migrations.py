"""Automated verification test for Alembic migration lifecycle on a disposable database."""
import os
import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine, inspect

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from alembic.config import Config
from alembic import command
from database.database import Base
import database.models


def test_alembic_metadata_loading():
    """Verify all 18 tables are registered in Base.metadata."""
    expected_tables = {
        "users", "faculty", "students", "teams", "team_members",
        "weekly_submissions", "guide_notices", "review_scores",
        "rubric_criteria", "title_approvals", "announcements",
        "audit_logs", "advisor_history", "hod_history",
        "weekly_marks", "weekly_member_marks", "checklists", "settings",
    }
    actual_tables = set(Base.metadata.tables.keys())
    missing = expected_tables - actual_tables
    assert not missing, f"Missing tables in Base.metadata: {missing}"
    assert len(actual_tables) == 18


def test_alembic_upgrade_downgrade_cycle(tmp_path):
    """Test upgrade head and downgrade base on an isolated temporary SQLite database."""
    temp_db = tmp_path / "alembic_test.db"
    temp_url = f"sqlite:///{temp_db.as_posix()}"
    async_temp_url = f"sqlite+aiosqlite:///{temp_db.as_posix()}"

    # Set up Alembic Config
    ini_path = backend_dir / "alembic.ini"
    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    # Pass temporary URL via environment
    os.environ["DATABASE_URL"] = async_temp_url
    os.environ["USE_SQLITE"] = "true"

    try:
        # 1. Run upgrade head
        command.upgrade(alembic_cfg, "head")

        # Verify tables were created in the database
        sync_engine = create_engine(temp_url)
        inspector = inspect(sync_engine)
        tables = inspector.get_table_names()
        assert "alembic_version" in tables
        assert "users" in tables
        assert "teams" in tables
        assert "weekly_submissions" in tables
        assert len(tables) >= 19  # 18 app tables + alembic_version

        # 2. Run downgrade base
        command.downgrade(alembic_cfg, "base")
        inspector_post_down = inspect(sync_engine)
        tables_post_down = [t for t in inspector_post_down.get_table_names() if t != "alembic_version"]
        assert len(tables_post_down) == 0, f"Expected 0 tables after downgrade, found: {tables_post_down}"

        # 3. Run upgrade head again
        command.upgrade(alembic_cfg, "head")
        inspector_post_reup = inspect(sync_engine)
        tables_post_reup = inspector_post_reup.get_table_names()
        assert "users" in tables_post_reup
        assert "teams" in tables_post_reup

    finally:
        # Reset environment
        os.environ.pop("DATABASE_URL", None)
