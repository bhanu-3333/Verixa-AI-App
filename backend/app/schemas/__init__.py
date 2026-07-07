"""
Schemas package init
"""

from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.schemas.translator import TranslationRequest, TranslationResponse
from app.schemas.hospital import HospitalChatRequest, HospitalChatResponse
from app.schemas.bank import BankChatRequest, BankChatResponse
from app.schemas.emergency import EmergencyRequest, EmergencyResponse

__all__ = [
    "RegisterRequest", "LoginRequest", "AuthResponse",
    "TranslationRequest", "TranslationResponse",
    "HospitalChatRequest", "HospitalChatResponse",
    "BankChatRequest", "BankChatResponse",
    "EmergencyRequest", "EmergencyResponse",
]
