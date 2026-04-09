"""
FastAPI Backend for Sistema Clínico Digital Interoperable Corte 2
HL7 FHIR R4, double API-Key auth, PostgreSQL, MinIO
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from contextlib import asynccontextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routers and utilities
from config import settings
from db import init_db
from routers import fhir, auth, admin, admin_users

# Middleware for API-Key validation
async def validate_api_keys(
    request: Request,
    x_access_key: str = Header(None),
    x_permission_key: str = Header(None)
):
    """Validate double API-Key on all endpoints except auth"""
    if request.url.path.startswith("/auth/") or request.url.path == "/docs" or request.url.path == "/openapi.json":
        return {"access_key": x_access_key, "permission_key": x_permission_key}
    
    if not x_access_key or not x_permission_key:
        raise HTTPException(
            status_code=401,
            detail="Missing X-Access-Key or X-Permission-Key headers"
        )
    
    # Validate keys against database (simplified check)
    # In production, validate against users table
    if x_access_key != settings.DEFAULT_ACCESS_KEY or x_permission_key not in ["admin", "medico", "paciente"]:
        raise HTTPException(
            status_code=403,
            detail="Invalid API keys"
        )
    
    return {"access_key": x_access_key, "permission_key": x_permission_key, "role": x_permission_key}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🚀 Initializing Sistema Clínico Digital...")
    await init_db()
    logger.info("✅ Database initialized")
    yield
    # Shutdown
    logger.info("🛑 Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Sistema Clínico Digital Interoperable",
    description="HL7 FHIR R4 • ML/DL cuantizado • Corte 2",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(fhir.router, prefix="/fhir", tags=["FHIR"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(admin_users.router, prefix="/admin/users", tags=["Admin Users"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "backend",
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Sistema Clínico Digital Interoperable - Corte 2",
        "api_docs": "/docs",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("ENV", "production") == "development"
    )
