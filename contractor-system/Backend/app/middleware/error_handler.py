from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger(__name__)


def setup_exception_handlers(app):
    """Setup custom exception handlers for the FastAPI app

    Note: CORSMiddleware (added last in main.py) wraps all responses including error responses,
    so we don't need to manually add CORS headers here.
    """

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Log detailed validation error information
        logger.error("=" * 60)
        logger.error(f"VALIDATION ERROR on {request.method} {request.url.path}")
        logger.error(f"Validation errors: {exc.errors()}")
        
        # Try to log the request body
        try:
            body = await request.body()
            logger.error(f"Request body: {body.decode('utf-8')}")
        except Exception as e:
            logger.error(f"Could not read request body: {e}")
        
        logger.error("=" * 60)
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )
