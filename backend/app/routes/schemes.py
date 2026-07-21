# backend/app/routes/schemes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.services.scheme_service import SchemeService
from app.utils.dependencies import get_current_user
from app.utils.response import success_response, error_response

router = APIRouter(
    prefix="/schemes",
    tags=["Government Schemes & Benefits"],
    dependencies=[Depends(get_current_user)],
)

@router.get("", summary="Get government schemes and welfare benefits")
async def list_schemes(
    category: Optional[str] = Query(None, description="Filter by category (financial, education, employment, assistive_devices, healthcare, travel, social_welfare, certification)"),
    government_level: Optional[str] = Query(None, description="Filter by government level (central, state_tn)"),
    disability_type: Optional[str] = Query(None, description="Filter by disability category"),
    search: Optional[str] = Query(None, description="Free text search in name, description, department"),
    language: Optional[str] = Query("en", description="Language preference (en or ta)")
):
    """
    Retrieve curated, verified government schemes for persons with disabilities.
    """
    try:
        schemes = await SchemeService.get_schemes(
            category=category,
            government_level=government_level,
            disability_type=disability_type,
            search=search,
            language=language
        )
        return success_response(
            message=f"Retrieved {len(schemes)} government schemes.",
            data=schemes,
            status_code=200
        )
    except Exception as exc:
        return error_response(message=f"Failed to fetch schemes: {str(exc)}", status_code=500)

@router.get("/{scheme_id}", summary="Get detailed information for a specific scheme")
async def get_scheme_detail(
    scheme_id: str,
    language: Optional[str] = Query("en", description="Language preference (en or ta)")
):
    """
    Retrieve full eligibility, benefits, required documents, and official URLs for a scheme.
    """
    try:
        scheme = await SchemeService.get_scheme_by_id(scheme_id)
        if not scheme:
            return error_response(
                message=f"Scheme with ID '{scheme_id}' not found.",
                status_code=404
            )
        return success_response(
            message="Scheme details retrieved.",
            data=scheme,
            status_code=200
        )
    except Exception as exc:
        return error_response(message=f"Failed to fetch scheme details: {str(exc)}", status_code=500)
