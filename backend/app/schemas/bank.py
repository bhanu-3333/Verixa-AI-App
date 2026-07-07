"""
Bank Schemas — Request and Response models for banking communication
"""

from pydantic import BaseModel
from typing import Optional


# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class BankChatRequest(BaseModel):
    """Schema for banking communication request"""
    user_id: str
    bank_name: str
    query_type: Optional[str] = None   # e.g. "loan", "account", "transfer"
    message: str
    language: str = "en"


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class BankChatResponse(BaseModel):
    """Schema for banking communication response"""
    message: str
    session_id: Optional[str] = None
    response_text: Optional[str] = None
