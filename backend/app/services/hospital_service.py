"""
Verixa AI — Hospital Service
Manages hospital sessions and chat history in MongoDB.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.hospital import HospitalDocument, SymptomEntry
from app.utils.helpers import serialize_doc, serialize_docs, str_to_objectid
from app.utils.logger import app_logger


async def create_hospital_session(
    user_id: str,
    hospital_name: str,
    department: str,
    symptom: str,
    pain_location: str,
    pain_intensity: int,
    language: str,
) -> dict:
    """Start a new hospital session with initial symptom data."""
    entry = SymptomEntry(
        symptom=symptom,
        pain_location=pain_location,
        pain_intensity=pain_intensity,
    )
    doc = HospitalDocument(
        user_id=user_id,
        hospital_name=hospital_name,
        department=department,
        symptoms=[entry],
        language=language,
    )
    result = await db.hospital_history.insert_one(doc.model_dump())
    session_id = str(result.inserted_id)
    app_logger.info(f"Hospital session created: {session_id}")
    return {"session_id": session_id, "status": "open"}


async def hospital_chat(user_id: str, session_id: str, message: str, language: str) -> dict:
    """
    Append a user message to an existing hospital session.
    Phase 4: assistant reply filled by AI Engine.
    """
    oid = str_to_objectid(session_id)
    user_msg  = {"role": "user",      "content": message,                         "timestamp": datetime.now(timezone.utc).isoformat()}
    bot_reply = {"role": "assistant", "content": "[AI response — Phase 4]",       "timestamp": datetime.now(timezone.utc).isoformat()}

    await db.hospital_history.update_one(
        {"_id": oid, "user_id": user_id},
        {
            "$push": {"chat_messages": {"$each": [user_msg, bot_reply]}},
            "$set":  {"updated_at": datetime.now(timezone.utc)},
        },
    )
    app_logger.info(f"Hospital chat updated: {session_id}")
    return {"session_id": session_id, "response_text": "[AI response — Phase 4]"}


async def get_hospital_history(user_id: str) -> list:
    """Return all hospital sessions for a user, newest first."""
    cursor = db.hospital_history.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return serialize_docs(docs)


async def get_hospital_session(session_id: str, user_id: str) -> dict | None:
    """Fetch a single session."""
    oid = str_to_objectid(session_id)
    doc = await db.hospital_history.find_one({"_id": oid, "user_id": user_id})
    return serialize_doc(doc)


async def delete_hospital_session(session_id: str, user_id: str) -> bool:
    """Remove a session record."""
    oid = str_to_objectid(session_id)
    result = await db.hospital_history.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count == 1
