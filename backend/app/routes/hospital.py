"""
Hospital Routes
Handles all hospital communication endpoints
AI Engine + MongoDB integration in Phase 4
"""

from fastapi import APIRouter
from app.schemas.hospital import HospitalChatRequest, HospitalChatResponse
from app.services.hospital_service import hospital_chat, get_hospital_history

# Create router with /hospital prefix
router = APIRouter(prefix="/hospital", tags=["Hospital"])


@router.get("/hospital")
async def hospital_placeholder():
    """
    Placeholder: Hospital route health check
    Phase 4: Will accept HospitalChatRequest body
              and route to AI Engine for medical communication
    """
    return {"message": "Hospital Route Working"}


@router.get("/history")
async def hospital_history_placeholder():
    """
    Placeholder: Hospital chat history route health check
    Phase 4: Will retrieve session history from MongoDB
    """
    return {"message": "Hospital History Route Working"}
