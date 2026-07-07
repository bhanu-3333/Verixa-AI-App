"""
Hospital Schemas — Request and Response models for hospital communication
"""

from pydantic import BaseModel
from typing import Optional


# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class HospitalChatRequest(BaseModel):
    """Schema for hospital communication request"""
    user_id: str
    hospital_name: str
    department: Optional[str] = None
    message: str
    language: str = "en"


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class HospitalChatResponse(BaseModel):
    """Schema for hospital communication response"""
    message: str
    session_id: Optional[str] = None
    response_text: Optional[str] = None
