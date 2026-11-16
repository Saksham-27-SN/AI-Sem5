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
from backend.app.schemas.schemas import MediaConsentRequest, MediaConsentResponse, MediaCleanupResponse
from backend.app.services.media_cleanup_service import media_cleanup_service

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
    if interview_id == "all":
        interviews = db.query(InterviewSession).filter(InterviewSession.user_id == user_id).all()
        total_purged = 0
        total_freed = 0
        for session_item in interviews:
            cleanup_res = media_cleanup_service.cleanup_interview_recordings(
                interview_id=session_item.id,
                user_id=user_id,
                db=db
            )
            total_purged += cleanup_res.get("purged_count", 0)
            total_freed += cleanup_res.get("freed_bytes", 0)
        orphaned_res = media_cleanup_service.cleanup_purged_recordings(db=db, user_id=user_id)
        total_purged += orphaned_res.get("orphaned_files_removed", 0)
        total_freed += orphaned_res.get("freed_bytes", 0)
        return {
            "message": "All media recordings and artifacts have been permanently deleted.",
            "interview_id": "all",
            "deleted": True,
            "purged_artifacts_count": total_purged,
            "freed_bytes": total_freed
        }

    interview = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found."
        )

    cleanup_res = media_cleanup_service.cleanup_interview_recordings(
        interview_id=interview_id,
        user_id=user_id,
        db=db
    )

    return {
        "message": f"All media recordings and artifacts for interview {interview_id} have been permanently deleted.",
        "interview_id": interview_id,
        "deleted": True,
        "purged_artifacts_count": cleanup_res.get("purged_count", 0),
        "freed_bytes": cleanup_res.get("freed_bytes", 0)
    }

@router.post("/cleanup", response_model=MediaCleanupResponse)
def cleanup_purged_media(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Sweeps and permanently removes all orphaned or marked-for-deletion media artifacts,
    ensuring privacy guarantees and reclaiming candidate storage quota.
    """
    res = media_cleanup_service.cleanup_purged_recordings(db=db, user_id=user_id)
    return MediaCleanupResponse(
        status=res.get("status", "success"),
        message=res.get("message", "Media cleanup completed."),
        purged_sessions_cleaned=res.get("purged_sessions_cleaned", 0),
        orphaned_files_removed=res.get("orphaned_files_removed", 0),
        freed_bytes=res.get("freed_bytes", 0),
        freed_mb=res.get("freed_mb", 0.0)
    )
