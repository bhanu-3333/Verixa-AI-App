"""
Verixa AI — Application Configuration
Reads all values from .env using python-dotenv
Single source of truth for every environment-dependent setting
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load .env file relative to this file's location
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


class Settings:
    """
    Centralised settings class.
    All modules import `settings` from here — never read os.getenv directly.
    """

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str        = os.getenv("APP_NAME", "Verixa AI")
    HOST: str            = os.getenv("HOST", "0.0.0.0")
    PORT: int            = int(os.getenv("PORT", "8000"))
    DEBUG: bool          = os.getenv("DEBUG", "False").lower() == "true"

    # ── Database ──────────────────────────────────────────────────────────────
    MONGO_URI: str       = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str   = os.getenv("DATABASE_NAME", "verixa_db")

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str      = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str       = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # ── WhatsApp Business Cloud API Settings ──────────────────────────────────
    WHATSAPP_ACCESS_TOKEN: Optional[str] = os.getenv("WHATSAPP_ACCESS_TOKEN") or None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = os.getenv("WHATSAPP_PHONE_NUMBER_ID") or None
    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID") or None
    WHATSAPP_TEMPLATE_NAME: str = os.getenv("WHATSAPP_TEMPLATE_NAME", "emergency_alert")

    # ── AI Engine (Phase 4) ───────────────────────────────────────────────────
    AI_ENGINE_URL: Optional[str] = os.getenv("AI_ENGINE_URL") or None

    # ── CORS (React Native / Expo) ────────────────────────────────────────────
    CORS_ORIGINS: list = [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # ── MongoDB Collection Names ──────────────────────────────────────────────
    COL_USERS              = "users"
    COL_TRANSLATIONS       = "translations"
    COL_HOSPITAL_HISTORY   = "hospital_history"
    COL_BANK_HISTORY       = "bank_history"
    COL_EMERGENCY_ALERTS   = "emergency_alerts"
    COL_EMERGENCY_CONTACTS = "emergency_contacts"
    COL_CHAT_HISTORY       = "chat_history"
    COL_APP_SETTINGS       = "app_settings"
    COL_SCHEMES            = "schemes"


# Singleton — import this everywhere
settings = Settings()
