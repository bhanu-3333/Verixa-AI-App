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
    HOST: str            = os.getenv("HOST", "127.0.0.1")
    PORT: int            = int(os.getenv("PORT", "8000"))
    DEBUG: bool          = os.getenv("DEBUG", "False").lower() == "true"

    # ── Database ──────────────────────────────────────────────────────────────
    MONGO_URI: str       = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str   = os.getenv("DATABASE_NAME", "verixa_db")

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str      = os.getenv("SECRET_KEY", "change-me")

    # ── AI Engine (Phase 4) ───────────────────────────────────────────────────
    AI_ENGINE_URL: Optional[str] = os.getenv("AI_ENGINE_URL") or None

    # ── CORS (React Native / Expo) ────────────────────────────────────────────
    CORS_ORIGINS: list = ["*"]   # Lock down to specific origins in production

    # ── MongoDB Collection Names ──────────────────────────────────────────────
    COL_USERS              = "users"
    COL_TRANSLATIONS       = "translations"
    COL_HOSPITAL_HISTORY   = "hospital_history"
    COL_BANK_HISTORY       = "bank_history"
    COL_EMERGENCY_CONTACTS = "emergency_contacts"
    COL_CHAT_HISTORY       = "chat_history"
    COL_APP_SETTINGS       = "app_settings"


# Singleton — import this everywhere
settings = Settings()
