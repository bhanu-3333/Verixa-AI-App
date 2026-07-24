"""
Verixa AI — Emergency Routes (Phase 3: JWT protected)

New endpoints (use these going forward):
  POST   /api/v1/emergency/send                  — send SOS alert
  GET    /api/v1/emergency/history               — latest 20 alerts
  DELETE /api/v1/emergency/history/{alert_id}    — hard-delete an alert

Legacy endpoints (kept for backward compatibility):
  POST   /api/v1/emergency/sos                   — alias → /send
  GET    /api/v1/emergency/contacts/{user_id}
  POST   /api/v1/emergency/contact
  DELETE /api/v1/emergency/contact/{contact_id}
"""

from fastapi import APIRouter, Depends
from app.schemas.emergency import (
    SOSRequest, EmergencyContactRequest, SendSOSRequest,
)
from app.services.emergency_service import (
    trigger_sos, send_sos_alert, get_alert_history, delete_alert,
    add_contact, get_contacts, delete_contact,
)
from app.utils.response import (
    success_response, created_response,
    not_found_response, error_response,
)
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/emergency",
    tags=["Emergency"],
    dependencies=[Depends(get_current_user)],
)


# ── New Phase-3 Endpoints ────────────────────────────────────────────────────


@router.post("/send", status_code=200, summary="Send an SOS emergency alert")
async def send_sos(
    body: SendSOSRequest,
    current_user: dict = Depends(get_current_user),
):
    """Authenticated SOS — user_id is always taken from the JWT, never from the body."""
    user_id = current_user["sub"]
    result = await send_sos_alert(
        user_id=user_id,
        latitude=body.latitude,
        longitude=body.longitude,
        maps_link=body.maps_link,
        emergency_type=body.emergency_type,
    )

    if result["status"] == "success" and result.get("meta_response_id"):
        return success_response(
            message="Emergency WhatsApp alert accepted successfully.",
            data={
                "alert_id": result["alert_id"],
                "record_status": result.get("record_status", "saved"),
                "status": "success",
                "whatsapp_status": "success",
                "delivery_status": "accepted",
                "meta_response_id": result["meta_response_id"],
            },
            status_code=200
        )
    elif result["status"] == "mocked":
        return success_response(
            message="Test Mode: SOS recorded, but no real WhatsApp message was sent.",
            data={
                "alert_id": result["alert_id"],
                "record_status": result.get("record_status", "saved"),
                "status": "mocked",
                "whatsapp_status": "mocked",
                "delivery_status": "mocked",
                "meta_response_id": None,
            },
            status_code=200
        )
    else:
        err_msg = result.get("error_message") or "Emergency alert recorded, but WhatsApp message failed to send."
        return error_response(
            message=f"WhatsApp Alert Failed: {err_msg}",
            status_code=502,
            detail={
                "alert_id": result.get("alert_id"),
                "record_status": result.get("record_status", "saved"),
                "status": "failed",
                "whatsapp_status": "failed",
                "delivery_status": "failed",
                "meta_response_id": None,
                "error_message": err_msg,
            }
        )


@router.get("/history", summary="Get SOS alert history (latest 20)")
async def alert_history(current_user: dict = Depends(get_current_user)):
    """Return the latest 20 alerts for the authenticated user, newest first."""
    user_id = current_user["sub"]
    alerts = await get_alert_history(user_id)
    return success_response("Alert history retrieved", {
        "count":  len(alerts),
        "alerts": alerts,
    })


@router.delete("/history/{alert_id}", summary="Delete an SOS alert")
async def remove_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Hard-delete a single SOS alert. Only the owner can delete their own alerts."""
    user_id = current_user["sub"]
    deleted = await delete_alert(alert_id, user_id)
    if not deleted:
        return not_found_response("Alert")
    return success_response("Alert deleted")


# ── Legacy Endpoints (backward compatibility) ────────────────────────────────


@router.post("/sos", status_code=201, summary="[Legacy] Trigger an SOS alert")
async def sos(body: SOSRequest):
    result = await trigger_sos(
        user_id=body.user_id,
        emergency_type=body.emergency_type,
        message=body.message,
        language=body.language,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    return created_response("SOS triggered", result)


@router.get("/contacts/{user_id}", summary="Get all emergency contacts for a user")
async def list_contacts(user_id: str):
    contacts = await get_contacts(user_id)
    return success_response("Contacts retrieved", {
        "count":    len(contacts),
        "contacts": contacts,
    })


@router.post("/contact", status_code=201, summary="Add an emergency contact")
async def add_emergency_contact(body: EmergencyContactRequest):
    contact = await add_contact(
        user_id=body.user_id,
        name=body.name,
        phone=body.phone,
        relationship=body.relationship,
        is_primary=body.is_primary,
    )
    return created_response("Contact added", contact)


@router.delete("/contact/{contact_id}", summary="Delete an emergency contact")
async def remove_contact(contact_id: str, user_id: str):
    deleted = await delete_contact(contact_id, user_id)
    if not deleted:
        return not_found_response("Contact")
    return success_response("Contact deleted")
