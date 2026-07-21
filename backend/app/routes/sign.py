# backend/app/routes/sign.py
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.sign import SignRecordRequest, SignPredictRequest
from app.services.sign_service import SignService
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response

router = APIRouter(
    prefix="/sign",
    tags=["Sign Language"],
    dependencies=[Depends(get_current_user)],
)

sign_service = SignService()

# Maximum frame sequence limit to prevent memory abuse
MAX_ALLOWED_FRAMES = 300

@router.post("/record", summary="Record a sign language sequence sample")
async def record_sample(
    body: SignRecordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Saves a sequence of hand landmarks for training the custom gesture model.
    """
    try:
        # Validate sequence length
        if len(body.sequence) > MAX_ALLOWED_FRAMES:
            return error_response(
                message=f"Sequence length ({len(body.sequence)}) exceeds the maximum allowed frames ({MAX_ALLOWED_FRAMES}).",
                status_code=400
            )

        # Convert Pydantic model items to dictionaries for service
        raw_sequence = []
        for frame in body.sequence:
            frame_dict = {}
            if frame.leftHand is not None:
                frame_dict["leftHand"] = [lm.model_dump() for lm in frame.leftHand]
            if frame.rightHand is not None:
                frame_dict["rightHand"] = [lm.model_dump() for lm in frame.rightHand]
            raw_sequence.append(frame_dict)

        result = sign_service.record_sample(body.phrase, raw_sequence)
        return success_response(
            message=f"Sample recorded successfully for phrase: '{body.phrase}'",
            data=result,
            status_code=201
        )
    except ValueError as val_err:
        return error_response(message=str(val_err), status_code=400)
    except Exception as exc:
        return error_response(message=f"Failed to record sample: {str(exc)}", status_code=500)

@router.delete("/record", summary="Delete the latest recorded sample for a phrase")
async def delete_latest_sample(
    phrase: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Deletes the latest recorded sample for a phrase (allows developer re-recording of bad samples).
    """
    try:
        result = sign_service.delete_last_sample(phrase)
        if result["deleted"]:
            return success_response(
                message=f"Latest sample for phrase '{phrase}' deleted successfully.",
                data=result,
                status_code=200
            )
        else:
            return error_response(
                message=f"No samples found for phrase '{phrase}' to delete.",
                status_code=404
            )
    except ValueError as val_err:
        return error_response(message=str(val_err), status_code=400)
    except Exception as exc:
        return error_response(message=f"Failed to delete sample: {str(exc)}", status_code=500)

@router.post("/predict", summary="Predict phrase from a sign language sequence")
async def predict_phrase(
    body: SignPredictRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Classifies a sequence of hand landmarks into one of the 10 predefined phrases.
    """
    try:
        if not body.sequence or len(body.sequence) == 0:
            return error_response(
                message="Sequence is empty. Please provide valid hand landmark frame data.",
                status_code=400
            )

        # Validate sequence length
        if len(body.sequence) > MAX_ALLOWED_FRAMES:
            return error_response(
                message=f"Sequence length ({len(body.sequence)}) exceeds the maximum allowed frames ({MAX_ALLOWED_FRAMES}).",
                status_code=400
            )

        # Convert input sequence
        raw_sequence = []
        for frame in body.sequence:
            frame_dict = {}
            if frame.leftHand is not None:
                frame_dict["leftHand"] = [lm.model_dump() for lm in frame.leftHand]
            if frame.rightHand is not None:
                frame_dict["rightHand"] = [lm.model_dump() for lm in frame.rightHand]
            raw_sequence.append(frame_dict)

        result = sign_service.predict_phrase(raw_sequence)
        return success_response(
            message="Sign language prediction processed successfully.",
            data=result,
            status_code=200
        )
    except Exception as exc:
        return error_response(message=f"Prediction failed: {str(exc)}", status_code=500)

@router.get("/stats", summary="Get data collection progress statistics")
async def get_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns counts of recorded sequences per gesture phrase.
    """
    try:
        result = sign_service.get_stats()
        return success_response(
            message="Sign dataset statistics retrieved.",
            data=result,
            status_code=200
        )
    except Exception as exc:
        return error_response(message=f"Failed to retrieve stats: {str(exc)}", status_code=500)
