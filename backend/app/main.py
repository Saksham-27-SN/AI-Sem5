import os
import json
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.models.models import AptitudeQuestion
from ai_engine.aptitude_agent import AptitudeAgent

from backend.app.routers import auth, profile, interviews, aptitude, media

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("interviewgenie.api")

def seed_aptitude_questions():
    """Seeds verified aptitude question bank if the database table is empty."""
    try:
        with SessionLocal() as db:
            count = db.query(AptitudeQuestion).count()
            if count == 0:
                logger.info("Seeding initial aptitude questions from verified bank...")
                for item in AptitudeAgent.VERIFIED_APTITUDE_BANK:
                    aq = AptitudeQuestion(
                        id=item["id"],
                        category=item["category"],
                        difficulty=item["difficulty"],
                        question=item["question"],
                        options_json=json.dumps(item["options"]),
                        correct_option=item["correct_option"],
                        explanation=item["explanation"]
                    )
                    db.add(aq)
                db.commit()
                logger.info(f"Successfully seeded {len(AptitudeAgent.VERIFIED_APTITUDE_BANK)} aptitude questions.")
    except Exception as e:
        logger.error(f"Failed to seed aptitude questions: {e}")

# Ensure database tables and initial seeds on startup / import
Base.metadata.create_all(bind=engine)
seed_aptitude_questions()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management: initialize DB tables and seed data."""
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Ensure storage directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
    os.makedirs("./reports", exist_ok=True)

    # Seed verified aptitude questions
    seed_aptitude_questions()

    yield

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic Multi-Agent AI Interviewer & Assessment Engine",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(profile.router, prefix=settings.API_V1_PREFIX)
app.include_router(interviews.router, prefix=settings.API_V1_PREFIX)
app.include_router(aptitude.router, prefix=settings.API_V1_PREFIX)
app.include_router(media.router, prefix=settings.API_V1_PREFIX)

# Root and Health Check Endpoints
@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health")
def health_alias():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
