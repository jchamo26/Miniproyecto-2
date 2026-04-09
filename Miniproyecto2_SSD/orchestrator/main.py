"""
Inference Orchestrator - AsyncIO queue with mínimum 4 concurrent workers
"""
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
import asyncio
import httpx
import os
import logging
from datetime import datetime
from uuid import uuid4

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Inference Orchestrator", version="1.0.0")

# Global semaphore for concurrency control
MAX_WORKERS = int(os.getenv("MAX_WORKERS", "4"))
sem = asyncio.Semaphore(MAX_WORKERS)

# In-memory queue (in production, use PostgreSQL or Redis)
inference_queue = {}

class InferenceRequest(BaseModel):
    patient_id: str
    model_type: str  # ML, DL, MULTIMODAL

class InferenceResponse(BaseModel):
    task_id: str
    status: str
    message: str

@app.post("/infer", response_model=InferenceResponse)
async def request_inference(req: InferenceRequest):
    """
    Request inference for a patient
    Returns task_id immediately (non-blocking)
    """
    task_id = str(uuid4())
    
    inference_queue[task_id] = {
        "task_id": task_id,
        "patient_id": req.patient_id,
        "model_type": req.model_type,
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
        "result": None,
        "error_msg": None
    }
    
    logger.info(f"🎯 Inference requested: {task_id} (model={req.model_type})")
    
    # Start background task
    asyncio.create_task(
        run_inference_with_semaphore(task_id, req.patient_id, req.model_type)
    )
    
    return InferenceResponse(
        task_id=task_id,
        status="PENDING",
        message="Inference queued"
    )

async def run_inference_with_semaphore(task_id: str, patient_id: str, model_type: str):
    """Run inference with concurrency limit (Semaphore)"""
    async with sem:
        await run_inference(task_id, patient_id, model_type)

async def run_inference(task_id: str, patient_id: str, model_type: str):
    """Execute inference on ML or DL service"""
    try:
        inference_queue[task_id]["status"] = "RUNNING"
        logger.info(f"🚀 Running inference: {task_id}")
        
        # Call appropriate service
        async with httpx.AsyncClient(timeout=120.0) as client:
            if model_type == "ML":
                url = "http://ml-service:8001/predict"
                response = await client.post(url, json={"patient_id": patient_id})
            elif model_type == "DL":
                url = "http://dl-service:8003/predict"
                response = await client.post(url, json={"patient_id": patient_id})
            elif model_type == "MULTIMODAL":
                # Parallel calls to ML and DL
                async def get_ml():
                    return await client.post("http://ml-service:8001/predict", json={"patient_id": patient_id})
                
                async def get_dl():
                    return await client.post("http://dl-service:8003/predict", json={"patient_id": patient_id})
                
                ml_response, dl_response = await asyncio.gather(get_ml(), get_dl())
                response = ml_response  # Use ML response as main
            else:
                raise ValueError(f"Unknown model type: {model_type}")
            
            if response.status_code == 200:
                inference_queue[task_id]["result"] = response.json()
                inference_queue[task_id]["status"] = "DONE"
                logger.info(f"✅ Inference completed: {task_id}")
            else:
                raise Exception(f"Service returned {response.status_code}")
                
    except asyncio.TimeoutError:
        inference_queue[task_id]["status"] = "ERROR"
        inference_queue[task_id]["error_msg"] = "Inference timeout (>120s)"
        logger.error(f"⏱️ Timeout: {task_id}")
    except Exception as e:
        inference_queue[task_id]["status"] = "ERROR"
        inference_queue[task_id]["error_msg"] = str(e)
        logger.error(f"💥 Error: {task_id} - {e}")

@app.get("/infer/{task_id}")
async def get_inference_result(task_id: str):
    """Get inference result by task_id (polling)"""
    if task_id not in inference_queue:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = inference_queue[task_id]
    
    return {
        "task_id": task_id,
        "status": task["status"],
        "patient_id": task["patient_id"],
        "model_type": task["model_type"],
        "result": task["result"],
        "error_msg": task["error_msg"],
        "created_at": task["created_at"]
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "service": "orchestrator",
        "max_workers": MAX_WORKERS,
        "active_tasks": len([t for t in inference_queue.values() if t["status"] == "RUNNING"])
    }
