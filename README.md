# IMPORTANT RULE

The project contains multiple portals such as:

* Student
* Advisor
* Guide
* HOD
* Admin
* Other existing portals

**All portals can be modified and integrated when required. Do not restrict development to the Advisor Portal.**

However, work on **only one explicitly selected portal/feature at a time**.

---

# 1. PHASE 1 – FRONTEND ↔ BACKEND CONNECTION

First:

* Inspect the existing frontend and backend.
* Understand the API structure.
* Understand database configuration.
* Understand authentication and authorization.
* Check CORS and environment configuration.
* Establish frontend → backend communication.
* Verify that the connection works.

**Do not integrate any portal feature during this phase.**

After the connection is verified:

**STOP and wait for the next instruction.**

---

# 2. PHASE 2 – FEATURE-BY-FEATURE INTEGRATION

After the connection is confirmed:

Integrate only the **portal and feature explicitly requested**.

Examples:

* Student → My Team
* Advisor → Team Allocation
* Guide → Weekly Review
* HOD → Formula Settings
* Admin → User Management

Do not automatically integrate other portals or features.

After completing and testing the selected feature:

**STOP and wait for the next instruction.**

---

# 3. EXISTING CODE FIRST

Before making changes:

* Inspect the existing frontend.
* Inspect the existing backend.
* Identify components, pages and routes.
* Identify APIs, controllers, services and models.
* Identify database structures.
* Identify authentication and authorization.
* Reuse existing functionality whenever possible.

Do not make assumptions about the project structure.

---

# 4. NO UNNECESSARY UI CHANGES

Preserve the existing:

* Layout
* Colors
* Fonts
* Navigation
* Components
* Animations
* Responsive design

Do not redesign the application unless the selected feature genuinely requires a UI change.

---

# 5. BACKEND IS THE SOURCE OF TRUTH

Do not use frontend mock/static application data.

Do NOT create:

* Fake users
* Fake students
* Fake teams
* Fake guides/advisors
* Fake submissions
* Fake marks
* Fake reviews
* Fake database records
* Local JSON containing application data
* Hardcoded database records

Persistent data must come from the backend.

```text
Frontend
   ↓
API
   ↓
Backend
   ↓
Database
   ↓
Backend Response
   ↓
Frontend
```

All created or updated application data must be sent to the backend and persisted in the database.

---

# 6. REUSE EXISTING BACKEND

Before creating anything new:

* Check whether the API already exists.
* Check whether the controller/service already exists.
* Check whether the model already exists.
* Check whether the database structure already exists.
* Reuse existing authentication and authorization.

Do not create duplicate:

* APIs
* Controllers
* Services
* Models
* Database tables/collections
* Authentication systems

Create new backend functionality only when genuinely necessary.

---

# 7. AUTHENTICATION & AUTHORIZATION

Use the existing authentication system.

Do not create another login system.

Ensure:

* Users can access only their authorized portal.
* Role-based access is enforced.
* Protected APIs require authentication.
* Backend authorization is enforced.
* Students cannot access Advisor-only functions.
* Advisors cannot access HOD-only functions.
* Guides cannot access Admin-only functions.

Never bypass authorization.

---

# 8. SHARED / CROSS-PORTAL DATA

Some features may affect multiple portals.

Example:

```text
Advisor creates team
        ↓
Database
        ↓
Student sees team
        ↓
Guide sees assigned team
        ↓
HOD sees progress
```

Use the same backend/database source of truth.

Do not duplicate the same data across portals.

If a shared backend change is required:

* Make the minimum change.
* Preserve existing functionality.
* Test all directly affected portals.

---

# 9. FEATURE WORKFLOW

For every selected feature:

### Step 1 – Inspect

Understand the existing implementation.

### Step 2 – Identify

Find the required frontend, API, backend and database components.

### Step 3 – Plan

Determine the minimum required changes.

### Step 4 – Implement

Implement **only the selected feature**.

### Step 5 – Integrate

```text
Frontend
   ↓
API
   ↓
Backend
   ↓
Database
   ↓
Response
   ↓
Frontend
```

### Step 6 – Test

Verify:

* Data retrieval
* Data creation
* Data update
* Data deletion where applicable
* Authentication
* Authorization
* Validation
* Loading state
* Empty state
* Error handling
* Data persistence

### Step 7 – Verify

Ensure:

* Selected feature works.
* Existing functionality still works.
* Other portals are not unintentionally broken.
* No mock data exists.
* No unnecessary files were changed.
* No unnecessary database changes were made.

### Step 8 – STOP

Do not automatically continue to another feature or portal.

Wait for the next instruction.

---

# 10. DO NOT BREAK EXISTING FUNCTIONALITY

* Do not unnecessarily refactor working code.
* Do not remove existing functionality.
* Do not replace working implementations without reason.
* Do not modify unrelated portals unnecessarily.
* If a shared file must change, make the minimum safe change.
* Test affected portals after shared changes.

---

# 11. API / DATABASE RULES

Before creating a new API or database structure:

1. Check whether it already exists.
2. Reuse it if possible.
3. Modify it only if necessary.
4. Create new functionality only when required.

Do not create duplicate tables, collections, APIs or models.

Do not delete existing data.

Do not recreate the database unnecessarily.

---

# 12. ERROR & API STATE HANDLING

Every API feature must properly handle:

* Loading
* Success
* Empty state
* Error
* Network failure
* Authentication failure
* Authorization failure
* Validation errors

Never display fake success when the backend operation failed.

---

# 13. FINAL DEVELOPMENT ORDER

```text
Connect Frontend ↔ Backend
        ↓
Verify Connection
        ↓
STOP
        ↓
Select Portal
        ↓
Select Feature
        ↓
Inspect Existing Code
        ↓
Implement Feature
        ↓
Connect API → Backend → Database
        ↓
Test
        ↓
Verify
        ↓
STOP
        ↓
Wait for Next Feature
```

---

# FINAL RULES

**ALL EXISTING PORTALS MAY BE INTEGRATED.**

**DO NOT RESTRICT DEVELOPMENT TO THE ADVISOR PORTAL.**

**WORK ON ONLY ONE EXPLICITLY SELECTED FEATURE AT A TIME.**

**ESTABLISH THE FRONTEND ↔ BACKEND CONNECTION FIRST.**

**DO NOT INTEGRATE FEATURES DURING THE INITIAL CONNECTION PHASE.**

**DO NOT CREATE MOCK OR FAKE APPLICATION DATA.**

**BACKEND / DATABASE IS THE SOURCE OF TRUTH.**

**DO NOT HARDCODE DATABASE RECORDS IN THE FRONTEND.**

**DO NOT CREATE DUPLICATE APIs, MODELS OR DATABASE STRUCTURES.**

**REUSE THE EXISTING AUTHENTICATION AND AUTHORIZATION SYSTEM.**

**PRESERVE THE EXISTING UI AND FUNCTIONALITY.**

**DO NOT UNNECESSARILY MODIFY OTHER PORTALS.**

**IF A SHARED CHANGE IS REQUIRED, MAKE THE MINIMUM SAFE CHANGE.**

**TEST THE COMPLETE FRONTEND → API → BACKEND → DATABASE → FRONTEND FLOW.**

**AFTER COMPLETING THE SELECTED FEATURE, STOP AND WAIT FOR THE NEXT INSTRUCTION.**
