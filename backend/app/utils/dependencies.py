"""
Verixa AI — FastAPI Auth Dependencies (Phase 3)

Usage in any protected route:
    from app.utils.dependencies import get_current_user

    @router.get("/me")
    async def me(current_user: dict = Depends(get_current_user)):
        return current_user
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.utils.jwt import decode_access_token
from app.utils.logger import app_logger

# HTTPBearer extracts the "Bearer <token>" header automatically
_bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    FastAPI dependency — validates the Bearer JWT and returns the token payload.

    Raises:
        401  if token is missing, malformed, or expired.

    Returns:
        dict with at least {"sub": user_id, "email": ..., "name": ...}
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload                # pass the whole payload down to the route
    except JWTError as exc:
        app_logger.warning(f"JWT validation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
