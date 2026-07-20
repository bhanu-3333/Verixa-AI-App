"""Verixa AI — Hospital Request / Response Schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List


class SymptomRequest(BaseModel):
    user_id:        str
    hospital_name:  str             = Field(..., examples=["City General Hospital"])
    department:     Optional[str]   = Field(None, examples=["Cardiology"])
    symptom:        str             = Field(..., examples=["chest pain"])
    pain_location:  Optional[str]   = Field(None, examples=["left chest"])
    pain_intensity: Optional[int]   = Field(None, ge=0, le=10, examples=[7])
    language:       str             = "en"

class HospitalChatRequest(BaseModel):
    user_id:       str
    session_id:    str              = Field(..., examples=["64f1a2b3c4d5e6f7a8b9c0d1"])
    message:       str              = Field(..., min_length=1)
    language:      str              = "en"

class HospitalChatResponse(BaseModel):
    message:       str
    session_id:    Optional[str]    = None
    response_text: Optional[str]    = None

class HospitalHistoryResponse(BaseModel):
    message:  str
    count:    int        = 0
    history:  List[dict] = []
