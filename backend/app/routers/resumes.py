import os
import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id
from backend.app.core.config import settings
from backend.app.models.models import Profile
from backend.app.services.resume_service import resume_service

logger = logging.getLogger("interviewgenie.routers.resumes")

router = APIRouter(prefix="/resumes", tags=["Resume Processing & Grounded Questions"])


class ResumeAnalysisResponse(BaseModel):
    filename: str
    extracted_skills: List[str]
    experience_level: str
    summary: str
    raw_text_length: int
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    grounded_questions: List[Dict[str, Any]] = Field(default_factory=list)
    extracted_profile: Optional[Dict[str, Any]] = None


@router.post("/upload", response_model=ResumeAnalysisResponse, status_code=status.HTTP_200_OK)
@router.post("", response_model=ResumeAnalysisResponse, status_code=status.HTTP_200_OK)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Uploads candidate PDF resume, enforces strictly .pdf extension and 10MB size limit,
    extracts text per page using PyMuPDF (fitz), invokes ai_dev's resume analyzer,
    updates candidate profile in DB, and returns structured profile, skills, projects, and grounded questions.
    
    PRIVACY GUARANTEE: Never logs raw resume text.
    """
    content = await file.read()

    # 1. Strict validation (PDF extension, MIME type, max 10MB, %PDF- header)
    resume_service.validate_resume_file(
        filename=file.filename,
        content=content,
        content_type=file.content_type
    )

    # 2. Persist uploaded file safely
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_filename = f"{user_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    # 3. Process resume via PyMuPDF and ai_dev's resume_analyzer
    parsed = resume_service.process_resume(content, file.filename, file_size=len(content))

    # 4. Update candidate profile in DB
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)

    profile.resume_filename = file.filename
    profile.resume_extracted_text = parsed["raw_text"]
    profile.resume_summary = parsed["summary"]
    profile.experience_level = parsed["experience_level"]

    # Merge skills without duplicates
    current_skills = json.loads(profile.skills_json) if profile.skills_json else []
    merged_skills = list(dict.fromkeys(current_skills + parsed["extracted_skills"]))
    profile.skills_json = json.dumps(merged_skills)

    db.commit()

    return {
        "filename": parsed["filename"],
        "extracted_skills": parsed["extracted_skills"],
        "experience_level": parsed["experience_level"],
        "summary": parsed["summary"],
        "raw_text_length": parsed["raw_text_length"],
        "projects": parsed["projects"],
        "experience": parsed["experience"],
        "education": parsed["education"],
        "gaps": parsed["gaps"],
        "grounded_questions": parsed["grounded_questions"],
        "extracted_profile": parsed["extracted_profile"]
    }
