"""
Verixa AI — User Model
Represents a document in the `users` collection.
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class UserDocument(BaseModel):
    """Schema that mirrors a MongoDB user document."""
    name:                           str
    email:                          str
    hashed_password:                str       = ""          # populated in Phase 3
    preferred_language:             str       = "en"
    is_active:                      bool      = True
    emergency_contact_name:         str       = ""
    emergency_contact_phone:        str       = ""
    emergency_contact_relationship: str       = ""
    created_at:                     datetime  = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at:                     datetime  = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True}
