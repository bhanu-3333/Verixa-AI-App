"""
Verixa AI — Standardised Response Helpers
Every API handler returns via one of these helpers to guarantee
a consistent envelope: { status, message, data? }
"""

from typing import Any, Optional
from fastapi.responses import JSONResponse


def success_response(message: str, data: Any = None, status_code: int = 200) -> JSONResponse:
    body = {"status": "success", "message": message}
    if data is not None:
        body["data"] = data
    return JSONResponse(status_code=status_code, content=body)


def created_response(message: str, data: Any = None) -> JSONResponse:
    return success_response(message, data, status_code=201)


def error_response(message: str, detail: Any = None, status_code: int = 400) -> JSONResponse:
    body = {"status": "error", "message": message}
    if detail is not None:
        body["detail"] = detail
    return JSONResponse(status_code=status_code, content=body)


def not_found_response(resource: str = "Resource") -> JSONResponse:
    return error_response(f"{resource} not found", status_code=404)


def server_error_response(detail: str = "Internal server error") -> JSONResponse:
    return error_response("Internal server error", detail=detail, status_code=500)
