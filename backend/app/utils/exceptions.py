"""
Verixa AI — Global Exception Handlers
Registered on the FastAPI app in main.py so every unhandled
error returns a clean JSON envelope instead of an HTML traceback.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import PyMongoError
from app.utils.logger import app_logger


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors → 422 with readable field errors."""
    errors = [
        {"field": ".".join(str(l) for l in e["loc"]), "message": e["msg"]}
        for e in exc.errors()
    ]
    app_logger.warning(f"Validation error on {request.url}: {errors}")
    return JSONResponse(
        status_code=422,
        content={"status": "error", "message": "Validation failed", "detail": errors},
    )


async def pymongo_exception_handler(request: Request, exc: PyMongoError):
    """Handle all MongoDB driver errors → 500."""
    app_logger.error(f"Database error on {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": "Database error", "detail": str(exc)},
    )


async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for any unhandled exception → 500."""
    app_logger.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": "Internal server error"},
    )
