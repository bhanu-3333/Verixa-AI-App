"""Verixa AI — Auth Request / Response Schemas"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    name:     str   = Field(..., min_length=2, max_length=80, examples=["Rindhiya"])
    email:    str   = Field(..., examples=["user@example.com"])
    password: str   = Field(..., min_length=6, examples=["secret123"])

class LoginRequest(BaseModel):
    email:    str   = Field(..., examples=["user@example.com"])
    password: str   = Field(..., examples=["secret123"])

class AuthResponse(BaseModel):
    message:  str
    user_id:  Optional[str] = None
    token:    Optional[str] = None          # JWT — Phase 3
