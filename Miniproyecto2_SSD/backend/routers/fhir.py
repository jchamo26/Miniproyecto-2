"""FHIR router - HL7 FHIR R4 resources"""
from fastapi import APIRouter, Depends, HTTPException, Query
import logging
from datetime import datetime
from uuid import uuid4

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock FHIR responses - in production, integrate with HAPI FHIR server

@router.get("/Patient")
async def list_patients(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    x_permission_key: str = None
):
    """
    List patients with pagination (FHIR Patient resource)
    Roles: Admin=all, Médico=assigned, Paciente=own
    """
    logger.info(f"📋 Listing patients (limit={limit}, offset={offset}, role={x_permission_key})")
    
    # Mock data
    patients = [
        {
            "resourceType": "Patient",
            "id": str(uuid4()),
            "name": [{"given": ["Juan"], "family": "García"}],
            "birthDate": "1980-01-15",
            "gender": "male",
            "active": True
        } for _ in range(limit)
    ]
    
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": limit + offset,
        "entry": [{"resource": p} for p in patients],
        "link": [
            {"relation": "self", "url": f"/fhir/Patient?limit={limit}&offset={offset}"},
            {"relation": "next", "url": f"/fhir/Patient?limit={limit}&offset={offset + limit}"}
        ]
    }

@router.post("/Patient")
async def create_patient(patient: dict):
    """Create a new FHIR Patient"""
    patient_id = str(uuid4())
    logger.info(f"👤 Patient created: {patient_id}")
    
    patient["id"] = patient_id
    patient["resourceType"] = "Patient"
    
    return {"id": patient_id, "status": "created", "resource": patient}

@router.get("/Patient/{patient_id}")
async def get_patient(patient_id: str):
    """Get a specific FHIR Patient"""
    logger.info(f"👤 Retrieving patient: {patient_id}")
    
    return {
        "resourceType": "Patient",
        "id": patient_id,
        "name": [{"given": ["Test"], "family": "Patient"}],
        "birthDate": "1990-01-01",
        "active": True
    }

@router.post("/Observation")
async def create_observation(observation: dict):
    """Create a new FHIR Observation (vital signs, lab results)"""
    obs_id = str(uuid4())
    logger.info(f"📊 Observation created: {obs_id}")
    
    observation["id"] = obs_id
    observation["resourceType"] = "Observation"
    
    return {"id": obs_id, "status": "created"}

@router.get("/Observation")
async def list_observations(
    subject: str = Query(None),
    code: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List FHIR Observations with filters"""
    logger.info(f"📊 Listing observations (subject={subject}, code={code})")
    
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": limit,
        "entry": []
    }

@router.post("/Media")
async def create_media(media: dict):
    """Create FHIR Media resource (images from MinIO)"""
    media_id = str(uuid4())
    logger.info(f"🖼️ Media created: {media_id}")
    
    media["id"] = media_id
    media["resourceType"] = "Media"
    
    return {"id": media_id, "status": "created"}

@router.post("/RiskAssessment")
async def create_risk_assessment(risk: dict):
    """Create FHIR RiskAssessment from ML/DL results"""
    risk_id = str(uuid4())
    logger.info(f"⚠️ RiskAssessment created: {risk_id}")
    
    risk["id"] = risk_id
    risk["resourceType"] = "RiskAssessment"
    
    return {"id": risk_id, "status": "created"}

@router.patch("/RiskAssessment/{risk_id}/sign")
async def sign_risk_report(risk_id: str, signature: dict):
    """
    Sign a RiskAssessment (mandatory before closing patient)
    Sets signed_by and signed_at
    """
    if not signature.get("doctor_notes") or len(signature.get("doctor_notes", "")) < 30:
        raise HTTPException(
            status_code=400,
            detail="Doctor notes must be at least 30 characters"
        )
    
    logger.info(f"✍️ RiskAssessment signed: {risk_id}")
    
    return {
        "id": risk_id,
        "status": "signed",
        "signed_at": datetime.utcnow().isoformat(),
        "message": "RiskAssessment signed successfully"
    }

@router.get("/RiskAssessment/{patient_id}/can-close")
async def can_close_patient(patient_id: str):
    """Check if patient can be closed (all RiskReports signed)"""
    logger.info(f"🔒 Checking if patient {patient_id} can be closed")
    
    # Mock: assume all signed for demo
    return {
        "can_close": True,
        "message": "Patient can be closed",
        "pending_signatures": 0
    }

@router.post("/AuditEvent")
async def create_audit_event(event: dict):
    """Create FHIR AuditEvent (INSERT-ONLY audit log)"""
    event_id = str(uuid4())
    logger.info(f"🔍 AuditEvent created: {event_id}")
    
    return {"id": event_id, "status": "created"}

@router.get("/AuditEvent")
async def list_audit_events(
    user_id: str = Query(None),
    action: str = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """List audit events (filtered, read-only)"""
    logger.info(f"🔍 Listing audit events (user={user_id}, action={action})")
    
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": 0,
        "entry": []
    }

@router.post("/Consent")
async def create_consent(consent: dict):
    """Create FHIR Consent (Habeas Data - Ley 1581/2012)"""
    consent_id = str(uuid4())
    logger.info(f"✅ Consent created: {consent_id}")
    
    consent["id"] = consent_id
    consent["resourceType"] = "Consent"
    
    return {"id": consent_id, "status": "active"}
