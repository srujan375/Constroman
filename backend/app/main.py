import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.routers import (
    health,
    projects,
    reports,
    registers,
    templates,
    submissions,
    attachments,
    comments,
    audit_logs,
)
from app.auth import router as auth_router

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Construction DPR Management API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    logger.exception(
        "Database error while handling %s %s", request.method, request.url.path
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(
        "Unhandled error while handling %s %s", request.method, request.url.path
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred."},
    )


@app.on_event("startup")
async def startup() -> None:
    logger.info("Starting %s in %s mode", settings.app_name, settings.environment)


@app.on_event("shutdown")
async def shutdown() -> None:
    logger.info("Shutting down %s", settings.app_name)


app.include_router(auth_router.router)
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(reports.router)
app.include_router(registers.router)
app.include_router(templates.router)
app.include_router(submissions.router)
app.include_router(attachments.router)
app.include_router(comments.router)
app.include_router(audit_logs.router)
