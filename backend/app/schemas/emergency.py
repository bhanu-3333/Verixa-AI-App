"""Verixa AI — Emergency Request / Response Schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List


class SOSRequest(BaseModel):
    user_id:        str
    emergency_type: str            = Field(..., examples=["medical"])   # medical | fire | police
    message:        str            = Field(..., min_length=1)
    language:       str            = "en"
    latitude:       Optional[float] = None
    longitude:      Optional[float] = None

class EmergencyContactRequest(BaseModel):
    user_id:      str
    name:         str            = Field(..., min_length=2)
    phone:        str            = Field(..., min_length=6)
    relationship: Optional[str] = None
    is_primary:   bool          = False

class EmergencyContactResponse(BaseModel):
    message:  str
    id:       Optional[str]    = None
    contact:  Optional[dict]   = None

class EmergencyContactsListResponse(BaseModel):
    message:  str
    count:    int        = 0
    contacts: List[dict] = []

class SOSResponse(BaseModel):
    message:        str
    session_id:     Optional[str] = None
    emergency_type: Optional[str] = None
    location:       Optional[dict] = None
