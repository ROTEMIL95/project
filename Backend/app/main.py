from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.middleware.error_handler import setup_exception_handlers
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Contractor Management System API",
    description="Backend API for contractor expense calculation system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Get CORS origins list
cors_origins = settings.cors_origins_list

# Log CORS configuration at startup
logger.info("=" * 60)
logger.info("CORS Configuration:")
logger.info(f"  Allowed Origins: {cors_origins}")
logger.info(f"  Number of origins: {len(cors_origins)}")
logger.info("=" * 60)


class CORSEnforcementMiddleware(BaseHTTPMiddleware):
    """Middleware to ensure CORS headers are always present on all responses"""
    
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        origin_allowed = origin and origin in cors_origins
        
        # Handle OPTIONS preflight requests explicitly
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if origin_allowed:
                # Add CORS headers for allowed origins
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "*"
                response.headers["Access-Control-Max-Age"] = "3600"
            # Always return 200 for OPTIONS, even if origin not allowed
            # Browser will block the actual request if origin not allowed
            return response
        
        # Process the request
        response = await call_next(request)
        
        # Ensure CORS headers are present on all responses for allowed origins
        if origin_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "*"
        
        return response


# Add CORS enforcement middleware FIRST (outermost layer)
# This ensures CORS headers are always present, even if CORSMiddleware fails
app.add_middleware(CORSEnforcementMiddleware)

# CORS Configuration - applies to ALL routes automatically
# This middleware handles preflight OPTIONS requests for all endpoints
# including: /, /health, /api/*, /docs, /redoc, etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers (Authorization, Content-Type, etc.)
    expose_headers=["*"],  # Expose all headers to the client
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Setup exception handlers
setup_exception_handlers(app)

# Import Routers
from app.routers import (
    auth, quotes, clients, catalog, projects,
    templates, financial, contractor_pricing, inquiries
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["Quotes"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["Catalog"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(financial.router, prefix="/api/financial", tags=["Financial"])
app.include_router(contractor_pricing.router, prefix="/api/contractor-pricing", tags=["Contractor Pricing"])
app.include_router(inquiries.router, prefix="/api/inquiries", tags=["Inquiries"])


@app.get("/")
async def root():
    """Root endpoint - CORS enabled via middleware for all configured origins"""
    return {
        "message": "Contractor Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint - CORS enabled via middleware for all configured origins"""
    return {"status": "healthy"}


@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    """Global OPTIONS handler for all routes - handles preflight requests"""
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "3600",
            }
        )
    return Response(status_code=200)


@app.get("/api/debug/cors")
async def debug_cors(request: Request):
    """Debug endpoint to check CORS configuration (for troubleshooting)
    
    CORS middleware automatically applies to this and all other routes.
    The middleware handles OPTIONS preflight requests automatically.
    """
    origin = request.headers.get("origin", "Not provided")
    return {
        "cors_origins": settings.cors_origins_list,
        "cors_origins_count": len(settings.cors_origins_list),
        "cors_origins_raw": settings.CORS_ORIGINS,
        "request_origin": origin,
        "origin_allowed": origin in settings.cors_origins_list if origin != "Not provided" else None,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
        "note": "CORS middleware applies to ALL routes automatically, including all /api/* endpoints"
    }
