"""
InterviewGenie AI - Media Services Package
Provides server-side audio/video processing, local encrypted storage, and GDPR-compliant recording lifecycle utilities.
"""

from .storage import MediaStorageService
from .audio_processor import AudioProcessor
from .recording_manager import RecordingManager, ConsentRequiredError

__all__ = [
    "MediaStorageService",
    "AudioProcessor",
    "RecordingManager",
    "ConsentRequiredError"
]
