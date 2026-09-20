# PHASE 3B: BACKEND REPOSITORY + SERVICE LAYER HARMONIZATION REPORT

## A. Objective

The primary objective of **Phase 3B** is to refactor the SIET-PORTAL FastAPI backend into a clean, decoupled 4-tier layered architecture:

$$\text{React Frontend} \rightarrow \text{FastAPI Routers} \rightarrow \text{Dependencies / RBAC} \rightarrow \text{Services} \rightarrow \text{Repositories} \rightarrow \text{SQLAlchemy AsyncSession} \rightarrow \text{PostgreSQL / Supabase}$$

Key requirements achieved:
1. Introduced a concrete **Repository Layer** (`backend/repositories/`) encapsulating all SQLAlchemy database operations.
2. Formed a distinct **Service Layer** (`backend/services/`) housing business workflows, inter-entity validations, authorization logic, and transactional boundaries.
3. Streamlined all **FastAPI Routers** (`backend/routers/`) into thin HTTP presentation controllers utilizing standard FastAPI Dependency Injection.
4. Preserved 100% of external API contracts (URLs, methods, request/response schemas, and field semantics).
5. Maintained the frozen **Phase 2 Security Baseline** (Bcrypt password hashing, JWT authentication, centralized RBAC, zero fallbacks, strict student and guide isolation).
6. Preserved the frozen **Phase 3A Alembic Baseline** (`d8e5093d3ebc_initial_schema_baseline.py`) with zero changes to database schemas or production data.
7. Kept the React frontend completely untouched for Phase 4.

---

## B. Before Architecture

Prior to Phase 3B, the backend lacked a repository layer and had mixed architectural responsibilities:

```text
FastAPI Routers (Mixed)
  ├── direct raw SQLAlchemy queries (select, update, delete, joins)
  ├── inline business logic & validation
  ├── partial delegation to 4 static services
  └── direct session management
        ↓
Services (Partial: admin, advisor, hod, marks)
  ├── static methods taking raw db sessions
  └── direct inline SQLAlchemy queries
        ↓
AsyncSession / Database
```

Issues resolved by Phase 3B:
* `student_router.py`, `guide_router.py`, `project_router.py`, and `auth_router.py` performed direct queries (`select()`, `or_()`, `func.count()`, eager loading).
* Business logic and data querying were tightly coupled in route definitions.
* Transaction boundaries were scattered and inconsistent.

---

## C. After Architecture

Phase 3B established a strict unidirectional layered flow:

```text
React Frontend (Vite + TypeScript)
               ↓  [HTTP REST API via JSON]
FastAPI Routers (Thin presentation controllers)
               ↓  [Depends(get_current_user), Depends(require_roles(...))]
Dependencies / Auth / RBAC
               ↓  [Depends(get_*_service)]
Service Layer (Business Logic & Transactions)
               ↓  [Injected AsyncSession]
Repository Layer (Concrete ORM Queries & Mutations)
               ↓  [select, add, delete, execute]
SQLAlchemy 2.0 AsyncSession
               ↓  [asyncpg / aiosqlite]
PostgreSQL / Supabase (Prod) | SQLite (Offline Tests)
```

Each tier's responsibilities:
* **Routers**: HTTP routing, query/body parameter extraction, Pydantic validation, status codes, and delegating to services via dependency injection.
* **Dependencies**: Authentication extraction, JWT verification, user lookup, role authorization checks (`require_roles`).
* **Services**: Business rules, ownership checks, workflow coordination between repositories, and transaction commitment (`await self.session.commit()`).
* **Repositories**: Concrete entity queries, filtering, additions, deletions, and eager-loading specifications without committing prematurely.
* **Database Layer**: SQLAlchemy models, asynchronous session provisioning via `get_db()`.

---

## D. Repositories Created

All repositories are located in `backend/repositories/` and take an `AsyncSession` during instantiation:

| Repository | File | Primary Responsibilities & Methods |
| :--- | :--- | :--- |
| `UserRepository` | `user_repository.py` | User entity queries: `get_by_id`, `get_by_email`, `get_by_roll_no`, `get_by_email_or_roll`, `get_by_login`, `list_by_role`, `list_by_roles`, `create`, `delete`. |
| `StudentRepository` | `student_repository.py` | Student entity access: `get_by_id`, `get_by_roll_no`, `get_by_email`, `get_by_user_id`, `list_all`, `list_by_class_section`, `list_by_class_and_batch`, `create`, `delete`. |
| `FacultyRepository` | `faculty_repository.py` | Faculty management: `get_by_id`, `get_by_email`, `get_by_name`, `list_all`, `list_advisors`, `get_advisor_for_class`, `create`, `delete`. |
| `TeamRepository` | `team_repository.py` | Team & TeamMember queries: `get_by_id`, `get_by_team_id_string`, `get_with_members`, `get_with_members_and_submissions`, `list_by_class`, `list_by_guide`, `list_by_advisor_name`, `list_by_guide_name`, `list_all`, `create`, `delete`, `add_member`, `remove_member`, `get_member_by_roll`, `list_members_by_team_id`, `get_team_by_member_roll_no`. |
| `SubmissionRepository` | `submission_repository.py` | WeeklySubmission management: `get_by_id`, `get_by_team_and_week`, `list_by_team`, `list_by_teams`, `count_by_teams`, `create`, `delete`. |
| `MarksRepository` | `marks_repository.py` | Marks management: `get_weekly_mark`, `list_by_team`, `create_weekly_mark`, `delete_weekly_mark`, `add_member_mark`, `delete_member_marks`. |
| `ProjectRepository` | `project_repository.py` | TitleApproval access: `get_title_approval_by_id`, `get_title_approval_by_team_id`, `count_title_approvals_by_teams`, `create_title_approval`, `delete_title_approval`. |
| `AuditRepository` | `audit_repository.py` | Audit & history logging: `list_audit_logs`, `create_audit_log`, `list_advisor_history`, `create_advisor_history`, `list_hod_history`, `create_hod_history`. |

---

## E. Services Created / Refactored

All services are located in `backend/services/` and receive `AsyncSession` to orchestrate repositories and manage transaction lifecycles:

| Service | File | Status | Responsibilities & Orchestrations |
| :--- | :--- | :--- | :--- |
| `AuthService` | `auth_service.py` | **Created** | Authenticates user credentials via `UserRepository` and Bcrypt `verify_password`. Issues JWTs via `create_access_token`. Formats user response payload. |
| `StudentService` | `student_service.py` | **Created** | Manages student team retrieval, deliverable submissions, and week-by-week queries via `TeamRepository` and `SubmissionRepository`. Enforces strict student team isolation (no fallback). |
| `GuideService` | `guide_service.py` | **Created** | Retrieves assigned guide teams and dashboard counts via `TeamRepository`, `SubmissionRepository`, and `ProjectRepository`. Enforces guide supervision checks on review actions. |
| `ProjectService` | `project_service.py` | **Created** | Handles project title proposals and reviews via `TeamRepository` and `ProjectRepository`. Validates student team membership and guide assignment. |
| `AdminService` | `admin_service.py` | **Refactored** | Coordinates `FacultyRepository`, `StudentRepository`, `UserRepository`, and `AuditRepository` for faculty/student CRUD, password hashing, and audit logging. |
| `AdvisorService` | `advisor_service.py` | **Refactored** | Orchestrates `TeamRepository` and `StudentRepository` for class team management, student movements, capacity checks, and guide allocations. |
| `HODService` | `hod_service.py` | **Refactored** | Utilizes `UserRepository`, `TeamRepository`, `SubmissionRepository`, and `AuditRepository` for department-wide filters, advisor overviews, and history tracking. |
| `MarksService` | `marks_service.py` | **Refactored** | Manages weekly and member marks via `TeamRepository` and `MarksRepository`. Calculates team averages and enforces team mark access authorization. |

---

## F. Routers Refactored

All 8 API routers were refactored into thin controllers that inject their corresponding service:

1. **`routers/auth_router.py`**:
   - Injects `get_auth_service(db)`.
   - Dispatches `POST /api/v1/auth/login` directly to `AuthService.login(req)`.
2. **`routers/student_router.py`**:
   - Injects `get_student_service(db)` and `require_roles("student")`.
   - Thin endpoints for `/team`, `/submissions`, `/submissions/{week}` (GET, POST, DELETE).
3. **`routers/guide_router.py`**:
   - Injects `get_guide_service(db)` and `require_roles("guide")`.
   - Thin endpoints for `/teams`, `/dashboard`, `/submissions/weekly`, `/submissions/{submission_id}/review`.
4. **`routers/project_router.py`**:
   - Injects `get_project_service(db)` with role restrictions.
   - Thin endpoints for `PUT /team/{team_id}/title` and `POST /{project_id}/title-approval`.
5. **`routers/admin_router.py`**:
   - Injects `get_admin_service(db)` and `require_roles("admin")`.
   - Thin endpoints for faculty CRUD, student enrollment/import, and audit logs.
6. **`routers/advisor_router.py`**:
   - Injects `get_advisor_service(db)` and `require_roles("advisor")`.
   - Thin endpoints for `/teams`, `/students`, `/move-student`, `/reassign-guide`.
7. **`routers/hod_router.py`**:
   - Injects `get_hod_service(db)` and `require_roles("hod")`.
   - Thin endpoints for `/advisors`, `/students`, `/teams`, `/faculty-list`, `/history`.
8. **`routers/marks_router.py`**:
   - Injects `get_marks_service(db)` with appropriate role guards.
   - Thin endpoints for weekly marks retrieval, saving, and deletion.

---

## G. API Compatibility

External API contracts were strictly preserved:
* **Endpoints & HTTP Verbs**: All routes retain their exact URL prefix and methods.
* **Request & Response Schemas**: Pydantic schemas in `schemas.py` and JSON payloads remain identical.
* **Dual Field Identifiers Preserved**:
  - `id` and `submissionId` are both exposed on weekly submission objects for frontend client compatibility.
  - `teamId` and `teamNo` remain consistent across all payloads.
  - `weekNumber` and `guideApprovalStatus` retain their precise keys and string formats.
* **HTTP Status Codes**: Expected error codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`) behave identically.

---

## H. Security Preservation

All Phase 2 security and isolation rules remain strictly enforced:
* **Authentication**: Requests missing valid Bearer tokens are rejected with `401 Unauthorized`. Invalid/malformed tokens return `401`.
* **RBAC**: Centralized `require_roles(...)` dependency guards all sensitive endpoints.
* **Password Hashing**: Bcrypt (`bcrypt.hashpw` / `bcrypt.checkpw`) is consistently used with zero plaintext fallbacks.
* **Student Data Isolation**: Students can only view and modify their assigned team's title, deliverables, and marks. Unassigned students receive `404 Not Found` (never fallback to Team B04).
* **Guide Isolation**: Mentors can only view and review submissions for teams they actively guide. Guides without assigned teams receive `[]` (never fallback to all teams). Cross-team guide reviews return `403 Forbidden`.

---

## I. Transaction Handling

Transaction boundaries are clearly segregated:
* **Repositories**: Perform queries (`select`), stage additions (`session.add`), and register deletions (`session.delete`). Repositories do not independently execute `commit()` so that operations can be composed.
* **Services**: Form atomic transaction boundaries. Upon successful validation and staging across multiple repositories, services invoke `await self.session.commit()` and `await self.session.refresh(entity)`. If an exception occurs, changes roll back cleanly with the session.

---

## J. Automated Verification & Test Results

Testing was performed under SQLite isolation (`$env:USE_SQLITE="true"`), verifying both existing suites and newly added tests:

```powershell
$env:USE_SQLITE="true"; python -m pytest backend/tests/ -v -s
```

### Test Suite Execution Summary:

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\Sivad\OneDrive\Desktop\tt-final
plugins: anyio-4.15.1, asyncio-1.4.0

backend/tests/test_alembic_migrations.py::test_alembic_metadata_loading PASSED
backend/tests/test_alembic_migrations.py::test_alembic_upgrade_downgrade_cycle PASSED
backend/tests/test_endpoints.py::test_all_endpoints PASSED
backend/tests/test_repositories_services.py::test_repositories_and_services PASSED
backend/tests/test_security_rbac.py::test_security_and_rbac PASSED

============================== 5 passed in 8.39s ==============================
```

### Alembic Migration Head Check:

```powershell
python -m alembic heads
# Output:
d8e5093d3ebc (head)
```

Zero migration drift or new migrations were generated.

---

## K. Files Changed

### Repositories Created:
* `backend/repositories/__init__.py`
* `backend/repositories/user_repository.py`
* `backend/repositories/student_repository.py`
* `backend/repositories/faculty_repository.py`
* `backend/repositories/team_repository.py`
* `backend/repositories/submission_repository.py`
* `backend/repositories/marks_repository.py`
* `backend/repositories/project_repository.py`
* `backend/repositories/audit_repository.py`

### Services Created / Refactored:
* `backend/services/auth_service.py` *(Created)*
* `backend/services/student_service.py` *(Created)*
* `backend/services/guide_service.py` *(Created)*
* `backend/services/project_service.py` *(Created)*
* `backend/services/admin_service.py` *(Refactored to repositories)*
* `backend/services/advisor_service.py` *(Refactored to repositories)*
* `backend/services/hod_service.py` *(Refactored to repositories)*
* `backend/services/marks_service.py` *(Refactored to repositories)*

### Routers Refactored:
* `backend/routers/auth_router.py`
* `backend/routers/student_router.py`
* `backend/routers/guide_router.py`
* `backend/routers/project_router.py`
* `backend/routers/admin_router.py`
* `backend/routers/advisor_router.py`
* `backend/routers/hod_router.py`
* `backend/routers/marks_router.py`

### Tests Added / Maintained:
* `backend/tests/test_repositories_services.py` *(New comprehensive unit/integration suite)*
* `backend/tests/test_alembic_migrations.py` *(Passing)*
* `backend/tests/test_endpoints.py` *(Passing)*
* `backend/tests/test_security_rbac.py` *(Passing)*

---

## L. Remaining Work

* **Phase 4 — Frontend API Integration**: Harmonizing the React frontend (`frontend/src/`) API client, state management, and views with the verified backend API endpoints.
