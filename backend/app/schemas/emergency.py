"""Verixa AI — Emergency Request / Response Schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List


# ── Legacy schemas (backward compatibility with /sos endpoint) ────────────────

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


# ── New schemas (Phase 3 — /send, /history endpoints) ─────────────────────────

class SendSOSRequest(BaseModel):
    """Body for POST /api/v1/emergency/send.
    user_id is NOT accepted here — it is extracted from the JWT.
    """
    latitude:       float          = Field(..., examples=[17.3850])
    longitude:      float          = Field(..., examples=[78.4867])
    maps_link:      str            = Field(..., examples=["https://maps.google.com/?q=17.3850,78.4867"])
    emergency_type: str            = Field(..., examples=["Medical"])  # Medical | Police | Fire | General


class SendSOSResponse(BaseModel):
    """Response envelope for POST /api/v1/emergency/send."""
    success:    bool
    message:    str
    alert_id:   str
    status:     str   # pending | sent | failed


class AlertHistoryItem(BaseModel):
    """Single alert in the history list."""
    id:             str
    user_id:        str
    latitude:       float
    longitude:      float
    maps_link:      str
    emergency_type: str
    status:         str
    sms_status:     str
    created_at:     str   # ISO-8601
