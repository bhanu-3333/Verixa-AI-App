"""
Auth Routes
Handles all authentication-related endpoints
Full JWT implementation in Phase 3
"""

from fastapi import APIRouter
from app.schemas.auth import LoginRequest, RegisterRequest, AuthResponse
from app.services.auth_service import login_user, register_user

# Create router with /auth prefix and tag for API docs grouping
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/login")
async def login_placeholder():
    """
    Placeholder: Login route health check
    Phase 3: Will accept LoginRequest body and return JWT token
    """
    return {"message": "Login Route Working"}


@router.get("/register")
async def register_placeholder():
    """
    Placeholder: Register route health check
    Phase 3: Will accept RegisterRequest body and create user in MongoDB
    """
    return {"message": "Register Route Working"}


@router.get("/logout")
async def logout_placeholder():
    """
    Placeholder: Logout route health check
    Phase 3: Will invalidate JWT token
    """
    return {"message": "Logout Route Working"}
