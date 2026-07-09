"""
Verixa AI — Hospital Routes (Phase 3: JWT protected)

POST /api/v1/hospital/symptoms          — requires Bearer token
POST /api/v1/hospital/chat              — requires Bearer token
GET  /api/v1/hospital/history/{user_id} — requires Bearer token
"""

from fastapi import APIRouter, Depends
from app.schemas.hospital import SymptomRequest, HospitalChatRequest
from app.services.hospital_service import (
    create_hospital_session, hospital_chat, get_hospital_history,
)
from app.utils.response import success_response, created_response
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/hospital",
    tags=["Hospital"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/symptoms", status_code=201, summary="Start a hospital session with symptoms")
async def submit_symptoms(body: SymptomRequest):
    result = await create_hospital_session(
        user_id=body.user_id,
        hospital_name=body.hospital_name,
        department=body.department,
        symptom=body.symptom,
        pain_location=body.pain_location,
        pain_intensity=body.pain_intensity,
        language=body.language,
    )
    return created_response("Hospital session created", result)


@router.post("/chat", summary="Send a message in a hospital session")
async def hospital_chat_endpoint(body: HospitalChatRequest):
    result = await hospital_chat(
        user_id=body.user_id,
        session_id=body.session_id,
        message=body.message,
        language=body.language,
    )
    return success_response("Message sent", result)


@router.get("/history/{user_id}", summary="Get hospital session history for a user")
async def hospital_history(user_id: str):
    records = await get_hospital_history(user_id)
    return success_response("Hospital history retrieved", {
        "count": len(records),
        "history": records,
    })
