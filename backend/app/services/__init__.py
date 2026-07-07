"""
Services package init
"""

from app.services.auth_service import login_user, register_user, logout_user
from app.services.translator_service import translate_text, detect_language
from app.services.hospital_service import hospital_chat, get_hospital_history
from app.services.bank_service import bank_chat, get_bank_history
from app.services.emergency_service import emergency_chat, get_emergency_history

__all__ = [
    "login_user", "register_user", "logout_user",
    "translate_text", "detect_language",
    "hospital_chat", "get_hospital_history",
    "bank_chat", "get_bank_history",
    "emergency_chat", "get_emergency_history",
]
