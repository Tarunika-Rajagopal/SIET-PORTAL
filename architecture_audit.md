# SIET-PORTAL — Architecture Baseline Audit

**Audit Date:** September 20, 2026  
**Status:** Completed  
**Scope:** Frontend (`frontend/`), Backend (`backend/`), Database, Security & RBAC Baseline  

---

## Executive Summary

This document establishes the official **Architecture Baseline Audit** for the **SIET-PORTAL** capstone/project-management portal (CSE Department, Sri Shakthi Institute of Engineering and Technology). 

Phase 2 (Backend Security & Correctness) has been successfully implemented and verified with automated test suites. The purpose of this audit is to objectively document the actual current structure across the entire codebase, contrast it with the target architecture, identify architectural debt, gaps, and risks, and establish a rigorous sequence for future phases without breaking Phase 2 security baselines.

---

## 1. Current Architecture

### 1.1 Actual Implemented System Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REACT VITE FRONTEND                              │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        Local Storage Engine                          │  │
│   │  (Authoritative App DB for Admin, Advisor, HOD, Marks, Student, Auth)│  │
│   └───────────────▲───────────────────────────────────────▲──────────────┘  │
│                   │ (85%+ Operations)                     │                 │
│   ┌───────────────┴───────────────┐        ┌──────────────┴───────────────┐ │
│   │   Frontend Service Layer      │        │      React UI Contexts       │ │
│   │ (adminService, advisorService,│        │   (AuthContext, GuideContext,│ │
│   │  hodService, marksService,    │        │    StudentContext, etc.)     │ │
│   │  studentService, authService) │        └──────────────┬───────────────┘ │
│   └───────────────────────────────┘                       │                 │
│                   │ (Async Fire-and-Forget / Background)  │                 │
│                   ▼                                       ▼                 │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      Frontend apiClient.ts                           │  │
│   │        (Supports ONLY Student, Guide, and Auth login subset)         │  │
│   └───────────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │ HTTP REST (JWT Bearer)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FASTAPI BACKEND                                 │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      FastAPI Routers Layer                           │  │
│   │ (admin, advisor, guide, hod, student, project, marks, auth)          │  │
│   └───────┬───────────────────────────┬──────────────────────────┬───────┘  │
│           │                           │                          │          │
│           ▼                           │                          ▼          │
│   ┌───────────────────────────┐       │ (No Service Layer) ┌─────────────┐  │
│   │     Phase 2 Security      │       │ (Direct Router-to- │   Direct    │  │
│   │   Dependencies & RBAC     │       │     Database)      │  SQLAlchemy │  │
│   │ (get_current_user,        │       │                    │   Queries   │  │
│   │  require_roles, Bcrypt)   │       │                    └──────▲──────┘  │
│   └───────┬───────────────────┘       │                           │         │
│           │                           │                           │         │
│           ▼                           ▼                           │         │
│   ┌───────────────────────────┐       ┌───────────────────────────┤         │
│   │   Services (Partial)      │       │ student_router.py         │         │
│   │ • AdminService            │       │ guide_router.py           │         │
│   │ • AdvisorService          │       │ project_router.py         │         │
│   │ • HODService              │       │ auth_router.py            │         │
│   │ • MarksService            │       │ marks_router (helpers)    │         │
│   │ (NO Student/Guide/Project)│       └───────────────────────────┤         │
│   └───────┬───────────────────┘                                   │         │
│           │                                                       │         │
│           │ Direct Session Access (NO Repositories)               │         │
│           ▼                                                       │         │
│   ┌───────────────────────────────────────────────────────────────┴──────┐  │
│   │                       SQLAlchemy AsyncSession                        │  │
│   │           (Raw execute(select(...)), add(), commit(), delete())      │  │
│   └───────────────────────────────────┬──────────────────────────────────┘  │
│                                       │                                     │
│   ┌───────────────────────────────────┴──────────────────────────────────┐  │
│   │                     Database Schema Management                       │  │
│   │              Base.metadata.create_all() (NO Alembic)                 │  │
│   └───────────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │
                                        ▼
                   PostgreSQL / Supabase (Production)
                   SQLite / aiosqlite (Offline Testing)
```

### 1.2 Current Backend Layering Realities
1. **Routers to Services Breakdown:**
   - **Routers using Services:**
     - `backend/routers/admin_router.py` → `AdminService`
     - `backend/routers/advisor_router.py` → `AdvisorService`
     - `backend/routers/hod_router.py` → `HODService`
     - `backend/routers/marks_router.py` → `MarksService` (partially; helper checks are inline)
   - **Routers bypassing Services (Direct Database Access):**
     - `backend/routers/student_router.py`: **No `StudentService` exists.** Router contains inline team lookup (`_find_team`), DTO serialization (`_team`, `_sub`), business status computation, date generation, and raw SQL queries on `WeeklySubmission`.
     - `backend/routers/guide_router.py`: **No `GuideService` exists.** Router executes multi-table queries and counts (`Team`, `WeeklySubmission`, `TitleApproval`), inline formatting, and submission review mutations directly.
     - `backend/routers/project_router.py`: **No `ProjectService` exists.** Router directly executes queries and mutations on `Team` and `TitleApproval`.
     - `backend/routers/auth_router.py`: **No `AuthService` exists.** Calls helper function `authenticate_user` in `auth/auth.py` which executes raw queries on `User`.

2. **Services to Repositories Breakdown:**
   - **Repository Layer:** **Currently non-existent.** There is no `backend/repositories/` package.
   - **Service Implementation:** Every service (`AdminService`, `AdvisorService`, `HODService`, `MarksService`) takes `db: AsyncSession` as an argument and executes raw SQLAlchemy statements (`await db.execute(select(...))`, `db.add()`, `db.delete()`, `await db.commit()`, `await db.refresh()`).
   - Query logic is duplicated across multiple routers and services (e.g., team queries and lookups by `team_id` or UUID exist in 5 different files).

3. **Database & Migration Management:**
   - Schema creation is solely driven by `Base.metadata.create_all()` inside `backend/database/database.py` during FastAPI startup.
   - **Alembic is completely absent:** Not in `requirements.txt`, no `alembic.ini`, and no `alembic/` migration tree.
   - Schema modifications in production cannot be tracked, versioned, or applied incrementally.

4. **Phase 2 Security & RBAC Status:**
   - `backend/auth/auth.py` strictly verifies JWT tokens (`get_current_user`) and returns HTTP 401 Unauthorized for missing, invalid, or expired tokens.
   - `require_roles(*allowed_roles)` dependency enforces HTTP 403 Forbidden on role mismatch across all routers.
   - Passwords strictly verified via Bcrypt (`hash_password`, `verify_password`).
   - Faculty provisioning in `AdminService.add_faculty()` synchronizes `Faculty` and `User` records.
   - Data isolation: Student cannot access unassigned or cross-team data (returns 404/403); Guide cannot review unassigned teams (returns empty list/403).

### 1.3 Current Frontend Architecture Realities
1. **Authoritative State Storage:**
   - Over 85% of frontend features read from and write to browser `localStorage` as their primary persistent database (`siet_admin_faculties`, `siet_admin_students`, `siet_admin_audit_logs`, `siet_advisor_teams_${class}`, `siet_guide_portal_teams_v6`, `siet_weekly_marks`, `siet_student_team_v6`, `siet_student_submissions_v6`).
   - Mock rosters (`DEFAULT_FACULTIES`, `DEFAULT_STUDENTS`, `MOCK_HOD_ADVISORS`, `MOCK_HOD_TEAMS`) are hardcoded in frontend TypeScript files.
   - If `localStorage` is cleared or accessed from another browser/device, all changes disappear or desynchronize.

2. **API Communication:**
   - `frontend/src/services/apiClient.ts` only contains functions for Student endpoints, Guide endpoints, and Login.
   - It contains **zero** methods for Admin (`/admin/*`), Advisor (`/advisor/*`), HOD (`/hod/*`), Marks (`/marks/*`), or Project title management outside student/guide reviews.
   - Even where `ApiClient` is called (in `GuideContext.jsx`, `studentService.ts`, `authService.ts`), calls are mostly non-blocking fire-and-forget calls (`.catch(() => {})`), while UI rendering continues to rely on `localStorage`.

---

## 2. Target Architecture

The target architecture defines a clean, scalable, decoupled 4-tier full-stack system:

```text
React TypeScript Frontend (Vite)
       │  HTTP REST (Fetch / ApiClient, JWT Bearer)
       ▼
FastAPI Application
       │
       ▼
Routers
  (HTTP route definition, Request/Response validation via Pydantic Schemas, HTTP status codes)
       │
       ▼
Dependencies Layer
  (Authentication, JWT extraction, Role-Based Access Control via require_roles)
       │
       ▼
Services Layer
  (Pure business logic, orchestration, validation rules, status workflows, calculations; independent of HTTP)
       │
       ▼
Repositories Layer
  (Database access abstraction, queries, joins, filtering, pagination, transaction handling)
       │
       ▼
SQLAlchemy ORM (AsyncIO)
       │
       ▼
Database Schema Management: Alembic Migrations
       │
       ▼
PostgreSQL / Supabase (Production)
[SQLite / aiosqlite (Offline Automated Testing Only)]
```

---

## 3. Current vs Target Architecture Comparison

| Architectural Dimension | Current Implemented State | Target Baseline Architecture | Status / Gap |
| :--- | :--- | :--- | :--- |
| **Frontend Authoritative Data** | Browser `localStorage` + in-memory mock objects | PostgreSQL / Supabase via FastAPI REST APIs | **Major Gap:** Frontend must transition from `localStorage` to API clients |
| **Frontend API Coverage** | Covers only Auth, Student, and partial Guide endpoints | Full coverage of Admin, Advisor, Guide, HOD, Student, Marks, and Projects | **Major Gap:** Missing API wrappers for 5 major modules |
| **Frontend/Backend Synchronization** | Fire-and-forget background promises; UI reads `localStorage` | Awaited API calls; React state driven by backend responses | **Major Gap:** Unidirectional authoritative API binding required |
| **Backend Router Role** | Mixed: Some delegate to services, others directly query DB and format data | Thin HTTP layer: schema validation, dependency injection, and service calls | **Partial Gap:** `student_router`, `guide_router`, `project_router` need services |
| **Backend Service Layer** | Incomplete: Only `AdminService`, `AdvisorService`, `HODService`, `MarksService` exist | Complete: All business logic encapsulated in dedicated services | **Gap:** Missing `StudentService`, `GuideService`, `ProjectService`, `AuthService` |
| **Backend Repository Layer** | **Non-existent:** Services and routers write raw SQLAlchemy queries | Clean abstraction: `UserRepository`, `TeamRepository`, `StudentRepository`, etc. | **Major Gap:** No repository layer exists |
| **Authentication & RBAC** | Centralized, strict 401/403 enforcement, Bcrypt hashing, token validation | Centralized, strict 401/403 enforcement, Bcrypt hashing, token validation | **Aligned:** Phase 2 implementation meets target |
| **Data Isolation & Ownership** | Hardened in Phase 2: scoped by team and role without fallbacks | Hardened: scoped by team and role without fallbacks | **Aligned:** Phase 2 implementation meets target |
| **Database ORM** | SQLAlchemy 2.0 AsyncIO with asyncpg & aiosqlite | SQLAlchemy 2.0 AsyncIO with asyncpg & aiosqlite | **Aligned:** Core database engine is in place |
| **Schema Migration Management** | Unmanaged: `Base.metadata.create_all()` on startup | Managed: Alembic versioned migration tree | **Major Gap:** Alembic must be initialized and baselined |

---

## 4. Files / Modules Requiring Architectural Changes

> [!NOTE]
> This list is for architectural audit purposes. **No files are being modified during this audit phase.**

### 4.1 Backend Routers Requiring Decoupling
1. [`backend/routers/student_router.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/routers/student_router.py)
   - **Current Issue:** Contains direct DB queries (`select(WeeklySubmission)...`), helper team lookups (`_find_team`), and internal data formatting.
   - **Required Change:** Delegate all team retrieval, submission retrieval, submission creation, and deletion to a new `StudentService`.
2. [`backend/routers/guide_router.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/routers/guide_router.py)
   - **Current Issue:** Inlines multi-table aggregation counts (`WeeklySubmission`, `TitleApproval`), team querying, and direct submission updates.
   - **Required Change:** Delegate dashboard metrics, team listing, and submission review workflows to a new `GuideService`.
3. [`backend/routers/project_router.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/routers/project_router.py)
   - **Current Issue:** Inlines project title updates, `TitleApproval` creation, and guide approval/rejection logic.
   - **Required Change:** Delegate title lifecycle logic to a new `ProjectService`.
4. [`backend/routers/marks_router.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/routers/marks_router.py)
   - **Current Issue:** Contains direct `Team` query helper `_find_team` and team access validation inside the router.
   - **Required Change:** Move team validation into service or dependency layer.
5. [`backend/routers/auth_router.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/routers/auth_router.py)
   - **Current Issue:** User dictionary formatting `_user_dict` and authentication logic reside between `auth_router.py` and `auth/auth.py`.
   - **Required Change:** Cleanly encapsulate authentication flow in an `AuthService`.

### 4.2 Backend Services Requiring Repository Extraction
1. [`backend/services/admin_service.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/services/admin_service.py)
   - **Current Issue:** 400+ lines directly executing raw `select(Faculty)`, `select(Student)`, `select(User)`, `select(AuditLog)`.
   - **Required Change:** Delegate database queries to `FacultyRepository`, `StudentRepository`, `UserRepository`, and `AuditLogRepository`.
2. [`backend/services/advisor_service.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/services/advisor_service.py)
   - **Current Issue:** Directly queries and mutates `Team`, `TeamMember`, `Student`, `Faculty`, `AdvisorHistory`.
   - **Required Change:** Delegate database queries to `TeamRepository`, `StudentRepository`, `AdvisorHistoryRepository`.
3. [`backend/services/hod_service.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/services/hod_service.py)
   - **Current Issue:** Inlines complex queries with joins and search filters on `Faculty`, `Student`, `Team`, `HodHistory`.
   - **Required Change:** Delegate database queries to `FacultyRepository`, `TeamRepository`, `HodHistoryRepository`.
4. [`backend/services/marks_service.py`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/backend/services/marks_service.py)
   - **Current Issue:** Inlines queries and child record deletions/insertions on `WeeklyMark` and `WeeklyMemberMark`.
   - **Required Change:** Delegate database access to `MarksRepository`.

### 4.3 New Backend Components Required
1. **New Services:**
   - `backend/services/student_service.py`: To house student team and weekly submission workflows.
   - `backend/services/guide_service.py`: To house guide dashboard analytics, team mentoring, and review logic.
   - `backend/services/project_service.py`: To house capstone project title submissions and approval workflows.
   - `backend/services/auth_service.py`: To coordinate login credentials verification, JWT issuance, and user profile construction.
2. **New Repositories (`backend/repositories/`):**
   - `user_repository.py`: CRUD and query methods for `User`.
   - `team_repository.py`: CRUD, member loading, and status queries for `Team` and `TeamMember`.
   - `student_repository.py`: CRUD, batch lookup, and roster synchronization for `Student`.
   - `faculty_repository.py`: CRUD, quota tracking, and role queries for `Faculty`.
   - `submission_repository.py`: CRUD, weekly milestone queries, and review updates for `WeeklySubmission`.
   - `marks_repository.py`: CRUD and average calculations for `WeeklyMark` and `WeeklyMemberMark`.
   - `audit_repository.py`: Logging and history queries for `AuditLog`, `AdvisorHistory`, `HodHistory`.
   - `project_repository.py`: Title proposal and approval queries for `TitleApproval`.

### 4.4 Database Migration Infrastructure Required
1. `backend/requirements.txt`: Add `alembic`.
2. `backend/alembic.ini`: Configuration file pointing to migrations.
3. `backend/alembic/`: Migration directory (`env.py`, `script.py.mako`, `versions/`).
4. `backend/database/database.py`: Deprecate runtime reliance on `Base.metadata.create_all()` in production environments.

### 4.5 Frontend Components Requiring Refactoring (Future Phase)
1. [`frontend/src/services/apiClient.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/apiClient.ts): Add API methods for Admin, Advisor, HOD, Marks.
2. [`frontend/src/services/adminService.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/adminService.ts): Replace `localStorage` with `ApiClient` calls.
3. [`frontend/src/services/advisorService.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/advisorService.ts): Replace `localStorage` with `ApiClient` calls.
4. [`frontend/src/services/hodService.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/hodService.ts): Replace `MOCK_HOD_ADVISORS` / `localStorage` with `ApiClient` calls.
5. [`frontend/src/services/marksService.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/marksService.ts): Replace `siet_weekly_marks` localStorage with `ApiClient` calls.
6. [`frontend/src/services/studentService.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/studentService.ts): Await API calls and treat backend as authoritative source.
7. [`frontend/src/services/authService.ts`](file:///c:/Users/Sivad/OneDrive/Desktop/tt-final/frontend/src/services/authService.ts): Rely purely on backend JWT authentication response.

---

## 5. Phase 3 Recommendation: Order of Operations

### The Question: Alembic First or Repository Refactoring First?

### Recommendation: **Alembic First (Schema Baseline Locking)**

### Technical Justification:
1. **Schema Stability Precedes Code Layering:**
   The database schema defines the core entities, foreign keys, constraints, and data contracts that both Services and Repositories interact with. Attempting to build a clean Repository layer while the schema is unversioned and reliant on runtime `create_all()` risks building abstractions over uncommitted or drifting schema definitions.
2. **Preventing Data Loss in Supabase / Production:**
   Supabase (PostgreSQL) already holds live tables and data. Initializing Alembic now—and generating an initial baseline migration that reflects the exact current `models.py` state—ensures that production tables are never dropped or corrupted.
3. **Safe Offline Test Parity:**
   With Alembic established, database migrations can be tested deterministically in CI/CD and offline testing environments without requiring dynamic runtime creation hacks.
4. **Independent Concerns:**
   Alembic initialization touches only database configuration (`alembic.ini`, `alembic/env.py`, `versions/`), leaving all Phase 2 routers, security dependencies, and service logic completely untouched. This avoids mixing database migration risk with Python code refactoring risk.

---

## 6. Identified Risks and Preservation Checklist

### 6.1 Critical Phase 2 Security Behaviors That Must Not Be Weakened
- [x] **No Anonymous Fallbacks:** Never reintroduce default student fallbacks when `Authorization` headers are missing.
- [x] **Centralized RBAC Enforcement:** Every router endpoint must retain its `require_roles(...)` dependency; refactoring into services must not bypass router-level dependency checks.
- [x] **Data Isolation Scoping:**
  - Students must strictly access only their own assigned team (`user.team_id == team.team_id`).
  - Unassigned students must receive HTTP 404, never fallback to Team 04.
  - Guides must strictly review submissions and approve titles only for teams they supervise; unassigned guides must receive empty lists `[]`.
- [x] **Strict Bcrypt Password Verification:** Plaintext password comparisons must never be reintroduced in authentication, user provisioning, or student CSV imports.
- [x] **Faculty User Provisioning:** Any creation of a `Faculty` record must simultaneously create and link the corresponding `User` record with hashed credentials.

### 6.2 Architectural Refactoring Risks
1. **Breaking Existing API Contracts:**
   The frontend `apiClient.ts` currently expects specific response shapes (e.g., `id`, `submissionId`, `teamId`, `teamNo`, `guideApprovalStatus`). Repository and Service refactoring must preserve exact Pydantic schema contracts so current working features do not break.
2. **Session / Transaction Management Leaks:**
   When extracting repositories, the database session (`AsyncSession`) must remain scoped to the FastAPI request dependency (`Depends(get_db)`). Repositories should receive the session from the service, and transactions (`commit()`, `rollback()`) must be managed deterministically at the service or unit-of-work boundary.
3. **Alembic Type Incompatibilities Between PostgreSQL and SQLite:**
   Current models use PostgreSQL-specific types (`UUID(as_uuid=True)`, `ARRAY`). When setting up Alembic, `env.py` and migration scripts must be compatible with both PostgreSQL and SQLite (used for offline automated tests).

---

## 7. Recommended Implementation Sequence

```text
Phase 2 (Completed & Verified)
  └─ Security, RBAC, Bcrypt, Data Isolation, Secrets Management
       │
       ▼
Phase 3A: Database Migration Baseline (Alembic)
  ├─ 1. Add alembic to backend requirements
  ├─ 2. Initialize Alembic environment (alembic.ini, env.py supporting AsyncIO)
  ├─ 3. Generate initial baseline migration matching current SQLAlchemy models
  └─ 4. Verify migration against offline SQLite test DB and PostgreSQL
       │
       ▼
Phase 3B: Backend Repository & Service Harmonization
  ├─ 1. Create backend/repositories/ (User, Team, Student, Faculty, Submission, Marks)
  ├─ 2. Create missing services (StudentService, GuideService, ProjectService, AuthService)
  ├─ 3. Refactor existing services (Admin, Advisor, HOD, Marks) to use repositories
  ├─ 4. Refactor routers to be thin controllers (HTTP request → validation → service → DTO)
  └─ 5. Run full pytest suite (test_endpoints.py + test_security_rbac.py) to ensure 0 regression
       │
       ▼
Phase 4: Frontend API Integration & LocalStorage Deprecation
  ├─ 1. Expand apiClient.ts to cover all Admin, Advisor, HOD, Marks, and Project endpoints
  ├─ 2. Refactor frontend services one by one to use awaited ApiClient calls
  ├─ 3. Transition UI components to consume real backend data
  └─ 4. Deprecate client-side authoritative localStorage usage
```

---

## 8. Audit Conclusion

The SIET-PORTAL codebase has established a secure, working foundation through Phase 2. However, the architecture is currently bifurcated:
1. The **backend** possesses a strong domain schema and robust RBAC security, but lacks a Repository layer and omits services for three key routers.
2. The **frontend** remains tethered to a client-side `localStorage` database with hardcoded mock rosters, with only minimal asynchronous integration.
3. The **database schema** is unversioned and lacks Alembic migrations.

By executing the recommended sequence—starting with **Alembic baseline migrations (Phase 3A)**, followed by **Backend Repository/Service harmonization (Phase 3B)**, and concluding with **Frontend API integration (Phase 4)**—the project will cleanly achieve the target architecture baseline without compromising security, data integrity, or existing features.
