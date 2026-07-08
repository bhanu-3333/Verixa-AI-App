"""
Verixa AI — Translator Service
Saves translation records to MongoDB.
Actual AI translation wired in Phase 4.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.translation import TranslationDocument
from app.utils.helpers import serialize_doc, serialize_docs
from app.utils.logger import app_logger


async def translate_text(
    text: str,
    source_language: str,
    target_language: str,
    context: str = None,
    user_id: str = None,
) -> dict:
    """
    Save a translation request and return a placeholder result.
    Phase 4: translated_text will be filled by the AI Engine.
    """
    doc = TranslationDocument(
        user_id=user_id,
        original_text=text,
        translated_text="[AI translation — Phase 4]",
        source_language=source_language,
        target_language=target_language,
        context=context,
    )
    result = await db.translations.insert_one(doc.model_dump())
    record_id = str(result.inserted_id)
    app_logger.info(f"Translation saved: {record_id}")
    return {
        "id": record_id,
        "original_text": text,
        "translated_text": "[AI translation — Phase 4]",
        "source_language": source_language,
        "target_language": target_language,
    }


async def get_translation_history(user_id: str) -> list:
    """Retrieve all translations for a given user."""
    cursor = db.translations.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return serialize_docs(docs)


async def delete_translation(record_id: str, user_id: str) -> bool:
    """Delete a specific translation record."""
    from app.utils.helpers import str_to_objectid
    oid = str_to_objectid(record_id)
    result = await db.translations.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count == 1
