"""
Auth Schemas — Request and Response models for authentication
Full validation logic to be added in Phase 3
"""

from pydantic import BaseModel


# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Schema for user registration request"""
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    """Schema for user login request"""
    email: str
    password: str


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class AuthResponse(BaseModel):
    """Schema for authentication response"""
    message: str
    token: str = None  # JWT token — to be populated in Phase 3
    user_id: str = None
