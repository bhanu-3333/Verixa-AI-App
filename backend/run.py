"""
Verixa AI — Server Entry Point
Run with: python run.py
"""

import uvicorn
from app.config.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,       # Auto-reload on file changes (development only)
        log_level="info",
    )
