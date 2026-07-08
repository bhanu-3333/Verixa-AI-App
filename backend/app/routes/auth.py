"""
Verixa AI — Auth Routes
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.services.user_service import create_user, login_user, logout_user
from app.utils.response import success_response, created_response, error_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201, summary="Register a new user")
async def register(body: RegisterRequest):
    result = await create_user(body.name, body.email, body.password)
    if "error" in result:
        return error_response(result["error"], status_code=400)
    return created_response("User registered successfully", result)


@router.post("/login", summary="Login and receive a token")
async def login(body: LoginRequest):
    result = await login_user(body.email, body.password)
    if "error" in result:
        return error_response(result["error"], status_code=401)
    return success_response("Login successful", result)


@router.post("/logout", summary="Logout user")
async def logout(user_id: str):
    result = await logout_user(user_id)
    return success_response(result["message"])
