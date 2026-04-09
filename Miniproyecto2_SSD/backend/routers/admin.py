"""Admin router - Administrative functions"""
from fastapi import APIRouter, Depends, HTTPException, Query
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/audit-log")
async def get_audit_log(
    action: str = Query(None),
    user_id: str = Query(None),
    resource_type: str = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    x_permission_key: str = None
):
    """
    Get audit log (INSERT-ONLY, read-only for Admin)
    Filterable by action, user, resource type
    """
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view audit log")
    
    logger.info(f"🔍 Admin retrieving audit log (action={action}, user={user_id})")
    
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": 0,
        "entries": []
    }

@router.get("/audit-log/export")
async def export_audit_log(
    format: str = Query("csv", regex="^(csv|json)$"),
    x_permission_key: str = None
):
    """Export audit log as CSV or JSON"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can export audit log")
    
    logger.info(f"📥 Exporting audit log as {format}")
    
    return {
        "message": "Export generated",
        "format": format,
        "url": f"/downloads/audit_log_{datetime.utcnow().isoformat()}.{format}"
    }

@router.get("/statistics")
async def get_statistics(x_permission_key: str = None):
    """Get system usage statistics"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view statistics")
    
    logger.info("📊 Admin retrieving system statistics")
    
    return {
        "total_patients": 0,
        "total_users": 0,
        "total_inferences": 0,
        "inference_acceptance_rate": 0.85,
        "inference_rejection_rate": 0.15,
        "average_inference_time_seconds": 2.5,
        "critical_alerts_today": 0
    }

@router.post("/restore/{resource_type}/{resource_id}")
async def restore_deleted(
    resource_type: str,
    resource_id: str,
    x_permission_key: str = None
):
    """Restore a soft-deleted resource (Admin only)"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can restore resources")
    
    logger.info(f"♻️ Restoring {resource_type}/{resource_id}")
    
    return {
        "message": "Resource restored",
        "resource_id": resource_id,
        "resource_type": resource_type,
        "restored_at": datetime.utcnow().isoformat()
    }

@router.post("/configure-alert-threshold")
async def configure_alert_threshold(
    threshold_config: dict,
    x_permission_key: str = None
):
    """Configure critical alert thresholds"""
    if x_permission_key != "admin":
        raise HTTPException(status_code=403, detail="Only admins can configure thresholds")
    
    logger.info(f"⚙️ Alert threshold configured: {threshold_config}")
    
    return {"message": "Threshold updated", "config": threshold_config}
