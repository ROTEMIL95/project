from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.error_handler import setup_exception_handlers
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="Contractor Management System API",
    description="Backend API for contractor expense calculation system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """Root endpoint"""
    return {
        "message": "Contractor Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
