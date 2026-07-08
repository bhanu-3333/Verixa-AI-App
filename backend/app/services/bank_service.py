"""
Verixa AI — Bank Service
Manages banking sessions and chat history in MongoDB.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.bank import BankDocument
from app.utils.helpers import serialize_doc, serialize_docs, str_to_objectid
from app.utils.logger import app_logger


async def create_bank_session(
    user_id: str, bank_name: str, service_type: str, language: str
) -> dict:
    """Start a new bank interaction session."""
    doc = BankDocument(
        user_id=user_id,
        bank_name=bank_name,
        service_type=service_type,
        language=language,
    )
    result = await db.bank_history.insert_one(doc.model_dump())
    session_id = str(result.inserted_id)
    app_logger.info(f"Bank session created: {session_id}")
    return {"session_id": session_id, "status": "open"}


async def bank_chat(user_id: str, session_id: str, message: str, language: str) -> dict:
    """Append a message to a bank session. Phase 4: AI fills the reply."""
    oid = str_to_objectid(session_id)
    user_msg  = {"role": "user",      "content": message,                    "timestamp": datetime.now(timezone.utc).isoformat()}
    bot_reply = {"role": "assistant", "content": "[AI response — Phase 4]", "timestamp": datetime.now(timezone.utc).isoformat()}

    await db.bank_history.update_one(
        {"_id": oid, "user_id": user_id},
        {
            "$push": {"chat_messages": {"$each": [user_msg, bot_reply]}},
            "$set":  {"updated_at": datetime.now(timezone.utc)},
        },
    )
    app_logger.info(f"Bank chat updated: {session_id}")
    return {"session_id": session_id, "response_text": "[AI response — Phase 4]"}


async def get_bank_history(user_id: str) -> list:
    """Return all bank sessions for a user."""
    cursor = db.bank_history.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return serialize_docs(docs)


async def delete_bank_session(session_id: str, user_id: str) -> bool:
    oid = str_to_objectid(session_id)
    result = await db.bank_history.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count == 1
