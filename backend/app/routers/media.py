import os
import shutil
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id
from backend.app.core.config import settings
from backend.app.models.models import MediaConsent, InterviewSession
from backend.app.schemas.schemas import MediaConsentRequest, MediaConsentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["Media & Consent"])

@router.post("/consent", response_model=MediaConsentResponse)
def set_media_consent(
    payload: MediaConsentRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Records candidate's explicit consent for audio/video recording with UTC timestamp.
    """
    # Verify the interview session exists and belongs to the authenticated user
    interview = db.query(InterviewSession).filter(
        InterviewSession.id == payload.interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    # Upsert media consent record
    consent = db.query(MediaConsent).filter(
        MediaConsent.interview_id == payload.interview_id,
        MediaConsent.user_id == user_id
    ).first()

    now = datetime.now(timezone.utc)
    if not consent:
        consent = MediaConsent(
            interview_id=payload.interview_id,
            user_id=user_id,
            has_recording_consent=payload.has_consent,
            consent_given_at=now if payload.has_consent else None,
            is_deleted=False
        )
        db.add(consent)
    else:
        consent.has_recording_consent = payload.has_consent
        consent.consent_given_at = now if payload.has_consent else None
        consent.is_deleted = False

    db.commit()
    db.refresh(consent)

    return MediaConsentResponse(
        interview_id=consent.interview_id,
        has_recording_consent=consent.has_recording_consent,
        consent_given_at=consent.consent_given_at
    )

@router.get("/status")
def get_media_status(
    interview_id: Optional[str] = Query(None, description="Optional interview ID to check specific consent"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Checks active media recording consent and storage quota for a specific interview or candidate.
    """
    storage_quota_mb = 500.0
    storage_used_mb = 0.0

    # Calculate actual storage used by candidate recordings
    if os.path.exists(settings.RECORDINGS_DIR):
        try:
            total_bytes = 0
            for root, _, files in os.walk(settings.RECORDINGS_DIR):
                for f in files:
                    if user_id in f:
                        total_bytes += os.path.getsize(os.path.join(root, f))
            storage_used_mb = round(total_bytes / (1024 * 1024), 2)
        except Exception as e:
            logger.warning(f"Error computing storage usage: {e}")

    if interview_id:
        consent = db.query(MediaConsent).filter(
            MediaConsent.interview_id == interview_id,
            MediaConsent.user_id == user_id
        ).first()

        has_file = bool(
            consent and consent.recording_file_path and os.path.exists(consent.recording_file_path) and not consent.is_deleted
        )

        return {
            "interview_id": interview_id,
            "has_recording_consent": consent.has_recording_consent if consent else False,
            "consent_given_at": consent.consent_given_at if consent else None,
            "recording_duration_seconds": consent.recording_duration_seconds if consent else 0,
            "has_recording": has_file,
            "is_deleted": consent.is_deleted if consent else False,
            "storage_quota_mb": storage_quota_mb,
            "storage_used_mb": storage_used_mb
        }

    # Overall user media status
    user_consents = db.query(MediaConsent).filter(MediaConsent.user_id == user_id).all()
    active_count = sum(1 for c in user_consents if c.has_recording_consent and not c.is_deleted)
    total_recordings = sum(1 for c in user_consents if c.recording_file_path and not c.is_deleted)

    return {
        "user_id": user_id,
        "has_recording_consent": active_count > 0,
        "active_consents_count": active_count,
        "total_recordings": total_recordings,
        "storage_quota_mb": storage_quota_mb,
        "storage_used_mb": storage_used_mb
    }

@router.delete("/recordings/{interview_id}")
def delete_interview_recordings(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Permanently purges all audio/video recording artifacts for the given interview,
    ensuring full GDPR and candidate privacy compliance.
    """
    interview = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    deleted_paths = []
    consent = db.query(MediaConsent).filter(
        MediaConsent.interview_id == interview_id,
        MediaConsent.user_id == user_id
    ).first()

    # Purge referenced file path if present
    if consent and consent.recording_file_path and os.path.exists(consent.recording_file_path):
        try:
            os.remove(consent.recording_file_path)
            deleted_paths.append(consent.recording_file_path)
        except Exception as e:
            logger.warning(f"Failed to remove recording file {consent.recording_file_path}: {e}")

    # Search recordings directory for any files matching interview ID
    recordings_dir = settings.RECORDINGS_DIR
    if os.path.exists(recordings_dir):
        try:
            for item in os.listdir(recordings_dir):
                if interview_id in item:
                    item_path = os.path.join(recordings_dir, item)
                    try:
                        if os.path.isfile(item_path):
                            os.remove(item_path)
                            deleted_paths.append(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                            deleted_paths.append(item_path)
                    except Exception as e:
                        logger.warning(f"Failed to delete recording artifact {item_path}: {e}")
        except Exception as e:
            logger.warning(f"Error scanning recordings directory: {e}")

    # Mark consent recording as purged in database
    if consent:
        consent.recording_file_path = None
        consent.recording_duration_seconds = 0
        consent.is_deleted = True
        db.commit()

    return {
        "message": f"All media recordings and artifacts for interview {interview_id} have been permanently deleted.",
        "interview_id": interview_id,
        "deleted": True,
        "purged_artifacts_count": len(deleted_paths)
    }
