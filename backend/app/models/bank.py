"""
Verixa AI — Bank History Model
Represents a document in the `bank_history` collection.
"""

from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field


class BankDocument(BaseModel):
    user_id:       str
    bank_name:     str
    service_type:  Optional[str]  = None   # "loan" | "account" | "transfer" | "other"
    chat_messages: List[dict]     = []
    language:      str            = "en"
    status:        str            = "open"
    form_data:     Optional[dict] = None
    created_at:    datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at:    datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True}
