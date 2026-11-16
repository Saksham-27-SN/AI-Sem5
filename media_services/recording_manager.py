"""
InterviewGenie AI - Recording Session Coordinator & Explicit Consent Gate
Guarantees candidate explicit consent before media can be initialized or saved.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

class ConsentRequiredError(Exception):
    """Raised when an operation requiring candidate media recording consent is attempted without valid consent."""
    pass

class RecordingManager:
    def __init__(self):
        # In-memory registry of active consent states: interview_id -> {has_consent: bool, consent_given_at: str, user_id: str}
        self._consents: Dict[str, Dict[str, Any]] = {}

    def register_consent(self, interview_id: str, user_id: str, has_consent: bool) -> Dict[str, Any]:
        """Explicitly records or updates candidate consent for a specific interview."""
        timestamp = datetime.now(timezone.utc).isoformat() if has_consent else None
        record = {
            "interview_id": interview_id,
            "user_id": user_id,
            "has_consent": has_consent,
            "consent_given_at": timestamp
        }
        self._consents[interview_id] = record
        return record

    def check_consent(self, interview_id: str) -> bool:
        """Returns True if explicit consent was granted for this interview session."""
        record = self._consents.get(interview_id)
        return bool(record and record.get("has_consent"))

    def verify_consent(self, interview_id: str) -> None:
        """Enforces consent gate: raises ConsentRequiredError if not consented."""
        if not self.check_consent(interview_id):
            raise ConsentRequiredError(
                f"Explicit candidate consent required before recording can begin for interview {interview_id}."
            )

    def revoke_consent(self, interview_id: str) -> Dict[str, Any]:
        """Revokes candidate consent and invalidates active session recording permission."""
        if interview_id in self._consents:
            self._consents[interview_id]["has_consent"] = False
            self._consents[interview_id]["consent_given_at"] = None
        return {"interview_id": interview_id, "has_consent": False, "revoked": True}

    def get_session_recording_metadata(
        self,
        interview_id: str,
        duration_seconds: float,
        file_path: Optional[str] = None,
        mime_type: str = "video/webm"
    ) -> Dict[str, Any]:
        """Returns metadata for recorded media preview and download."""
        self.verify_consent(interview_id)
        ext = ".mp4" if "mp4" in mime_type else ".webm"
        return {
            "interview_id": interview_id,
            "duration_seconds": duration_seconds,
            "mime_type": mime_type,
            "extension": ext,
            "has_consent": True,
            "file_path": file_path,
            "download_filename": f"interview_{interview_id}{ext}"
        }
