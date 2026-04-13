"""Authentication router - Login and token management"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from datetime import datetime, timedelta
import jwt
import logging
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/login")
async def login(credentials: dict):
    """
    Login with double API-Key
    Returns JWT token
    """
    access_key = credentials.get("access_key")
    permission_key = credentials.get("permission_key")
    
    if not access_key or not permission_key:
        raise HTTPException(status_code=400, detail="Missing credentials")
    
    if permission_key not in ["admin", "medico", "paciente"]:
        raise HTTPException(status_code=403, detail="Invalid permission key")
    
    # Create JWT token
    payload = {
        "sub": access_key,
        "role": permission_key,
        "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    logger.info(f"✅ Login successful for role: {permission_key}")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": permission_key,
        "expires_in": settings.JWT_EXPIRATION_HOURS * 3600
    }

@router.post("/logout")
async def logout(request: Request):
    """
    Logout endpoint - in production, add token to blacklist
    """
    logger.info("📤 User logged out")
    return {"message": "Logged out successfully"}

@router.get("/verify")
async def verify_token(
    authorization: str = Header(None),
    x_access_key: str = Header(None),
    x_permission_key: str = Header(None)
):
    """
    Verify if token/keys are valid
    """
    if not authorization and not (x_access_key and x_permission_key):
        raise HTTPException(status_code=401, detail="Missing authentication")
    
    return {
        "valid": True,
        "role": x_permission_key or "unknown",
        "timestamp": datetime.utcnow().isoformat()
    }
