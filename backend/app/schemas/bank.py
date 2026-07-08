"""Verixa AI — Bank Request / Response Schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List


class BankServiceRequest(BaseModel):
    user_id:      str
    bank_name:    str            = Field(..., examples=["State Bank of India"])
    service_type: Optional[str] = Field(None, examples=["loan"])
    language:     str           = "en"

class BankChatRequest(BaseModel):
    user_id:    str
    session_id: str             = Field(..., examples=["64f1a2b3c4d5e6f7a8b9c0d1"])
    message:    str             = Field(..., min_length=1)
    language:   str             = "en"

class BankChatResponse(BaseModel):
    message:       str
    session_id:    Optional[str] = None
    response_text: Optional[str] = None

class BankHistoryResponse(BaseModel):
    message:  str
    count:    int        = 0
    history:  List[dict] = []
