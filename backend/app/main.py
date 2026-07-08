"""
Verixa AI — FastAPI Application
Phase 2: Backend Foundation + MongoDB Integration

Request lifecycle:
  Client → CORS → Request Logger → Router → Service → MongoDB
                                                     → AI Engine (Phase 4)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pymongo.errors import PyMongoError
import time

from app.config.config import settings
from app.database.database import db
from app.utils.logger import app_logger, req_logger
from app.utils.exceptions import (
    validation_exception_handler,
    pymongo_exception_handler,
    global_exception_handler,
)

# ── Routers ────────────────────────────────────────────────────────────────────
from app.routes.auth import router as auth_router
from app.routes.translator import router as translator_router
from app.routes.hospital import router as hospital_router
from app.routes.bank import router as bank_router
from app.routes.emergency import router as emergency_router


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    app_logger.info("=" * 60)
    app_logger.info(f"  Starting {settings.APP_NAME}")
    app_logger.info(f"  Debug mode : {settings.DEBUG}")
    app_logger.info("=" * 60)

    try:
        await db.connect()
        app_logger.info("MongoDB connection established ✓")
    except Exception as exc:
        app_logger.error(f"MongoDB UNAVAILABLE: {exc}")
        app_logger.warning("Server starting without database — endpoints will fail until DB is reachable.")

    app_logger.info(f"{settings.APP_NAME} ready → http://{settings.HOST}:{settings.PORT}/docs")

    yield   # ← app runs here

    # ── SHUTDOWN ──
    await db.disconnect()
    app_logger.info(f"{settings.APP_NAME} shut down cleanly.")


# ── App Instance ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "**Verixa AI** — AI-Powered Multilingual Communication Management\n\n"
        "Covers hospital communication, banking assistance, and emergency response "
        "with real-time AI translation.\n\n"
        "**Phase 2**: Backend Foundation + MongoDB Integration\n"
        "**Phase 3**: Authentication (JWT)\n"
        "**Phase 4**: AI Engine Integration"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Exception Handlers ─────────────────────────────────────────────────────────
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(PyMongoError,           pymongo_exception_handler)
app.add_exception_handler(Exception,              global_exception_handler)


# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Logger Middleware ──────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    req_logger.info(
        f"{request.method} {request.url.path} → {response.status_code} ({duration:.1f}ms)"
    )
    return response


# ── Routers ────────────────────────────────────────────────────────────────────
API_V1 = "/api/v1"
app.include_router(auth_router,       prefix=API_V1)
app.include_router(translator_router, prefix=API_V1)
app.include_router(hospital_router,   prefix=API_V1)
app.include_router(bank_router,       prefix=API_V1)
app.include_router(emergency_router,  prefix=API_V1)


# ── Health Endpoints ───────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="Root — confirm API is alive")
async def root():
    return {
        "app":     settings.APP_NAME,
        "version": "2.0.0",
        "status":  "running",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"], summary="Detailed health check")
async def health():
    db_ok = db.db is not None
    try:
        if db_ok:
            await db.client.admin.command("ping")
    except Exception:
        db_ok = False

    return {
        "status":   "healthy" if db_ok else "degraded",
        "app":      settings.APP_NAME,
        "database": "connected" if db_ok else "disconnected",
    }
