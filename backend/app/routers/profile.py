import os
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id, sanitize_input
from backend.app.core.config import settings
from backend.app.models.models import Profile, User
from backend.app.schemas.schemas import ProfileUpdate, ProfileResponse, ResumeUploadResponse
from backend.app.services.resume_service import resume_service
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/profile", tags=["Profile & Resume"])


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

@router.get("", response_model=ProfileResponse)
def get_profile(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Retrieves user profile and resume data."""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    skills = json.loads(profile.skills_json) if profile.skills_json else []
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "target_role": profile.target_role,
        "target_company": profile.target_company,
        "experience_level": profile.experience_level,
        "skills": skills,
        "resume_filename": profile.resume_filename,
        "resume_summary": profile.resume_summary
    }

@router.put("", response_model=ProfileResponse)
def update_profile(data: ProfileUpdate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Updates profile career targets and skills inventory."""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)

    if data.target_role is not None:
        profile.target_role = sanitize_input(data.target_role)
    if data.target_company is not None:
        profile.target_company = sanitize_input(data.target_company)
    if data.experience_level is not None:
        profile.experience_level = sanitize_input(data.experience_level)
    if data.skills is not None:
        profile.skills_json = json.dumps([sanitize_input(s) for s in data.skills])

    db.commit()
    db.refresh(profile)

    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "target_role": profile.target_role,
        "target_company": profile.target_company,
        "experience_level": profile.experience_level,
        "skills": json.loads(profile.skills_json),
        "resume_filename": profile.resume_filename,
        "resume_summary": profile.resume_summary
    }

@router.post("/resume/upload", response_model=ResumeAnalysisResponse)
@router.post("/resumes/upload", response_model=ResumeAnalysisResponse, include_in_schema=False)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Uploads PDF resume, validates file type and 10MB size limit,
    extracts text per page using PyMuPDF (fitz), invokes ai_dev's resume analyzer,
    and updates candidate profile with structured skills, projects, and grounded questions.
    
    Zero raw text is logged.
    """
    content = await file.read()

    # Strict validation via resume_service
    resume_service.validate_resume_file(
        filename=file.filename,
        content=content,
        content_type=file.content_type
    )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_filename = f"{user_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Process resume via extraction service
    parsed = resume_service.process_resume(file_path, file.filename, file_size=len(content))

    # Update database profile
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)

    profile.resume_filename = file.filename
    profile.resume_extracted_text = parsed["raw_text"]
    profile.resume_summary = parsed["summary"]
    profile.experience_level = parsed["experience_level"]
    
    # Merge extracted skills with existing
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
