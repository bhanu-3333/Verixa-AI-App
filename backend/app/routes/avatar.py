from fastapi import APIRouter, Depends, HTTPException, status
from app.services.avatar_service import AvatarService
from app.utils.dependencies import get_current_user
from app.utils.response import success_response
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/avatar",
    tags=["Avatar"],
    dependencies=[Depends(get_current_user)],  # Secure the endpoints using JWT auth
)

# Instantiate the service singleton
avatar_service = AvatarService()

class SignTranslationRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Text to convert into SiGML"
    )

@router.post("/translate", summary="Translate text query into SiGML XML sequence")
async def translate_to_sigml(body: SignTranslationRequest):
    """
    Translates input text query into a stitched SiGML XML sequence.
    Resolves pre-defined words from sign_map.json and falls back to fingerspelling.
    """
    try:
        sigml_data = avatar_service.translate_text_to_sigml(body.text)
        return success_response("Translation to SiGML XML completed", {
            "sigml": sigml_data
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )
