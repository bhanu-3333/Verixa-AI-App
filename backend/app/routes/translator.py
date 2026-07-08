"""
Verixa AI — Translator Routes
POST /api/v1/translator/translate
GET  /api/v1/translator/history/{user_id}
"""

from fastapi import APIRouter
from app.schemas.translator import TranslationRequest
from app.services.translator_service import translate_text, get_translation_history
from app.utils.response import success_response, created_response, not_found_response

router = APIRouter(prefix="/translator", tags=["Translator"])


@router.post("/translate", status_code=201, summary="Submit text for translation")
async def translate(body: TranslationRequest):
    result = await translate_text(
        text=body.text,
        source_language=body.source_language,
        target_language=body.target_language,
        context=body.context,
        user_id=body.user_id,
    )
    return created_response("Translation saved", result)


@router.get("/history/{user_id}", summary="Get translation history for a user")
async def translation_history(user_id: str):
    records = await get_translation_history(user_id)
    return success_response("Translation history retrieved", {
        "count": len(records),
        "history": records,
    })
