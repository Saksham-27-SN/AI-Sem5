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

from backend.app.routers import auth, profile, interviews, aptitude, media, analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("interviewgenie.api")

def seed_aptitude_questions():
    """Seeds and synchronizes verified aptitude question bank into SQLite database."""
    try:
        with SessionLocal() as db:
            existing_questions = {q.id: q for q in db.query(AptitudeQuestion).all()}
            synced_count = 0
            for item in AptitudeAgent.VERIFIED_APTITUDE_BANK:
                q_id = item["id"]
                options_str = json.dumps(item["options"])
                if q_id in existing_questions:
                    aq = existing_questions[q_id]
                    aq.category = item["category"]
                    aq.difficulty = item["difficulty"]
                    aq.question = item["question"]
                    aq.options_json = options_str
                    aq.correct_option = item["correct_option"]
                    aq.explanation = item["explanation"]
                else:
                    aq = AptitudeQuestion(
                        id=q_id,
                        category=item["category"],
                        difficulty=item["difficulty"],
                        question=item["question"],
                        options_json=options_str,
                        correct_option=item["correct_option"],
                        explanation=item["explanation"]
                    )
                    db.add(aq)
                synced_count += 1
            db.commit()
            total_count = db.query(AptitudeQuestion).count()
            logger.info(f"Successfully verified and seeded aptitude questions. Total in database: {total_count}.")
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
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)

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
