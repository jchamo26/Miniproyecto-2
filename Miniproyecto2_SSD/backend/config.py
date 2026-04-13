"""Configuration module for FastAPI backend"""
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost/clinical_db"
    )
    
    # API Keys
    DEFAULT_ACCESS_KEY: str = os.getenv("DEFAULT_ACCESS_KEY", "test-access-key-12345")
    DEFAULT_PERMISSION_KEY: str = os.getenv("DEFAULT_PERMISSION_KEY", "medico")
    
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-prod")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 8
    
    # MinIO
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "minio:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    MINIO_BUCKET: str = "clinical-images"
    MINIO_SECURE: bool = False
    
    # Mailhog
    MAILHOG_HOST: str = os.getenv("MAILHOG_HOST", "mailhog")
    MAILHOG_PORT: int = int(os.getenv("MAILHOG_PORT", 1025))
    
    # FHIR Server
    FHIR_SERVER_URL: str = os.getenv("FHIR_SERVER_URL", "http://fhir-server:8080/fhir")
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    INFERENCE_RATE_LIMIT: int = 10  # per minute per key
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost,http://localhost:3000,http://localhost:5173,http://frontend:3000"
    )
    
    # Environment
    ENV: str = os.getenv("ENV", "development")
    
    class Config:
        env_file = ".env"

settings = Settings()
