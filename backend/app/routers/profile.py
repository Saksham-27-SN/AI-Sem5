import os
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id
from backend.app.core.config import settings
from backend.app.models.models import Profile, User
from backend.app.schemas.schemas import ProfileUpdate, ProfileResponse, ResumeUploadResponse
from backend.app.services.resume_service import resume_service

router = APIRouter(prefix="/profile", tags=["Profile & Resume"])

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
        profile.target_role = data.target_role
    if data.target_company is not None:
        profile.target_company = data.target_company
    if data.experience_level is not None:
        profile.experience_level = data.experience_level
    if data.skills is not None:
        profile.skills_json = json.dumps(data.skills)

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

@router.post("/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Uploads PDF resume, extracts skills with PyMuPDF, and updates candidate profile."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resume documents are supported."
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_filename = f"{user_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Process resume via extraction service
    parsed = resume_service.process_resume(file_path, file.filename)

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
    merged_skills = list(dict.fromkeys(current_skills + parsed["skills"]))
    profile.skills_json = json.dumps(merged_skills)

    db.commit()

    return {
        "filename": file.filename,
        "extracted_skills": parsed["skills"],
        "experience_level": parsed["experience_level"],
        "summary": parsed["summary"],
        "raw_text_length": parsed["raw_text_length"]
    }
