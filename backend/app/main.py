"""
Verixa AI — FastAPI Application Entry Point
Phase 2: Backend Foundation

Architecture:
    React Native App  →  FastAPI (this file)  →  Services  →  MongoDB
                                              →  AI Engine (Phase 4)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config.config import settings
from app.database.database import db
from app.utils.logger import logger

# ── Route Imports ──────────────────────────────────────────────────────────────
from app.routes.auth import router as auth_router
from app.routes.translator import router as translator_router
from app.routes.hospital import router as hospital_router
from app.routes.bank import router as bank_router
from app.routes.emergency import router as emergency_router


# ── Application Lifespan (startup / shutdown) ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown events.
    - Startup  : Connect to MongoDB
    - Shutdown : Disconnect from MongoDB
    """
    # ── STARTUP ──
    logger.info(f"Starting {settings.APP_NAME}...")

    try:
        await db.connect()
        logger.info("MongoDB connection established.")
    except Exception as e:
        logger.warning(f"MongoDB connection skipped (not configured): {e}")

    logger.info(f"{settings.APP_NAME} is ready on http://{settings.HOST}:{settings.PORT}")

    yield  # Application runs here

    # ── SHUTDOWN ──
    await db.disconnect()
    logger.info(f"{settings.APP_NAME} shut down cleanly.")


# ── Create FastAPI App Instance ────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Verixa AI — AI-Powered Communication Management API\n\n"
        "Supports multilingual communication across hospital, banking, "
        "and emergency domains."
    ),
    version="0.1.0",
    docs_url="/docs",        # Swagger UI
    redoc_url="/redoc",      # ReDoc UI
    lifespan=lifespan,
)


# ── CORS Middleware ────────────────────────────────────────────────────────────
# Allows React Native (Expo) app to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register All Routers ───────────────────────────────────────────────────────
# All routes are prefixed with /api/v1 for versioning
API_PREFIX = "/api/v1"

app.include_router(auth_router,       prefix=API_PREFIX)
app.include_router(translator_router, prefix=API_PREFIX)
app.include_router(hospital_router,   prefix=API_PREFIX)
app.include_router(bank_router,       prefix=API_PREFIX)
app.include_router(emergency_router,  prefix=API_PREFIX)


# ── Root Health Check ──────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint — confirms the API is running
    """
    return {
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint — used by monitoring tools
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
    }
