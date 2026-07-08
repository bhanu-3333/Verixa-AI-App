"""
Verixa AI — Translation Record Model
Represents a document in the `translations` collection.
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class TranslationDocument(BaseModel):
    user_id:         Optional[str]  = None
    original_text:   str
    translated_text: str            = ""    # populated after AI call (Phase 4)
    source_language: str
    target_language: str
    context:         Optional[str]  = None  # "medical" | "banking" | "emergency"
    created_at:      datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True}
