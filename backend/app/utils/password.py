"""
Verixa AI — Password Utilities (Phase 3)
bcrypt hashing and verification via passlib.
Plain text passwords are NEVER stored.
"""

from passlib.context import CryptContext

# bcrypt is the hashing scheme — auto handles salting internally
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash a plain-text password. Returns a bcrypt hash string."""
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    return _pwd_ctx.verify(plain, hashed)
