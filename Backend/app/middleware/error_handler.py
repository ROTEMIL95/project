from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """Add CORS headers to a response"""
    origin = request.headers.get("origin")
    cors_origins = settings.cors_origins_list
    
    # Check if origin is in allowed origins
    if origin and origin in cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "*"
        response.headers["Vary"] = "Origin"
    elif "*" in cors_origins:
        # If wildcard is allowed (not recommended with credentials)
        response.headers["Access-Control-Allow-Origin"] = "*"
    
    return response


async def error_handler_middleware(request: Request, call_next):
    """Global error handling middleware"""
    try:
        response = await call_next(request)
        # Ensure CORS headers are present on all responses
        if isinstance(response, JSONResponse):
            response = add_cors_headers(response, request)
        return response
    except Exception as exc:
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        error_response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )
        return add_cors_headers(error_response, request)


def setup_exception_handlers(app):
    """Setup custom exception handlers for the FastAPI app"""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        response = JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
        return add_cors_headers(response, request)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        response = JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )
        return add_cors_headers(response, request)

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )
        return add_cors_headers(response, request)
