"""
Verixa AI — Auth Routes (Phase 3)

Public endpoints (no token needed):
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/logout

Protected endpoint (Bearer token required):
  GET  /api/v1/auth/me
"""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.user_service import (
    create_user, login_user, logout_user, get_user_by_id,
)
from app.utils.response import (
    success_response, created_response,
    error_response, not_found_response,
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Register ──────────────────────────────────────────────────────────────────
@router.post(
    "/register",
    status_code=201,
    summary="Register a new user",
    responses={
        201: {"description": "User created"},
        400: {"description": "Email already registered"},
    },
)
async def register(body: RegisterRequest):
    result = await create_user(body.name, body.email, body.password)
    if "error" in result:
        return error_response(result["error"], status_code=400)
    return created_response("User registered successfully", {"user": result})


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    summary="Login and receive a JWT token",
    responses={
        200: {"description": "Login successful — returns access_token"},
        401: {"description": "Invalid credentials"},
    },
)
async def login(body: LoginRequest):
    result = await login_user(body.email, body.password)
    if "error" in result:
        return error_response(result["error"], status_code=401)

    # Return flat JWT response: { access_token, token_type, user }
    return JSONResponse(status_code=200, content={
        "access_token": result["access_token"],
        "token_type":   result["token_type"],
        "user":         result["user"],
    })


# ── Logout ────────────────────────────────────────────────────────────────────
@router.post(
    "/logout",
    summary="Logout (client should discard the token)",
)
async def logout(user_id: str):
    result = await logout_user(user_id)
    return success_response(result["message"])


# ── Current User (PROTECTED) ──────────────────────────────────────────────────
@router.get(
    "/me",
    summary="Get currently authenticated user",
    responses={
        200: {"description": "Current user info"},
        401: {"description": "Missing or invalid Bearer token"},
        404: {"description": "User not found"},
    },
)
async def me(token_payload: dict = Depends(get_current_user)):
    """
    Returns the user profile of the currently authenticated user.
    Requires:  Authorization: Bearer <token>
    """
    user_id = token_payload.get("sub")
    user = await get_user_by_id(user_id)
    if not user:
        return not_found_response("User")
    return success_response("Current user retrieved", {"user": user})
