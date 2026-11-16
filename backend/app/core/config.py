import os
import sys
from dotenv import load_dotenv
from pydantic import BaseModel

# Compute explicit .env paths relative to this config file
backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
root_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

# Explicitly load backend/.env, root .env, and cwd default .env
load_dotenv(backend_env_path)
if os.path.exists(root_env_path):
    load_dotenv(root_env_path)
load_dotenv()

_is_pytest_running = "pytest" in sys.modules or any("pytest" in str(arg).lower() for arg in sys.argv)

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
    GEMINI_API_KEY: str = "" if _is_pytest_running else os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
    GEMINI_TIMEOUT_SECONDS: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30.0"))
    GEMINI_MAX_RETRIES: int = int(os.getenv("GEMINI_MAX_RETRIES", "1"))
    
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
