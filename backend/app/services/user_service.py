"""
Verixa AI — User Service
CRUD operations for the `users` collection.
Authentication logic (hashing, JWT) added in Phase 3.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.user import UserDocument
from app.utils.helpers import serialize_doc, serialize_docs
from app.utils.logger import app_logger


async def create_user(name: str, email: str, password: str) -> dict:
    """
    Insert a new user document.
    Phase 3: password will be hashed before storage.
    """
    # Check duplicate email
    existing = await db.users.find_one({"email": email})
    if existing:
        return {"error": "Email already registered"}

    doc = UserDocument(name=name, email=email, hashed_password=password)
    result = await db.users.insert_one(doc.model_dump())
    app_logger.info(f"User created: {result.inserted_id}")
    return {"id": str(result.inserted_id), "name": name, "email": email}


async def get_user_by_email(email: str) -> dict | None:
    """Fetch a user document by email."""
    doc = await db.users.find_one({"email": email})
    return serialize_doc(doc)


async def get_user_by_id(user_id: str) -> dict | None:
    """Fetch a user document by string ID."""
    from app.utils.helpers import str_to_objectid
    try:
        oid = str_to_objectid(user_id)
    except ValueError:
        return None
    doc = await db.users.find_one({"_id": oid})
    return serialize_doc(doc)


async def login_user(email: str, password: str) -> dict:
    """
    Validate credentials.
    Phase 3: will compare hashed password and return a real JWT.
    """
    user = await get_user_by_email(email)
    if not user:
        return {"error": "User not found"}
    # Placeholder credential check — Phase 3 replaces with bcrypt
    if user.get("hashed_password") != password:
        return {"error": "Invalid credentials"}
    return {"message": "Login successful (placeholder)", "user_id": user["id"]}


async def logout_user(user_id: str) -> dict:
    """Placeholder logout — Phase 3 invalidates token."""
    return {"message": "Logged out successfully"}
