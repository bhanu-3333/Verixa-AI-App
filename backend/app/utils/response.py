"""
Response Utilities
Standardized response helpers for consistent API output format
"""

from typing import Any, Optional


def success_response(message: str, data: Any = None) -> dict:
    """
    Build a standardized success response
    Usage: return success_response("User created", {"user_id": "..."})
    """
    response = {
        "status": "success",
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return response


def error_response(message: str, detail: Optional[str] = None) -> dict:
    """
    Build a standardized error response
    Usage: return error_response("User not found", "No user with that email")
    """
    response = {
        "status": "error",
        "message": message,
    }
    if detail is not None:
        response["detail"] = detail
    return response
