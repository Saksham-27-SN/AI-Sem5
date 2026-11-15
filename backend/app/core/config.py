import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "InterviewGenie AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./interviewgenie.db")
    
    # Auth
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "interviewgenie-secret-key-super-safe-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # AI Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    
    # Storage
    UPLOAD_DIR: str = os.getenv("MEDIA_UPLOAD_DIR", "./uploads")
    RECORDINGS_DIR: str = os.getenv("RECORDINGS_DIR", "./recordings")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
