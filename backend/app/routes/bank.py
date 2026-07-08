"""
Verixa AI — Bank Routes
POST /api/v1/bank/service
POST /api/v1/bank/chat
GET  /api/v1/bank/history/{user_id}
"""

from fastapi import APIRouter
from app.schemas.bank import BankServiceRequest, BankChatRequest
from app.services.bank_service import create_bank_session, bank_chat, get_bank_history
from app.utils.response import success_response, created_response

router = APIRouter(prefix="/bank", tags=["Bank"])


@router.post("/service", status_code=201, summary="Start a bank interaction session")
async def bank_service(body: BankServiceRequest):
    result = await create_bank_session(
        user_id=body.user_id,
        bank_name=body.bank_name,
        service_type=body.service_type,
        language=body.language,
    )
    return created_response("Bank session created", result)


@router.post("/chat", summary="Send a message in a bank session")
async def bank_chat_endpoint(body: BankChatRequest):
    result = await bank_chat(
        user_id=body.user_id,
        session_id=body.session_id,
        message=body.message,
        language=body.language,
    )
    return success_response("Message sent", result)


@router.get("/history/{user_id}", summary="Get bank session history for a user")
async def bank_history(user_id: str):
    records = await get_bank_history(user_id)
    return success_response("Bank history retrieved", {
        "count": len(records),
        "history": records,
    })
