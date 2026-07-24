"""
Verixa AI — User Service (Phase 3)
Full bcrypt password hashing + JWT token generation.
All Phase 2 function signatures are preserved.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.user import UserDocument
from app.utils.helpers import serialize_doc
from app.utils.logger import app_logger
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_access_token


# ── Internal helper ────────────────────────────────────────────────────────────

def _public(user: dict) -> dict:
    """Strip sensitive fields before returning user data to the client."""
    return {
        "id":                 user.get("id"),
        "name":               user.get("name"),
        "email":              user.get("email"),
        "preferred_language": user.get("preferred_language", "en"),
        "is_active":          user.get("is_active", True),
        "emergency_contact_name":         user.get("emergency_contact_name", ""),
        "emergency_contact_phone":        user.get("emergency_contact_phone", ""),
        "emergency_contact_relationship": user.get("emergency_contact_relationship", ""),
        "created_at":         user.get("created_at"),
    }


# ── Public API ─────────────────────────────────────────────────────────────────

async def create_user(
    name: str,
    email: str,
    password: str,
    emergency_contact_name: str = "",
    emergency_contact_phone: str = "",
    emergency_contact_relationship: str = "",
) -> dict:
    """
    Register a new user.
    - Checks for duplicate email.
    - Hashes password with bcrypt.
    - Returns safe public user dict.
    """
    existing = await db.users.find_one({"email": email})
    if existing:
        return {"error": "Email already registered"}

    doc = UserDocument(
        name=name,
        email=email,
        hashed_password=hash_password(password),   # ← bcrypt
        emergency_contact_name=emergency_contact_name,
        emergency_contact_phone=emergency_contact_phone,
        emergency_contact_relationship=emergency_contact_relationship,
    )
    result = await db.users.insert_one(doc.model_dump())
    app_logger.info(f"User registered: {result.inserted_id}")

    saved = await db.users.find_one({"_id": result.inserted_id})
    return _public(serialize_doc(saved))


async def login_user(email: str, password: str) -> dict:
    """
    Authenticate user and return a signed JWT.
    Returns {"error": "..."} on failure so the route can return proper HTTP codes.
    """
    raw = await db.users.find_one({"email": email})
    if not raw:
        return {"error": "User not found"}

    if not verify_password(password, raw.get("hashed_password", "")):
        return {"error": "Invalid credentials"}

    user = serialize_doc(raw)
    token = create_access_token({
        "sub":   user["id"],
        "email": user["email"],
        "name":  user["name"],
    })

    app_logger.info(f"User logged in: {user['id']}")
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user":         _public(user),
    }


async def logout_user(user_id: str) -> dict:
    """
    Stateless JWT logout — client discards the token.
    Phase 4 option: maintain a token blacklist in Redis.
    """
    app_logger.info(f"User logged out: {user_id}")
    return {"message": "Logged out successfully"}


async def get_user_by_email(email: str) -> dict | None:
    """Fetch a user document by email. Returns serialized dict or None."""
    doc = await db.users.find_one({"email": email})
    return serialize_doc(doc)


async def get_user_by_id(user_id: str) -> dict | None:
    """Fetch a user document by string ID. Returns public dict or None."""
    from app.utils.helpers import str_to_objectid
    try:
        oid = str_to_objectid(user_id)
    except ValueError:
        return None
    doc = await db.users.find_one({"_id": oid})
    if not doc:
        return None
    return _public(serialize_doc(doc))
