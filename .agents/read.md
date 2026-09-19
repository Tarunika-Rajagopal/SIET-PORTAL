a`
## Overview
This skill governs automated, single-prompt full-stack integration tasks. The goal is to bind a non-negotiable, pre-existing frontend interface with a functional backend and database layer in a single execution loop without altering the UI source code or styling.

---

## Operating Principles


2. **Database Schema Inference**
   - Inspect frontend type definitions, forms, API client calls, fetch hooks, or state interfaces.
   - Infer table structures, field constraints, relationships (one-to-many, many-to-many), and data types strictly based on what the UI sends and renders.

3. **Continuous Endpoint Verification**
   - Automatically generate integration tests (or automated cURL/Postman script runs) for every endpoint created.
   - Execute verification tests immediately after starting the server or connecting the mock database to validate `200 OK`, payload shapes, and error models before declaring completion.

---

## Execution Workflow (Single-Prompt Protocol)

### Phase 1: Frontend Audit & Schema Extraction
- Scan frontend codebase (`src/api`, `src/services`, `src/components`, `src/hooks`).
- Extract expected endpoints, HTTP methods, request bodies, query parameters, headers, and expected response formats.
- Map UI state values directly to Database ORM Models / SQL Migration scripts.

### Phase 2: Backend & Database Construction
- Initialize or update the API server routes to match extracted paths (e.g., `/api/v1/resource`).
- Build Controller logic to handle payloads exactly as sent by UI forms without requiring UI refactoring.
- Connect Database migrations and seed initial dummy data matching UI field defaults.
- Enable CORS, authentication token handling (e.g., Bearer tokens), and error formats expected by frontend error boundaries.

### Phase 3: Continuous Testing & Endpoint Validation
- Execute endpoint verification across all CRUD operations:
  - Validate response payload keys match frontend interface definitions word-for-word.
  - Verify error states (400, 401, 404, 500) return shapes handled gracefully by UI error handlers.
- Re-run server/API integration tests until 100% pass rate is achieved.

---

## Instructions for AI Prompt Execution

When processing a single integration prompt using this skill, perform the actions in the following precise sequence:

1. READ frontend files first to map API expectations.
2. GENERATE backend routes, models, and DB migrations without touching frontend files.
3. START local DB and API server.
4. TEST endpoints programmatically using test scripts or HTTP requests.
5. FIX any backend mismatches until all API calls return valid data shapes.
6. VERIFY end-to-end flow with zero UI modifications.