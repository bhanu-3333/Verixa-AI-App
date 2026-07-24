"""
Verixa AI — Emergency Service
SOS event logging + Emergency Contact CRUD.
"""

from datetime import datetime, timezone
from app.database.database import db
from app.models.emergency import EmergencyAlertDocument, EmergencyContactDocument
from app.models.chat import ChatDocument, ChatMessage
from app.utils.helpers import serialize_doc, serialize_docs, str_to_objectid
from app.utils.logger import app_logger
from app.services.sms_service import SMSService

async def trigger_sos(
    user_id: str,
    emergency_type: str,
    message: str,
    language: str,
    latitude: float = None,
    longitude: float = None,
) -> dict:
    """Create an SOS alert, store it, and notify the primary emergency contact.

    Steps:
    1. Persist chat history (legacy behavior).
    2. Store an EmergencyAlertDocument in `emergency_alerts`.
    3. Retrieve the primary emergency contact for the user.
    4. Send an SMS via SMSService (mocked if no provider).
    5. Return identifiers and location info.
    """
    # 1. Log chat entry (existing behavior)
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
    chat_payload = chat_doc.model_dump()
    chat_payload["emergency_type"] = emergency_type
    chat_payload["location"] = location
    chat_res = await db.chat_history.insert_one(chat_payload)
    session_id = str(chat_res.inserted_id)

    # 2. Store SOS alert document
    maps_link = None
    if latitude is not None and longitude is not None:
        from app.services.whatsapp_service import WhatsAppService
        maps_link = WhatsAppService.build_maps_url(latitude, longitude)
    alert_doc = EmergencyAlertDocument(
        user_id=user_id,
        latitude=latitude or 0.0,
        longitude=longitude or 0.0,
        maps_link=maps_link or "",
        emergency_type=emergency_type,
    )
    alert_res = await db.emergency_alerts.insert_one(alert_doc.model_dump())
    alert_id = str(alert_res.inserted_id)

    # 3. Fetch primary emergency contact (if any)
    primary_contact = await db.emergency_contacts.find_one({"user_id": user_id, "is_primary": True})
    if primary_contact:
        contact = serialize_doc(primary_contact)
        phone = contact.get("phone")
        if phone:
            sms_message = (
                f"🚨 EMERGENCY ALERT\nUser ID: {user_id}\nType: {emergency_type}\nLocation: {maps_link or 'N/A'}"
            )
            SMSService().send_sms(to=phone, message=sms_message)

    app_logger.warning(
        f"SOS triggered: {session_id} | alert_id={alert_id} | type={emergency_type} | user={user_id}"
    )
    return {
        "session_id": session_id,
        "alert_id": alert_id,
        "emergency_type": emergency_type,
        "location": location,
        "maps_link": maps_link,
    }



# ── New Phase-3 service functions (JWT-based endpoints) ───────────────────────

async def send_sos_alert(
    user_id: str,
    latitude: float,
    longitude: float,
    maps_link: str,
    emergency_type: str,
) -> dict:
    """Create and persist an SOS alert using the authenticated user's identity.

    Steps:
    1. Build and insert an EmergencyAlertDocument (status=pending).
    2. Look up the user's registered emergency contact from the users collection.
    3. Send SMS via SMSService (mock if no provider configured).
    4. Update the alert status to 'sent' or 'failed'.
    5. Return alert_id + final status.
    """
    # 1. Persist the alert with status=pending and record_status=saved
    alert_doc = EmergencyAlertDocument(
        user_id=user_id,
        latitude=latitude,
        longitude=longitude,
        maps_link=maps_link,
        emergency_type=emergency_type,
        status="pending",
        record_status="saved",
    )
    insert_result = await db.emergency_alerts.insert_one(alert_doc.model_dump())
    alert_id = str(insert_result.inserted_id)

    # 2. Fetch emergency contact from the user profile
    user = await db.users.find_one({"_id": str_to_objectid(user_id)})
    contact_phone = None
    contact_name = None
    if user:
        contact_phone = user.get("emergency_contact_phone")
        contact_name = user.get("emergency_contact_name", "Emergency Contact")

    # 3. Build Maps URL + send WhatsApp alert (official Cloud API)
    from app.services.whatsapp_service import WhatsAppService
    final_maps_link = maps_link or WhatsAppService.build_maps_url(latitude, longitude)

    whatsapp_status = "failed"
    delivery_status = "failed"
    meta_response_id = None
    error_message = None

    if contact_phone:
        user_name = user.get("name", "A Verixa user") if user else "A Verixa user"
        try:
            ws = WhatsAppService()
            ws_res = ws.send_whatsapp_alert(
                to_phone=contact_phone,
                user_name=user_name,
                latitude=latitude,
                longitude=longitude,
                maps_link=final_maps_link,
                emergency_type=emergency_type,
            )
            whatsapp_status = ws_res.get("status", "failed")
            delivery_status = ws_res.get("delivery_status", "failed")
            meta_response_id = ws_res.get("meta_response_id")
            if whatsapp_status not in ("success", "mocked"):
                error_message = ws_res.get("message", "WhatsApp alert sending failed.")
        except Exception as e:
            whatsapp_status = "failed"
            delivery_status = "failed"
            meta_response_id = None
            error_message = str(e)
            app_logger.error(f"WhatsApp sending exception for alert {alert_id}: {str(e)}")
    else:
        whatsapp_status = "failed"
        delivery_status = "failed"
        error_message = "No emergency contact phone registered on user profile."
        app_logger.warning(f"SOS alert {alert_id}: No emergency contact phone.")

    # 4. Strict overall status mapping:
    # "success" -> ONLY if WhatsApp call succeeded and meta_response_id is present
    # "mocked"  -> IF in dev mock mode
    # "failed"  -> for ALL other errors
    if whatsapp_status == "success" and meta_response_id:
        overall_status = "success"
        delivery_status = "accepted"
    elif whatsapp_status == "mocked":
        overall_status = "mocked"
        delivery_status = "mocked"
    else:
        overall_status = "failed"
        delivery_status = "failed"

    await db.emergency_alerts.update_one(
        {"_id": insert_result.inserted_id},
        {"$set": {
            "status":           overall_status,
            "record_status":    "saved",
            "whatsapp_status":  whatsapp_status,
            "delivery_status":  delivery_status,
            "meta_response_id": meta_response_id,
            "error_message":    error_message,
            "maps_link":        final_maps_link,
        }},
    )

    app_logger.warning(
        f"SOS alert processed: alert_id={alert_id} | type={emergency_type} | "
        f"user={user_id} | whatsapp_status={whatsapp_status} | overall_status={overall_status} | "
        f"delivery_status={delivery_status} | meta_id={meta_response_id}"
    )
    return {
        "alert_id": alert_id,
        "record_status": "saved",
        "status": overall_status,
        "whatsapp_status": whatsapp_status,
        "delivery_status": delivery_status,
        "meta_response_id": meta_response_id,
        "error_message": error_message,
    }


async def get_alert_history(user_id: str) -> list:
    """Return the latest 20 SOS alerts for a user, newest first."""
    cursor = (
        db.emergency_alerts
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(20)
    )
    docs = await cursor.to_list(length=20)
    return serialize_docs(docs)


async def delete_alert(alert_id: str, user_id: str) -> bool:
    """Hard-delete a single SOS alert. Returns True if a document was removed."""
    oid = str_to_objectid(alert_id)
    result = await db.emergency_alerts.delete_one({"_id": oid, "user_id": user_id})
    return result.deleted_count == 1


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
