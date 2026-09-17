from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging
from app.exceptions.custom import APIException
from app.exceptions.handlers import (
    api_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    generic_exception_handler,
)
from app.api import (
    health, academic, auth, faculty, students, teams, projects,
    student_portal, submissions, evaluations, guide_portal,
    advisor_portal, hod_portal, admin, notifications
)

from contextlib import asynccontextmanager
from app.core.database import engine, Base
from seed import seed_data

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        await seed_data()
    except Exception as e:
        pass
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Routers
app.include_router(health.router)
app.include_router(academic.router)
app.include_router(auth.router)
app.include_router(faculty.router)
app.include_router(students.router)
app.include_router(teams.router)
app.include_router(projects.router)
app.include_router(student_portal.router)
app.include_router(submissions.router)
app.include_router(evaluations.router)
app.include_router(guide_portal.router)
app.include_router(advisor_portal.router)
app.include_router(hod_portal.router)
app.include_router(admin.router)
app.include_router(notifications.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
