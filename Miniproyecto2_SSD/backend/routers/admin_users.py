"""Admin Users router - User management"""
from fastapi import APIRouter, HTTPException, Query
import logging
from datetime import datetime
from uuid import uuid4

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/")
async def create_user(user: dict, x_permission_key: str = None):
    """Create a new user (Admin only)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    if not user.get("username") or not user.get("role"):
        raise HTTPException(status_code=400, detail="Missing username or role")
    
    if user.get("role") not in ["admin", "medico", "paciente"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = str(uuid4())
    logger.info(f"➕ User created: {user_id} (role={user.get('role')})")
    
    return {
        "id": user_id,
        "username": user.get("username"),
        "role": user.get("role"),
        "access_key": f"key_{user_id[:8]}",
        "created_at": datetime.utcnow().isoformat()
    }

@router.get("/")
async def list_users(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    x_permission_key: str = None
):
    """List all users (Admin only)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list users")
    
    logger.info(f"👥 Listing users (limit={limit}, offset={offset})")
    
    return {
        "total": 0,
        "users": []
    }

@router.get("/{user_id}")
async def get_user(user_id: str, x_permission_key: str = None):
    """Get user details (Admin only)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view users")
    
    logger.info(f"👤 Retrieving user: {user_id}")
    
    return {
        "id": user_id,
        "username": "test_user",
        "role": "medico",
        "is_active": True
    }

@router.patch("/{user_id}")
async def update_user(user_id: str, updates: dict, x_permission_key: str = None):
    """Update user (Admin only)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    logger.info(f"✏️ User updated: {user_id}")
    
    return {
        "id": user_id,
        "message": "User updated",
        "updated_at": datetime.utcnow().isoformat()
    }

@router.delete("/{user_id}")
async def deactivate_user(user_id: str, x_permission_key: str = None):
    """Deactivate user (soft-delete)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    logger.info(f"🚫 User deactivated: {user_id}")
    
    return {
        "id": user_id,
        "message": "User deactivated",
        "deleted_at": datetime.utcnow().isoformat()
    }

@router.post("/{user_id}/revoke-key")
async def revoke_api_key(user_id: str, x_permission_key: str = None):
    """Revoke API key for a user"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can revoke keys")
    
    logger.info(f"🔑 API key revoked for user: {user_id}")
    
    return {
        "id": user_id,
        "message": "API key revoked",
        "revoked_at": datetime.utcnow().isoformat()
    }

@router.post("/{user_id}/assign-patients")
async def assign_patients_to_doctor(
    user_id: str,
    patients: list,
    x_permission_key: str = None
):
    """Assign patients to a doctor (for médico role)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign patients")
    
    logger.info(f"📋 Assigned {len(patients)} patients to doctor {user_id}")
    
    return {
        "doctor_id": user_id,
        "patients_assigned": len(patients),
        "assigned_at": datetime.utcnow().isoformat()
    }
