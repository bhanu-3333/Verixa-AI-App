"""
Emergency Schemas — Request and Response models for emergency communication
"""

from pydantic import BaseModel
from typing import Optional


# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class EmergencyRequest(BaseModel):
    """Schema for an emergency communication request"""
    user_id: str
    emergency_type: str    # "medical" | "fire" | "police"
    message: str
    language: str = "en"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class EmergencyResponse(BaseModel):
    """Schema for an emergency communication response"""
    message: str
    session_id: Optional[str] = None
    response_text: Optional[str] = None
    emergency_type: Optional[str] = None
