"""Database module for async PostgreSQL connection"""
import asyncpg
import asyncio
from config import settings
import logging

logger = logging.getLogger(__name__)

db_pool = None

async def get_db_pool():
    """Get or create database connection pool"""
    global db_pool
    if db_pool is None:
        retries = 0
        while retries < 10:
            try:
                db_pool = await asyncpg.create_pool(
                    settings.DATABASE_URL,
                    min_size=1,
                    max_size=10,
                )
                logger.info("📊 Connection pool created")
                break
            except Exception as exc:
                retries += 1
                logger.warning(
                    f"Database connection attempt {retries}/10 failed: {exc}"
                )
                await asyncio.sleep(3)
        if db_pool is None:
            raise RuntimeError("Unable to connect to the PostgreSQL database")
    return db_pool

async def get_db():
    """Get a database connection from the pool"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        yield conn

async def init_db():
    """Initialize database schema on startup"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Ensure uuid generation extension is available
        await conn.execute("""
            CREATE EXTENSION IF NOT EXISTS pgcrypto;
        """)
        # Create schema if not exists
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'medico', 'paciente')),
                access_key VARCHAR(255) UNIQUE NOT NULL,
                permission_key VARCHAR(20) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
            
            CREATE TABLE IF NOT EXISTS patients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fhir_id TEXT UNIQUE,
                name VARCHAR(255) NOT NULL,
                birth_date DATE,
                identification_doc BYTEA,
                gender VARCHAR(10),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
            
            CREATE TABLE IF NOT EXISTS images (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id),
                minio_key BYTEA NOT NULL,
                modality VARCHAR(50),
                fhir_media_id TEXT,
                uploaded_by UUID REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
            
            CREATE TABLE IF NOT EXISTS risk_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id),
                model_type VARCHAR(20),
                risk_score NUMERIC(5,4),
                risk_category VARCHAR(20),
                is_critical BOOLEAN,
                prediction_enc BYTEA,
                shap_json JSONB,
                fhir_risk_id TEXT,
                doctor_action VARCHAR(20),
                doctor_notes TEXT,
                rejection_reason TEXT,
                signed_by UUID REFERENCES users(id),
                signed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS inference_queue (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID,
                model_type VARCHAR(20),
                status VARCHAR(20) DEFAULT 'PENDING',
                requested_by UUID,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                completed_at TIMESTAMPTZ,
                result_id UUID,
                error_msg TEXT
            );
            
            CREATE TABLE IF NOT EXISTS audit_log (
                id BIGSERIAL PRIMARY KEY,
                ts TIMESTAMPTZ DEFAULT NOW(),
                user_id UUID,
                role VARCHAR(20),
                action VARCHAR(80),
                resource_type VARCHAR(40),
                resource_id UUID,
                ip_address INET,
                result VARCHAR(20),
                detail JSONB
            );
            
            CREATE TABLE IF NOT EXISTS consent (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                policy_version VARCHAR(20) DEFAULT '1.0',
                accepted_at TIMESTAMPTZ DEFAULT NOW(),
                ip_address INET
            );
            
            CREATE TABLE IF NOT EXISTS model_feedback (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                risk_report_id UUID REFERENCES risk_reports(id),
                feedback VARCHAR(20) CHECK (feedback IN ('ACCEPTED', 'REJECTED')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        logger.info("✅ Database schema initialized")

async def close_db():
    """Close database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("🔌 Connection pool closed")
