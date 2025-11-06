from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
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


# CRITICAL: In FastAPI/Starlette, middleware executes in REVERSE order
# The LAST middleware added runs FIRST (outermost layer)
# CORSMiddleware MUST be added LAST to intercept OPTIONS/preflight before auth dependencies

# Setup exception handlers FIRST (they run LAST, innermost layer)
setup_exception_handlers(app)


# Add startup event to verify CORS configuration
@app.on_event("startup")
async def startup_event():
    """Log CORS configuration at startup"""
    logger.info("=" * 60)
    logger.info("Application Startup:")
    logger.info(f"  CORS Origins: {cors_origins}")
    logger.info(f"  Frontend Origin Check: https://calculatesmartil.netlify.app in list = {('https://calculatesmartil.netlify.app' in cors_origins)}")
    logger.info("  CORS Handling: FastAPI CORSMiddleware (last added = first to run)")
    logger.info("=" * 60)

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




@app.get("/api/debug/cors")
async def debug_cors(request: Request):
    """Debug endpoint to check CORS configuration (for troubleshooting)

    CORSMiddleware is added last, so it runs first and handles all OPTIONS preflight requests.
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
        "note": "CORSMiddleware handles all preflight OPTIONS requests before they reach auth dependencies"
    }


# CRITICAL: Add CORSMiddleware LAST so it runs FIRST (outermost layer)
# This ensures OPTIONS/preflight requests are intercepted before hitting authentication dependencies
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers (Authorization, Content-Type, etc.)
    expose_headers=["*"],  # Expose all headers to the client
    max_age=3600,  # Cache preflight requests for 1 hour
)
