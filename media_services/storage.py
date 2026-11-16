"""
InterviewGenie AI - Media Storage Service
Handles encrypted/local audio & video storage, quota enforcement (500 MB per user),
file type validation (.webm / .mp4), and GDPR Article 17 permanent deletion.
"""

import os
import shutil
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class MediaStorageService:
    def __init__(self, base_dir: Optional[str] = None, quota_mb: float = 500.0):
        self.base_dir = base_dir or os.path.join(os.getcwd(), "recordings")
        self.quota_mb = quota_mb
        self.allowed_extensions = {".webm", ".mp4", ".wav", ".ogg"}
        self.allowed_mime_types = {
            "video/webm",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=vp9,opus",
            "video/mp4",
            "video/mp4;codecs=h264,aac",
            "audio/webm",
            "audio/wav",
            "audio/ogg"
        }
        self._ensure_storage_dir()

    def _ensure_storage_dir(self) -> None:
        if not os.path.exists(self.base_dir):
            try:
                os.makedirs(self.base_dir, exist_ok=True)
            except OSError as e:
                logger.error(f"Failed to create storage directory {self.base_dir}: {e}")

    def get_storage_usage_mb(self, user_id: Optional[str] = None) -> float:
        """Calculates total disk usage in MB, optionally scoped to a user."""
        if not os.path.exists(self.base_dir):
            return 0.0

        total_bytes = 0
        try:
            for root, _, files in os.walk(self.base_dir):
                for f in files:
                    if user_id is None or user_id in f:
                        total_bytes += os.path.getsize(os.path.join(root, f))
        except Exception as e:
            logger.warning(f"Error calculating storage usage: {e}")

        return round(total_bytes / (1024 * 1024), 2)

    def check_quota_available(self, new_bytes: int, user_id: Optional[str] = None) -> bool:
        """Verifies that adding new_bytes will not exceed the candidate storage quota."""
        current_mb = self.get_storage_usage_mb(user_id)
        additional_mb = new_bytes / (1024 * 1024)
        return (current_mb + additional_mb) <= self.quota_mb

    def save_media_file(
        self,
        interview_id: str,
        user_id: str,
        content: bytes,
        mime_type: str = "video/webm"
    ) -> Dict[str, Any]:
        """
        Saves a candidate recording artifact (.webm or .mp4) to local storage.
        Enforces quota and format validation.
        """
        clean_mime = mime_type.split(";")[0].strip().lower()
        ext = ".mp4" if "mp4" in clean_mime else ".webm"

        if not self.check_quota_available(len(content), user_id):
            raise ValueError(
                f"Storage quota exceeded. Allowed: {self.quota_mb}MB, "
                f"Current: {self.get_storage_usage_mb(user_id)}MB"
            )

        filename = f"{user_id}_{interview_id}_{int(os.times().elapsed * 1000)}{ext}"
        filepath = os.path.join(self.base_dir, filename)

        try:
            with open(filepath, "wb") as f:
                f.write(content)
        except OSError as e:
            logger.error(f"Failed to write media file to {filepath}: {e}")
            raise

        size_bytes = len(content)
        size_mb = round(size_bytes / (1024 * 1024), 2)

        return {
            "filename": filename,
            "filepath": filepath,
            "size_bytes": size_bytes,
            "size_mb": size_mb,
            "mime_type": mime_type,
            "extension": ext,
            "interview_id": interview_id,
            "user_id": user_id
        }

    def purge_interview_media(self, interview_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Permanently deletes all recording artifacts associated with an interview ID (GDPR Article 17).
        """
        purged_files = []
        if not os.path.exists(self.base_dir):
            return {"deleted": True, "purged_count": 0, "purged_files": []}

        try:
            for item in os.listdir(self.base_dir):
                if interview_id in item:
                    if user_id is None or user_id in item:
                        item_path = os.path.join(self.base_dir, item)
                        try:
                            if os.path.isfile(item_path):
                                os.remove(item_path)
                                purged_files.append(item)
                            elif os.path.isdir(item_path):
                                shutil.rmtree(item_path)
                                purged_files.append(item)
                        except Exception as e:
                            logger.warning(f"Error purging file {item_path}: {e}")
        except Exception as e:
            logger.error(f"Error scanning media directory for purging: {e}")

        return {
            "deleted": True,
            "purged_count": len(purged_files),
            "purged_files": purged_files,
            "interview_id": interview_id
        }
