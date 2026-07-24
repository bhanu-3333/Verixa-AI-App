"""Verixa AI — Auth Request / Response Schemas (Phase 3)"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Requests ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:                           str = Field(..., min_length=2, max_length=80, examples=["Rindhiya"])
    email:                          str = Field(..., examples=["user@example.com"])
    password:                       str = Field(..., min_length=6, examples=["secret123"])
    emergency_contact_name:         Optional[str] = Field(default="", examples=["John Doe"])
    emergency_contact_phone:        Optional[str] = Field(default="", examples=["+919876543210"])
    emergency_contact_relationship: Optional[str] = Field(default="", examples=["brother"])


class LoginRequest(BaseModel):
    email:    str = Field(..., examples=["user@example.com"])
    password: str = Field(..., examples=["secret123"])


# ── Responses ─────────────────────────────────────────────────────────────────

class UserPublic(BaseModel):
    """User fields safe to return to the client — no hashed_password."""
    id:                             Optional[str] = None
    name:                           str
    email:                          str
    preferred_language:             str           = "en"
    is_active:                      bool          = True
    emergency_contact_name:         str           = ""
    emergency_contact_phone:        str           = ""
    emergency_contact_relationship: str           = ""
    created_at:                     Optional[str] = None


class TokenResponse(BaseModel):
    """Response returned after successful login."""
    access_token: str
    token_type:   str        = "bearer"
    user:         UserPublic


class RegisterResponse(BaseModel):
    message: str
    user:    UserPublic


class AuthResponse(BaseModel):
    """Generic auth response kept for backward compatibility."""
    message:  str
    user_id:  Optional[str] = None
    token:    Optional[str] = None
