"""
Verixa AI — Auth Service (thin wrapper around user_service)
Phase 3 will add JWT generation here.
"""

from app.services.user_service import create_user, login_user, logout_user

__all__ = ["create_user", "login_user", "logout_user"]
