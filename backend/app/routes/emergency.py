"""
Verixa AI — Emergency Routes (Phase 3: JWT protected)

POST   /api/v1/emergency/sos                    — requires Bearer token
GET    /api/v1/emergency/contacts/{user_id}     — requires Bearer token
POST   /api/v1/emergency/contact                — requires Bearer token
DELETE /api/v1/emergency/contact/{contact_id}   — requires Bearer token
"""

from fastapi import APIRouter, Depends
from app.schemas.emergency import SOSRequest, EmergencyContactRequest
from app.services.emergency_service import (
    trigger_sos, add_contact, get_contacts, delete_contact,
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


@router.post("/sos", status_code=201, summary="Trigger an SOS emergency alert")
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
