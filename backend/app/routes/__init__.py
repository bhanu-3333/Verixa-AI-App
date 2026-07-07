"""
Routes package init — exposes all routers
"""

from app.routes.auth import router as auth_router
from app.routes.translator import router as translator_router
from app.routes.hospital import router as hospital_router
from app.routes.bank import router as bank_router
from app.routes.emergency import router as emergency_router

__all__ = [
    "auth_router",
    "translator_router",
    "hospital_router",
    "bank_router",
    "emergency_router",
]
