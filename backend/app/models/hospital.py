"""
Verixa AI — Hospital History Model
Represents a document in the `hospital_history` collection.
"""

from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field


class SymptomEntry(BaseModel):
    symptom:       str
    pain_location: Optional[str] = None
    pain_intensity: Optional[int] = None   # 1–10


class HospitalDocument(BaseModel):
    user_id:       str
    hospital_name: str
    department:    Optional[str]        = None
    symptoms:      List[SymptomEntry]   = []
    chat_messages: List[dict]           = []
    language:      str                  = "en"
    status:        str                  = "open"   # "open" | "closed"
    created_at:    datetime             = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at:    datetime             = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True}
