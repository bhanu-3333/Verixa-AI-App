"""
Application Configuration Module
Loads environment variables and provides centralized config access
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """
    Application settings loaded from environment variables
    Provides centralized access to configuration values
    """
    
    # Application Settings
    APP_NAME: str = os.getenv("APP_NAME", "Verixa AI")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database Settings
    MONGODB_URL: Optional[str] = os.getenv("MONGODB_URL")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "verixa_db")
    
    # Security Settings
    SECRET_KEY: Optional[str] = os.getenv("SECRET_KEY")
    
    # CORS Settings (for React Native communication)
    CORS_ORIGINS: list = [
        "http://localhost:8081",  # Expo Metro
        "exp://localhost:8081",    # Expo scheme
        "*"                         # Allow all (restrict in production)
    ]
    
    # Future AI Engine Settings (placeholder)
    AI_ENGINE_URL: Optional[str] = os.getenv("AI_ENGINE_URL")
    
    @classmethod
    def validate(cls):
        """
        Validate critical configuration values
        Raises ValueError if required configs are missing
        """
        if not cls.SECRET_KEY:
            raise ValueError("SECRET_KEY is not set in environment variables")
        
        if not cls.MONGODB_URL:
            raise ValueError("MONGODB_URL is not set in environment variables")


# Create a singleton settings instance
settings = Settings()
