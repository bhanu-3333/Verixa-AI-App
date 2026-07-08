"""
Verixa AI — Emergency Contact + Interaction Models
Two collections:
  emergency_contacts  — saved contacts per user
  (emergency SOS records saved to chat_history with module="emergency")
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class EmergencyContactDocument(BaseModel):
    """Represents a row in `emergency_contacts`."""
    user_id:      str
    name:         str
    phone:        str
    relationship: Optional[str]  = None   # "family" | "friend" | "doctor"
    is_primary:   bool           = False
    created_at:   datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True}
