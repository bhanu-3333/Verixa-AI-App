"""Verixa AI — Translator Request / Response Schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List


class TranslationRequest(BaseModel):
    text:            str            = Field(..., min_length=1, examples=["Hello, I have a headache"])
    source_language: str            = Field(..., examples=["en"])
    target_language: str            = Field(..., examples=["hi"])
    context:         Optional[str]  = Field(None, examples=["medical"])
    user_id:         Optional[str]  = None

class TranslationResponse(BaseModel):
    message:         str
    id:              Optional[str]  = None
    original_text:   Optional[str]  = None
    translated_text: Optional[str]  = None
    source_language: Optional[str]  = None
    target_language: Optional[str]  = None

class TranslationHistoryResponse(BaseModel):
    message: str
    count:   int        = 0
    history: List[dict] = []
