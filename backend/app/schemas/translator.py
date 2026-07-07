"""
Translator Schemas — Request and Response models for translation
AI translation logic to be connected in Phase 4 (AI Engine)
"""

from pydantic import BaseModel
from typing import Optional


# ──────────────────────────────────────────────
# Request Schemas
# ──────────────────────────────────────────────

class TranslationRequest(BaseModel):
    """Schema for a translation request"""
    text: str
    source_language: str    # e.g. "en", "hi", "ta"
    target_language: str    # e.g. "en", "hi", "ta"
    context: Optional[str] = None  # e.g. "medical", "banking", "emergency"


# ──────────────────────────────────────────────
# Response Schemas
# ──────────────────────────────────────────────

class TranslationResponse(BaseModel):
    """Schema for a translation response"""
    message: str
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
