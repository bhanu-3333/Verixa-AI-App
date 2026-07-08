"""
Verixa AI — Chat History Model
Represents a document in the `chat_history` collection.
"""

from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role:    str   # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatDocument(BaseModel):
    user_id:         str
    module:          str        # "hospital" | "bank" | "emergency" | "translator"
    messages:        List[ChatMessage] = []
    source_language: str        = "en"
    target_language: str        = "en"
    created_at:      datetime   = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True}
