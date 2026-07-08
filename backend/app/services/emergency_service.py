"""
Verixa AI — Emergency Service
SOS event logging + Emergency Contact CRUD.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.emergency import EmergencyContactDocument
from app.models.chat import ChatDocument, ChatMessage
from app.utils.helpers import serialize_doc, serialize_docs, str_to_objectid
from app.utils.logger import app_logger


# ── SOS ───────────────────────────────────────────────────────────────────────

async def trigger_sos(
    user_id: str,
    emergency_type: str,
    message: str,
    language: str,
    latitude: float = None,
    longitude: float = None,
) -> dict:
    """
    Log an SOS event to chat_history and return a session ID.
    Phase 4: Sends alert to emergency contacts + AI triage.
    """
    location = None
    if latitude is not None and longitude is not None:
        location = {"latitude": latitude, "longitude": longitude}

    chat_doc = ChatDocument(
        user_id=user_id,
        module="emergency",
        messages=[ChatMessage(role="user", content=message)],
        source_language=language,
        target_language="en",
    )
    payload = chat_doc.model_dump()
    payload["emergency_type"] = emergency_type
    payload["location"]       = location

    result = await db.chat_history.insert_one(payload)
    session_id = str(result.inserted_id)
    app_logger.warning(f"SOS triggered: {session_id} | type={emergency_type} | user={user_id}")
    return {
        "session_id":     session_id,
        "emergency_type": emergency_type,
        "location":       location,
    }


# ── Emergency Contacts CRUD ───────────────────────────────────────────────────

async def add_contact(
    user_id: str, name: str, phone: str,
    relationship: str = None, is_primary: bool = False
) -> dict:
    """Insert a new emergency contact."""
    doc = EmergencyContactDocument(
        user_id=user_id, name=name, phone=phone,
        relationship=relationship, is_primary=is_primary,
    )
    result = await db.emergency_contacts.insert_one(doc.model_dump())
    contact_id = str(result.inserted_id)
    app_logger.info(f"Emergency contact added: {contact_id}")
    inserted = await db.emergency_contacts.find_one({"_id": result.inserted_id})
    return serialize_doc(inserted)


async def get_contacts(user_id: str) -> list:
    """Return all emergency contacts for a user."""
    cursor = db.emergency_contacts.find({"user_id": user_id}).sort("is_primary", -1)
    docs = await cursor.to_list(length=50)
    return serialize_docs(docs)


async def get_contact(contact_id: str, user_id: str) -> dict | None:
    """Fetch a single contact."""
    oid = str_to_objectid(contact_id)
    doc = await db.emergency_contacts.find_one({"_id": oid, "user_id": user_id})
    return serialize_doc(doc)


async def delete_contact(contact_id: str, user_id: str) -> bool:
    """Delete a contact by ID."""
    oid = str_to_objectid(contact_id)
    result = await db.emergency_contacts.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count == 1
