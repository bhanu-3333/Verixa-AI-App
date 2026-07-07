"""
Bank Routes
Handles all banking communication endpoints
AI Engine + MongoDB integration in Phase 4
"""

from fastapi import APIRouter
from app.schemas.bank import BankChatRequest, BankChatResponse
from app.services.bank_service import bank_chat, get_bank_history

# Create router with /bank prefix
router = APIRouter(prefix="/bank", tags=["Bank"])


@router.get("/bank")
async def bank_placeholder():
    """
    Placeholder: Bank route health check
    Phase 4: Will accept BankChatRequest body
              and route to AI Engine for banking communication
    """
    return {"message": "Bank Route Working"}


@router.get("/history")
async def bank_history_placeholder():
    """
    Placeholder: Bank chat history route health check
    Phase 4: Will retrieve session history from MongoDB
    """
    return {"message": "Bank History Route Working"}
