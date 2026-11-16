import os
import shutil
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.models import MediaConsent, InterviewSession

logger = logging.getLogger(__name__)

class MediaCleanupService:
    """
    Dedicated media lifecycle and cleanup service.
    Handles GDPR Article 17 permanent deletion, cleanup of purged session files,
    orphan artifact removal, and retention period enforcement.
    """

    def __init__(self, recordings_dir: Optional[str] = None, upload_dir: Optional[str] = None):
        self.recordings_dir = recordings_dir or settings.RECORDINGS_DIR
        self.upload_dir = upload_dir or settings.UPLOAD_DIR

    def cleanup_interview_recordings(
        self,
        interview_id: str,
        user_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Permanently deletes all recording files and directories associated with an interview ID.
        Updates MediaConsent state in the database if db session is provided.
        """
        deleted_files: List[str] = []
        freed_bytes = 0

        # 1. Clean referenced consent path if present in DB
        if db:
            query = db.query(MediaConsent).filter(MediaConsent.interview_id == interview_id)
            if user_id:
                query = query.filter(MediaConsent.user_id == user_id)
            consent = query.first()

            if consent and consent.recording_file_path and os.path.exists(consent.recording_file_path):
                try:
                    size = os.path.getsize(consent.recording_file_path)
                    os.remove(consent.recording_file_path)
                    freed_bytes += size
                    deleted_files.append(consent.recording_file_path)
                except Exception as e:
                    logger.warning(f"Failed to remove recording path {consent.recording_file_path}: {e}")

            if consent:
                consent.recording_file_path = None
                consent.recording_duration_seconds = 0
                consent.is_deleted = True
                db.commit()

        # 2. Scan recordings directory for any files matching interview_id
        for target_dir in (self.recordings_dir, self.upload_dir):
            if os.path.exists(target_dir):
                try:
                    for item in os.listdir(target_dir):
                        if interview_id in item:
                            if user_id is None or user_id in item:
                                item_path = os.path.join(target_dir, item)
                                try:
                                    if os.path.isfile(item_path):
                                        size = os.path.getsize(item_path)
                                        os.remove(item_path)
                                        freed_bytes += size
                                        deleted_files.append(item_path)
                                    elif os.path.isdir(item_path):
                                        dir_size = sum(
                                            os.path.getsize(os.path.join(r, f))
                                            for r, _, files in os.walk(item_path)
                                            for f in files
                                        )
                                        shutil.rmtree(item_path)
                                        freed_bytes += dir_size
                                        deleted_files.append(item_path)
                                except Exception as e:
                                    logger.warning(f"Failed to delete artifact {item_path}: {e}")
                except Exception as e:
                    logger.warning(f"Error scanning directory {target_dir}: {e}")

        return {
            "deleted": True,
            "interview_id": interview_id,
            "purged_count": len(deleted_files),
            "purged_files": deleted_files,
            "freed_bytes": freed_bytes,
            "freed_mb": round(freed_bytes / (1024 * 1024), 2)
        }

    def cleanup_purged_recordings(
        self,
        db: Session,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Scans database for sessions with is_deleted=True and ensures all associated disk files
        are completely removed. Also purges orphaned media files.
        """
        query = db.query(MediaConsent).filter(MediaConsent.is_deleted.is_(True))
        if user_id:
            query = query.filter(MediaConsent.user_id == user_id)
        purged_consents = query.all()

        total_cleaned_sessions = 0
        total_freed_bytes = 0
        all_deleted_paths: List[str] = []

        for consent in purged_consents:
            res = self.cleanup_interview_recordings(
                interview_id=consent.interview_id,
                user_id=user_id,
                db=db
            )
            if res.get("purged_count", 0) > 0:
                total_cleaned_sessions += 1
                total_freed_bytes += res.get("freed_bytes", 0)
                all_deleted_paths.extend(res.get("purged_files", []))

        # Scan for orphaned temporary files (.tmp, .part, empty folders)
        orphaned_files = 0
        for target_dir in (self.recordings_dir,):
            if os.path.exists(target_dir):
                try:
                    for item in os.listdir(target_dir):
                        item_path = os.path.join(target_dir, item)
                        if item.endswith((".tmp", ".part", ".crdownload")):
                            try:
                                size = os.path.getsize(item_path)
                                os.remove(item_path)
                                total_freed_bytes += size
                                orphaned_files += 1
                                all_deleted_paths.append(item_path)
                            except Exception as e:
                                logger.warning(f"Failed to remove orphan temp file {item_path}: {e}")
                except Exception as e:
                    logger.warning(f"Error scanning for orphan files in {target_dir}: {e}")

        return {
            "status": "success",
            "message": f"Successfully purged media artifacts across {len(purged_consents)} sessions.",
            "purged_sessions_cleaned": len(purged_consents),
            "orphaned_files_removed": orphaned_files,
            "freed_bytes": total_freed_bytes,
            "freed_mb": round(total_freed_bytes / (1024 * 1024), 2),
            "deleted_paths": all_deleted_paths
        }

    def cleanup_expired_recordings(
        self,
        db: Session,
        retention_days: int = 30
    ) -> Dict[str, Any]:
        """
        Enforces retention window: marks and purges recordings older than retention_days.
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        expired_consents = db.query(MediaConsent).filter(
            MediaConsent.created_at < cutoff_date,
            MediaConsent.is_deleted.is_(False)
        ).all()

        purged_count = 0
        for consent in expired_consents:
            self.cleanup_interview_recordings(interview_id=consent.interview_id, db=db)
            purged_count += 1

        return {
            "retention_days": retention_days,
            "cutoff_date": cutoff_date.isoformat(),
            "purged_expired_count": purged_count
        }

media_cleanup_service = MediaCleanupService()
