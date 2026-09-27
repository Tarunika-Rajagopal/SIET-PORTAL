## IMPORTANT RULE

**Do not make changes to any other portals. Modify and integrate ONLY the Advisor Portal.**

The current project contains an existing frontend and backend.

The development process must happen in **two phases**:

### Phase 1 – Frontend ↔ Backend Connection

First, establish and verify a proper connection between the existing frontend and backend.

**Do NOT integrate any specific feature during this phase.**

### Phase 2 – Feature-by-Feature Integration

After the frontend and backend connection is confirmed to be working, integrate the Advisor Portal **one feature at a time**.

---

# GENERAL INSTRUCTIONS

## 1. Work Feature-by-Feature Only

* Do NOT integrate the entire project at once.
* Complete and verify one feature before moving to the next feature.
* Do not automatically continue to another feature after completing the current one.
* Wait for the next feature/instruction.

## 2. Frontend ↔ Backend Connection Must Come First

Before integrating any Advisor Portal feature:

* Inspect the existing frontend.
* Inspect the existing backend.
* Understand the existing API structure.
* Understand the database configuration.
* Understand authentication and authorization.
* Understand CORS and environment configuration.
* Establish the frontend → backend communication.
* Test that the frontend can successfully communicate with the backend.

During this initial connection phase:

* Do NOT integrate Team Allocation.
* Do NOT integrate Student Directory.
* Do NOT integrate Guide Directory.
* Do NOT integrate Profile.
* Do NOT integrate any other Advisor Portal feature.

Only establish and verify the basic frontend-backend connection.

Once the connection is confirmed, STOP and wait for the next instruction.

---

## 3. Do Not Redesign the Existing Frontend

* Keep the current UI unchanged.
* Do not change the existing layout.
* Do not change colors.
* Do not change fonts.
* Do not change navigation.
* Do not change animations.
* Do not replace existing components unnecessarily.
* Do not redesign pages unless the specific feature explicitly requires a UI change.

---

## 4. Do Not Modify Other Portals

Strictly do NOT modify:

* Student Portal
* Guide Portal
* Other existing portals
* Unrelated backend functionality
* Unrelated database functionality

If a shared file must be modified, first verify that the change is genuinely required for the Advisor Portal and does not break other portals.

---

## 5. Inspect Existing Code Before Making Changes

Before implementing anything, inspect the relevant existing code.

Identify:

* Frontend components
* Pages
* Routes
* API configuration
* Backend routes
* Controllers
* Models
* Database tables/collections
* Authentication
* Authorization
* Middleware
* Existing API endpoints
* Existing utilities
* Environment configuration

Do not make assumptions about how the project works.

---

## 6. Use the Existing Backend Whenever Possible

* Reuse existing backend routes and APIs whenever applicable.
* Reuse existing controllers and models whenever possible.
* Reuse the existing database structure whenever possible.
* Do not create duplicate APIs.
* Do not create duplicate models.
* Do not create duplicate database structures.
* Do not create duplicate authentication systems.

Only create new backend functionality when the required functionality does not already exist.

---

## 7. Connect the Existing Frontend to the Backend

After the basic connection is established:

* Replace frontend-only/mock/static application data with real backend API data.
* Use the backend API for retrieving data.
* Use the backend API for creating data.
* Use the backend API for updating data.
* Use the backend API for deleting data where applicable.
* Ensure user-created or user-updated data is persisted through the backend.

The frontend should act as the interface, while persistent application data must be managed by the backend/database.

---

## 8. NO MOCK OR FAKE APPLICATION DATA

**Do NOT create mock application data.**

Do NOT:

* Create fake users.
* Create fake students.
* Create fake teams.
* Create fake guides.
* Create fake submissions.
* Create fake database records.
* Create local JSON files containing fake application data.
* Hardcode database records inside React components.
* Duplicate backend records inside frontend files.

If data is required for the UI, retrieve it from the backend API.

### Allowed

Normal UI constants are allowed, such as:

* Button labels
* Page titles
* Static navigation labels
* Icons
* Fixed UI configuration
* Validation messages
* Empty-state messages

These must not be used to imitate real backend/application data.

---

## 9. Backend Is the Source of Truth

For application data:

**Backend / Database = Source of Truth**

The frontend must not maintain a separate copy of persistent application data.

For example:

```text
Frontend
   ↓
API Request
   ↓
Backend
   ↓
Database
   ↓
Backend Response
   ↓
Frontend
```

Any user-created or user-updated application data must be sent to the backend API and persisted there.

---

## 10. Do Not Break Existing Functionality

Before making changes:

* Understand how the current functionality works.
* Modify only what is necessary.
* Do not unnecessarily refactor unrelated code.
* Do not remove existing functionality unless explicitly instructed.
* Do not change working functionality just to use a different implementation.

---

## 11. Follow the Existing Project Structure

* Follow the existing folder structure.
* Follow the existing coding style.
* Reuse existing components.
* Reuse existing utilities.
* Reuse existing API configuration.
* Reuse existing authentication logic.
* Reuse existing backend patterns.

Do not create unnecessary new folders or files.

---

## 12. API State Handling

For API-based functionality, properly handle:

* Loading state
* Success state
* Error state
* Empty state
* Network/API failure
* Appropriate user feedback

Do not hide API errors or silently fail.

---

## 13. Authentication & Authorization

Follow the existing authentication and authorization system.

* Do not expose sensitive information in the frontend.
* Do not expose passwords or secrets.
* Do not bypass authentication.
* Do not bypass authorization.
* Ensure Advisor-only functionality remains accessible only to authorized users.
* Do not create a separate authentication mechanism unless explicitly required.

---

## 14. Database Changes

Do not modify the database structure unnecessarily.

If a database/model change is genuinely required:

* Make the minimum required change.
* Follow the existing database architecture.
* Do not delete existing data.
* Do not recreate the database unnecessarily.
* Do not create duplicate tables/collections for existing entities.

---

# FEATURE-BY-FEATURE WORKFLOW

For every Advisor Portal feature, follow this exact process.

## Step 1 – Inspect

Inspect the existing frontend and backend code related to the feature.

## Step 2 – Identify

Identify:

* Existing frontend components
* Existing frontend pages
* Existing backend routes
* Controllers
* Models
* Database tables/collections
* Authentication requirements
* Authorization requirements
* Existing APIs that can be reused

## Step 3 – Plan

Determine the **minimum changes** required to connect the feature.

Do not start coding until the existing implementation has been understood.

## Step 4 – Implement

Implement **ONLY the selected feature**.

Do not modify unrelated features.

## Step 5 – Integrate

Connect:

```text
Frontend UI
     ↓
API Request
     ↓
Backend Route
     ↓
Controller / Service
     ↓
Database
     ↓
Backend Response
     ↓
Frontend UI
```

## Step 6 – Test

Test the complete flow:

**Frontend → API → Backend → Database → Backend → Frontend**

Verify:

* Data is retrieved correctly.
* Data is created correctly.
* Data is updated correctly.
* Data is deleted correctly where applicable.
* API errors are handled.
* Authentication works.
* Authorization works.

## Step 7 – Verify

Ensure:

* The selected feature works correctly.
* Existing Advisor Portal functionality still works.
* Other portals are unchanged.
* No mock data was introduced.
* No hardcoded application data was introduced.
* No unnecessary files were modified.
* No unnecessary database changes were made.

## Step 8 – Stop

After the selected feature is completed and verified:

**STOP.**

Do not automatically move to the next feature.

Wait for the next explicit instruction.

---

# DEVELOPMENT ORDER

Follow this order:

### Phase 1

**Connect Frontend ↔ Backend**

↓

### Phase 2

**Verify Frontend ↔ Backend Connection**

↓

### Phase 3

**Integrate Advisor Portal – Feature 1**

↓

### Phase 4

**Test and Verify Feature 1**

↓

### Phase 5

**Integrate Advisor Portal – Feature 2**

↓

### Phase 6

**Test and Verify Feature 2**

↓

Continue the same process for each feature.

---

# FINAL RULES

**DO NOT MODIFY ANYTHING OUTSIDE THE SELECTED ADVISOR PORTAL FEATURE.**

**WORK ON ONLY ONE FEATURE AT A TIME.**

**FIRST ESTABLISH THE FRONTEND ↔ BACKEND CONNECTION.**

**DO NOT INTEGRATE FEATURES DURING THE INITIAL CONNECTION PHASE.**

**DO NOT CREATE MOCK DATA.**

**DO NOT USE HARDCODED SAMPLE APPLICATION DATA IN THE FRONTEND.**

**DO NOT DUPLICATE BACKEND DATA INSIDE THE FRONTEND.**

**ANY APPLICATION DATA DISPLAYED IN THE FRONTEND MUST BE RETRIEVED FROM THE BACKEND API.**

**ANY USER-CREATED OR USER-UPDATED APPLICATION DATA MUST BE SENT TO THE BACKEND API AND PERSISTED THERE.**

**DO NOT CREATE LOCAL JSON FILES CONTAINING FAKE APPLICATION DATA.**

**DO NOT CREATE DUPLICATE BACKEND APIs, MODELS, OR DATABASE STRUCTURES.**

**DO NOT MODIFY OTHER PORTALS.**

**DO NOT PROCEED TO THE NEXT FEATURE UNTIL IT IS EXPLICITLY PROVIDED.**

**DO NOT MAKE UNNECESSARY CHANGES OR REFACTOR UNRELATED CODE.**

**PRESERVE THE EXISTING UI AND FUNCTIONALITY UNLESS THE CURRENT FEATURE EXPLICITLY REQUIRES A CHANGE.**
