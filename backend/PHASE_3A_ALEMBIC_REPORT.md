# Phase 3A: Alembic Database Migration Baseline Report

**Execution Date:** September 20, 2026  
**Status:** Complete & Verified  
**Scope:** Phase 3A Database Migration Baseline (Alembic) Only  

---

## 1. Summary

Phase 3A introduces **Alembic** as the authoritative, version-controlled database schema migration system for the SIET-PORTAL backend. 

All primary objectives of Phase 3A were accomplished:
1. Added Alembic to backend dependencies without modifying existing library versions.
2. Initialized an async-capable Alembic environment (`alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/`).
3. Wired `Base.metadata` to guarantee all 18 SQLAlchemy ORM models are registered.
4. Dynamically bound database connection resolution to `config.settings.DATABASE_URL` (supporting asyncpg for PostgreSQL and aiosqlite for SQLite).
5. Generated and manually inspected the initial schema baseline migration (`d8e5093d3ebc_initial_schema_baseline.py`).
6. Tested complete upgrade/downgrade cycles on disposable test environments.
7. Established a non-destructive baseline strategy (`alembic stamp head`) for existing production Supabase databases.
8. Safely transitioned `init_db()` away from production `Base.metadata.create_all()` while preserving SQLite offline testing capability.
9. Verified zero regressions against all Phase 2 security and RBAC test suites.

---

## 2. Files Created and Modified

### Files Created
- [`backend/alembic.ini`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/alembic.ini): Alembic configuration file with dynamic URL resolution (no hardcoded credentials).
- [`backend/alembic/env.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/alembic/env.py): Async migration runner wired to `config.settings` and `database.database.Base.metadata`.
- [`backend/alembic/script.py.mako`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/alembic/script.py.mako): Revision template for async migrations.
- [`backend/alembic/versions/d8e5093d3ebc_initial_schema_baseline.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/alembic/versions/d8e5093d3ebc_initial_schema_baseline.py): Initial baseline migration representing all 18 tables.
- [`backend/tests/test_alembic_migrations.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/tests/test_alembic_migrations.py): Automated test suite for metadata loading and migration upgrade/downgrade lifecycle.
- [`backend/PHASE_3A_ALEMBIC_REPORT.md`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/PHASE_3A_ALEMBIC_REPORT.md): This report.

### Files Modified
- [`backend/requirements.txt`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/requirements.txt): Added `alembic==1.13.3`.
- [`backend/database/database.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/database/database.py): Updated `init_db()` so production verifies connectivity via `SELECT 1` (leaving schema management to Alembic), while SQLite test mode retains `create_all`.

---

## 3. Alembic Architecture

The project's database management flow is now structured as follows:

```text
                     SQLAlchemy ORM Models
                     (backend/database/models.py)
                               │
                               ▼
                         Base.metadata
                      (All 18 ORM entities)
                               │
                               ▼
                            ALEMBIC
                       (backend/alembic/)
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        Migration History              Future Revisions
    (d8e5093d3ebc_initial...)     (alembic revision --autogenerate)
                │                             │
                └──────────────┬──────────────┘
                               │
                               ▼
                     Database Target
              ├─ Production: PostgreSQL / Supabase
              └─ Test: SQLite / aiosqlite (isolated)
```

### Dynamic Connection Management in `env.py`
To strictly uphold Phase 2 secrets hygiene, `alembic.ini` contains an empty `sqlalchemy.url = `. In [`backend/alembic/env.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/alembic/env.py), the connection URL is resolved hierarchically at runtime:
1. Direct override via `config.get_main_option("sqlalchemy.url")` (e.g. from test harnesses).
2. Environment override via `os.getenv("DATABASE_URL")`.
3. Application setting via `config.settings.DATABASE_URL`.
4. Fallback to SQLite path if `USE_SQLITE="true"`.

When connecting to PostgreSQL, `postgresql+asyncpg://` is enforced and SSL options (`{"ssl": "require", "statement_cache_size": 0}`) are automatically configured.

---

## 4. Migration Baseline & Existing Database Strategy

### Revision Details
- **Revision ID:** `d8e5093d3ebc`
- **Revises:** `None` (Base)
- **Title:** `initial_schema_baseline`
- **Total Tables:** 18

### Existing Supabase Database Handling
The existing Supabase / PostgreSQL database already contains live project tables and data.
Executing `alembic upgrade head` on an existing database would attempt to run `CREATE TABLE` on tables that already exist, causing failures.

**The Canonical Baseline Strategy:**
1. **Existing Production Database (Supabase):**
   Execute:
   ```bash
   alembic stamp head
   ```
   This safely creates the `alembic_version` table (if missing) and records `d8e5093d3ebc` as the current migration state **without modifying any existing tables or touching data**.
2. **Fresh Environments (New Developers / Staging / CI/CD):**
   Execute:
   ```bash
   alembic upgrade head
   ```
   This executes the complete migration, creating all 18 tables, constraints, foreign keys, and indexes in proper topological order.

---

## 5. Production Database Safety

- **Production Data Modified:** **NO.**
- **Production Tables Dropped/Truncated:** **NO.**
- **Supabase Reset:** **NO.**
- All destructive operations (such as testing `alembic downgrade base`) were executed strictly inside temporary, isolated SQLite databases via automated tests.

---

## 6. Migration Inspection

The generated migration [`d8e5093d3ebc_initial_schema_baseline.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/alembic/versions/d8e5093d3ebc_initial_schema_baseline.py) was manually audited line by line:

### Tables Represented (18 total)
1. `advisor_history` (Primary Key: `id`, 11 columns)
2. `announcements` (Primary Key: `id`, 7 columns)
3. `audit_logs` (Primary Key: `id`, 11 columns)
4. `hod_history` (Primary Key: `id`, 10 columns)
5. `settings` (Primary Key: `key`, JSON value column)
6. `teams` (Primary Key: `id`, Unique Index on `team_id`, 27 columns)
7. `users` (Primary Key: `id`, Unique Indexes on `email` and `roll_no`, 23 columns)
8. `checklists` (Primary Key: `id`, Foreign Key to `teams.id`, Unique Constraint on `team_id`)
9. `faculty` (Primary Key: `id`, Foreign Key to `users.id`, Unique Index on `email`)
10. `review_scores` (Primary Key: `id`, Foreign Key to `teams.id`)
11. `students` (Primary Key: `id`, Foreign Key to `users.id`, Unique Indexes on `email` and `roll_no`)
12. `title_approvals` (Primary Key: `id`, Foreign Key to `teams.id`)
13. `weekly_marks` (Primary Key: `id`, Foreign Key to `teams.id`)
14. `weekly_submissions` (Primary Key: `id`, Foreign Key to `teams.id`, 22 columns)
15. `guide_notices` (Primary Key: `id`, Foreign Keys to `weekly_submissions.id` and `teams.id`)
16. `rubric_criteria` (Primary Key: `id`, Foreign Key to `review_scores.id`)
17. `team_members` (Primary Key: `id`, Foreign Keys to `students.id` and `teams.id`)
18. `weekly_member_marks` (Primary Key: `id`, Foreign Keys to `students.id` and `weekly_marks.id`)

### Integrity Checks
- **Foreign Keys:** Preserved with correct referencing order (independent tables created first, dependent tables created second, junction/detail tables created last).
- **Unique Constraints:** Preserved on `users(email)`, `users(roll_no)`, `teams(team_id)`, `faculty(email)`, `students(email)`, `students(roll_no)`, `checklists(team_id)`.
- **Types:** Preserved PostgreSQL types (`sa.UUID()`, `sa.Numeric()`, `sa.JSON()`, `sa.DateTime()`, `sa.Date()`, `sa.Text()`, `sa.String()`).
- **Downgrade:** Drops tables in the exact inverse dependency order, preventing foreign key constraint violations.
- **Zero Unexpected Operations:** No unexpected table drops, column renames, or type conversions.

---

## 7. Testing Commands and Results

### Test A: Alembic CLI Verification
```powershell
& "C:\Users\Sivad\AppData\Local\Programs\Python\Python312\python.exe" -m alembic --version
```
**Result:** `alembic 1.13.3` (Exit Code 0)

### Test B: Alembic Heads Verification
```powershell
$env:USE_SQLITE="true"; & "C:\Users\Sivad\AppData\Local\Programs\Python\Python312\python.exe" -m alembic heads
```
**Result:** `d8e5093d3ebc (head)` (Exit Code 0)

### Test C: Alembic Upgrade / Downgrade Lifecycle Test
```powershell
& "C:\Users\Sivad\AppData\Local\Programs\Python\Python312\python.exe" -m pytest backend/tests/test_alembic_migrations.py -v -s
```
**Result:**
```text
backend/tests/test_alembic_migrations.py::test_alembic_metadata_loading PASSED
backend/tests/test_alembic_migrations.py::test_alembic_upgrade_downgrade_cycle PASSED
2 passed in 1.26s
```

### Test D: Full Backend Test Suite (Phase 2 Regression Check)
```powershell
$env:USE_SQLITE="true"; & "C:\Users\Sivad\AppData\Local\Programs\Python\Python312\python.exe" -m pytest backend/tests/ -v -s
```
**Result:**
```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
plugins: anyio-4.15.1, asyncio-1.4.0
collected 4 items

backend/tests/test_alembic_migrations.py::test_alembic_metadata_loading PASSED
backend/tests/test_alembic_migrations.py::test_alembic_upgrade_downgrade_cycle PASSED
backend/tests/test_endpoints.py::test_all_endpoints PASSED
backend/tests/test_security_rbac.py::test_security_and_rbac PASSED

============================== 4 passed in 7.55s ==============================
```

---

## 8. Known Limitations

1. **SQLite UUID / JSON Emulation in Tests:**
   SQLAlchemy maps `UUID(as_uuid=True)` to CHAR(32) or BLOB in SQLite, and `JSON` to Text. The migration script uses `sa.UUID()` and `sa.JSON()` which SQLAlchemy natively handles across dialects, but dialect-specific features (e.g. `ARRAY` or PostgreSQL full-text search) cannot be tested natively on SQLite.
2. **Offline Testing vs Production Database:**
   SQLite is used for fast, self-contained offline CI testing. Any future migrations containing PostgreSQL-specific DDL (e.g. `CREATE EXTENSION "uuid-ossp"` or `GIN` indexes) should specify conditional branches or dialect checks in Alembic migrations.

---

## 9. Phase 3B Readiness

The database migration infrastructure is **fully operational and ready for Phase 3B (Backend Repository & Service Harmonization)**.

- Alembic tracking is locked at revision `d8e5093d3ebc`.
- `Base.metadata.create_all()` has been decoupled from production runtime.
- Phase 2 security and RBAC remain 100% functional.
- Zero repository or service refactorings were initiated in this phase.
