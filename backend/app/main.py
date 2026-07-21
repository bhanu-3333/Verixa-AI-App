"""
Verixa AI — FastAPI Application
Phase 3: JWT Authentication + Protected Routes

Request lifecycle:
  Client → CORS → Request Logger → Router → Auth Dependency → Service → MongoDB
                                                             → AI Engine (Phase 4)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
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
from fastapi.staticfiles import StaticFiles
import os

# ── Routers ────────────────────────────────────────────────────────────────────
from app.routes.auth import router as auth_router
from app.routes.translator import router as translator_router
from app.routes.hospital import router as hospital_router
from app.routes.bank import router as bank_router
from app.routes.emergency import router as emergency_router
from app.routes.avatar import router as avatar_router
from app.routes.sign import router as sign_router
from app.routes.schemes import router as schemes_router
from app.services.scheme_service import SchemeService


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
        app_logger.info("MongoDB connection established [OK]")
        # Seed initial verified schemes collection if empty
        await SchemeService.seed_verified_schemes()
    except Exception as exc:
        app_logger.error(f"FATAL - MongoDB UNAVAILABLE at startup: {exc}")
        app_logger.error("Fix MONGO_URI in .env and restart the server.")
        raise   # <-- crash fast; don't serve requests with no DB

    app_logger.info(f"{settings.APP_NAME} ready -> http://{settings.HOST}:{settings.PORT}/docs")

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
        "**Phase 3**: JWT Authentication ✅\n"
        "**Phase 4**: AI Engine Integration\n\n"
        "---\n"
        "### Authentication\n"
        "1. **Register** via `POST /api/v1/auth/register`\n"
        "2. **Login** via `POST /api/v1/auth/login` — copy the `access_token`\n"
        "3. Click the **Authorize 🔒** button above, enter `Bearer <token>`\n"
        "4. All protected endpoints will automatically use your token"
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Swagger Bearer Token Authorization ────────────────────────────────────────
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Add HTTPBearer security scheme so Swagger shows the Authorize button
    schema.setdefault("components", {})
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type":         "http",
            "scheme":       "bearer",
            "bearerFormat": "JWT",
            "description":  "Paste your JWT token here (without the 'Bearer ' prefix)",
        }
    }
    # Apply security globally to all operations that aren't explicitly public
    for path_data in schema.get("paths", {}).values():
        for operation in path_data.values():
            # Skip public auth endpoints
            tags = operation.get("tags", [])
            summary = operation.get("summary", "")
            if "Authentication" in tags and summary in (
                "Register a new user",
                "Login and receive a JWT token",
                "Logout (client should discard the token)",
            ):
                continue
            operation.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi


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
app.include_router(avatar_router,     prefix=API_V1)
app.include_router(sign_router,       prefix=API_V1)
app.include_router(schemes_router,    prefix=API_V1)

# ── Static Files ──────────────────────────────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


# ── Health Endpoints ───────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="Root — confirm API is alive")
async def root():
    return {
        "app":     settings.APP_NAME,
        "version": app.version,
        "status":  "running",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"], summary="Detailed health check")
async def health():
    db_ok = db.client is not None and db.db is not None
    return {
        "status":   "healthy" if db_ok else "degraded",
        "app":      settings.APP_NAME,
        "database": "connected" if db_ok else "disconnected — add MONGO_URI to .env",
    }
