# Trigger reload for advisor endpoints including guide reassignment and available guides
import time
import traceback
import asyncio
import contextvars
from contextlib import asynccontextmanager

from sqlalchemy import event
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from database import init_db, async_session, db_status, check_db_connection
from models import (
    User, Faculty, Student, Team, TeamMember, WeeklySubmission,
    Checklist, WeeklyMark, WeeklyMemberMark, TitleApproval,
)
from sqlalchemy import select
import uuid
from datetime import datetime

from config import settings
from auth.auth import hash_password

# Routers
from routers.auth_router import router as auth_router
from routers.student_router import router as student_router
from routers.guide_router import router as guide_router
from routers.project_router import router as project_router
from routers.admin_router import router as admin_router
from routers.hod_router import router as hod_router
from routers.advisor_router import router as advisor_router
from routers.marks_router import router as marks_router
from routers.job_router import router as job_router
# Seed service export for tests and maintenance
from services.seed_service import seed_initial_data
from database.database import measure_db_latency, engine


# ── lifespan MUST be defined before FastAPI(...) uses it ───────
@asynccontextmanager
async def lifespan(app: FastAPI):
    async def _bg_startup():
        try:
            await init_db()
        except Exception as e:
            print(f"[Startup] Background DB notice: {e}")

    # Fire background startup task without blocking Uvicorn boot
    asyncio.create_task(_bg_startup())
    yield
    # Shutdown


app = FastAPI(
    title="SIET Project Portal API",
    version="1.0.0",
    description="FastAPI Backend for SIET CSE Project Portal matching frontend apiClient endpoints.",
    lifespan=lifespan,
)


# ── temporary diagnostics: queries + time per request ──────────
_q = contextvars.ContextVar("q", default=None)


@event.listens_for(engine.sync_engine, "before_cursor_execute")
def _count(conn, cursor, statement, parameters, context, executemany):
    counter = _q.get()
    if counter is not None:
        counter["n"] += 1


@app.middleware("http")
async def log_time(request, call_next):
    counter = {"n": 0}
    _q.set(counter)
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    print(f"[REQ] {request.method} {request.url.path} {ms:.0f} ms, {counter['n']} queries", flush=True)
    return response


# Enable CORS for frontend Vite development server and production
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if not cors_origins:
    cors_origins = ["*"]

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(student_router)
app.include_router(guide_router)
app.include_router(project_router)
app.include_router(admin_router)
app.include_router(hod_router)
app.include_router(advisor_router)
app.include_router(marks_router)
app.include_router(job_router)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    detail = str(exc)
    if "connect" in detail.lower() or "connection" in detail.lower():
        return JSONResponse(
            status_code=503,
            content={"detail": f"Database connection failed: {detail}"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {detail}"},
    )


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SIET Project Portal Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "database": "connected"}


@app.get("/health/db-latency")
async def db_latency():
    return await measure_db_latency()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app", "routers", "services", "repositories", "database", "auth"],
    )