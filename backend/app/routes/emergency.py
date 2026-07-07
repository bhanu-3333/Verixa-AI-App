"""
Emergency Routes
Handles all emergency communication endpoints
AI Engine + MongoDB integration in Phase 4
"""

from fastapi import APIRouter
from app.schemas.emergency import EmergencyRequest, EmergencyResponse
from app.services.emergency_service import emergency_chat, get_emergency_history

# Create router with /emergency prefix
router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get("/emergency")
async def emergency_placeholder():
    """
    Placeholder: Emergency route health check
    Phase 4: Will accept EmergencyRequest body
              and route to AI Engine for emergency communication
              with urgency detection and location routing
    """
    return {"message": "Emergency Route Working"}


@router.get("/history")
async def emergency_history_placeholder():
    """
    Placeholder: Emergency history route health check
    Phase 4: Will retrieve emergency session history from MongoDB
    """
    return {"message": "Emergency History Route Working"}
