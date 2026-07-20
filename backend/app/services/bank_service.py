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
    """Append a message to a bank session with dynamic contextual replies."""
    oid = str_to_objectid(session_id)
    session = await db.bank_history.find_one({"_id": oid, "user_id": user_id})
    service_type = session.get("service_type", "other") if session else "other"

    # Contextual dynamic replies
    reply = ""
    msg_lower = message.lower()
    
    if language == "ta":
        if "hello" in msg_lower or "வணக்கம்" in msg_lower:
            reply = "வணக்கம்! நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?"
        elif "உதவி" in msg_lower or "help" in msg_lower:
            reply = "கண்டிப்பாக, உங்களுக்கு உதவ நான் தயாராக உள்ளேன். தயவுசெய்து உங்கள் கேள்வியைக் கேளுங்கள்."
        elif "status" in msg_lower or "நிலை" in msg_lower:
            reply = "உங்கள் கோரிக்கை பரிசீலனையில் உள்ளது. விரைவில் அது செயல்படுத்தப்படும்."
        elif "thank" in msg_lower or "நன்றி" in msg_lower:
            reply = "நன்றி! உங்களுக்கு வேறு ஏதேனும் உதவி தேவையா?"
        else:
            # Service-specific fallbacks in Tamil
            if service_type == "Create Account":
                reply = "உங்கள் கணக்கு உருவாக்கும் விவரங்கள் சரிபார்க்கப்பட்டு வருகின்றன. விரைவில் புதிய கணக்கு திறக்கப்படும்."
            elif service_type == "Fund Transfer":
                reply = "நிதி பரிமாற்றம் பாதுகாப்பாக மேற்கொள்ளப்பட்டு வருகிறது. பரிவர்த்தனை முடிந்ததும் உங்களுக்கு அறிவிக்கப்படும்."
            elif service_type == "Block ATM":
                reply = "உங்கள் பாதுகாப்பு கருதி ATM அட்டை உடனடியாக முடக்கப்படும். புதிய அட்டைக்கு நீங்கள் விண்ணப்பிக்கலாம்."
            else:
                reply = "புரிந்தது. உங்கள் கோரிக்கை குறித்து வங்கி அதிகாரிகளுக்கு தகவல் அனுப்பப்பட்டுள்ளது."
    else:
        if "hello" in msg_lower or "hi" in msg_lower:
            reply = "Hello! How can I help you today?"
        elif "help" in msg_lower or "assist" in msg_lower:
            reply = "Sure, I am here to help you. Please ask your question."
        elif "status" in msg_lower:
            reply = "Your request is currently processing. We will update you shortly."
        elif "thank" in msg_lower:
            reply = "You're welcome! Let me know if you need anything else."
        else:
            # Service-specific fallbacks in English
            if service_type == "Create Account":
                reply = "We are verifying your account registration details. Your new account will be ready shortly."
            elif service_type == "Fund Transfer":
                reply = "The fund transfer is being processed securely. You will receive a confirmation once complete."
            elif service_type == "Block ATM":
                reply = "Your ATM card is being blocked for safety. You can request a replacement card anytime."
            else:
                reply = "Understood. I have recorded your request and forwarded it to our banking operations team."

    user_msg  = {"role": "user",      "content": message, "timestamp": datetime.now(timezone.utc).isoformat()}
    bot_reply = {"role": "assistant", "content": reply,   "timestamp": datetime.now(timezone.utc).isoformat()}

    await db.bank_history.update_one(
        {"_id": oid, "user_id": user_id},
        {
            "$push": {"chat_messages": {"$each": [user_msg, bot_reply]}},
            "$set":  {"updated_at": datetime.now(timezone.utc)},
        },
    )
    app_logger.info(f"Bank chat updated: {session_id}")
    return {"session_id": session_id, "response_text": reply}


async def complete_bank_session(
    user_id: str,
    session_id: str,
    service_type: str,
    form_data: dict,
    chat_history: list,
    language: str
) -> dict:
    """Store form details, update chat history, and mark the bank session as completed."""
    oid = str_to_objectid(session_id)
    
    # Store standard fields and mark status as completed
    await db.bank_history.update_one(
        {"_id": oid, "user_id": user_id},
        {
            "$set": {
                "status": "completed",
                "service_type": service_type,
                "form_data": form_data,
                "chat_messages": chat_history,
                "language": language,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    app_logger.info(f"Bank session completed: {session_id}")
    return {"session_id": session_id, "status": "completed"}



async def get_bank_history(user_id: str) -> list:
    """Return all bank sessions for a user."""
    cursor = db.bank_history.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return serialize_docs(docs)


async def delete_bank_session(session_id: str, user_id: str) -> bool:
    oid = str_to_objectid(session_id)
    result = await db.bank_history.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count == 1
