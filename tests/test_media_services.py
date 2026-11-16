import pytest
import os
from media_services import MediaStorageService, AudioProcessor, RecordingManager, ConsentRequiredError

def test_recording_manager_consent_gate():
    manager = RecordingManager()
    interview_id = "test-interview-101"
    user_id = "user-101"

    # Initially no consent
    assert manager.check_consent(interview_id) is False
    with pytest.raises(ConsentRequiredError):
        manager.verify_consent(interview_id)

    # Grant consent
    rec = manager.register_consent(interview_id, user_id, has_consent=True)
    assert rec["has_consent"] is True
    assert rec["consent_given_at"] is not None
    assert manager.check_consent(interview_id) is True

    # Verify metadata generation succeeds with consent
    metadata = manager.get_session_recording_metadata(
        interview_id, duration_seconds=65.0, mime_type="video/webm"
    )
    assert metadata["interview_id"] == interview_id
    assert metadata["duration_seconds"] == 65.0
    assert metadata["extension"] == ".webm"

    # Test MP4 extension derivation
    mp4_meta = manager.get_session_recording_metadata(
        interview_id, duration_seconds=30.0, mime_type="video/mp4;codecs=h264"
    )
    assert mp4_meta["extension"] == ".mp4"

    # Revoke consent
    manager.revoke_consent(interview_id)
    assert manager.check_consent(interview_id) is False
    with pytest.raises(ConsentRequiredError):
        manager.verify_consent(interview_id)

def test_audio_processor_metrics():
    text = "Um, in my previous role, I actually led the backend microservices architecture. You know, basically it reduced latency."
    metrics = AudioProcessor.analyze_transcript_metrics(text, duration_seconds=30.0)
    assert metrics["word_count"] > 10
    assert metrics["words_per_minute"] > 0
    assert metrics["filler_words_count"] >= 3
    assert "um" in metrics["filler_words_breakdown"]

    constraints = AudioProcessor.get_echo_cancellation_constraints()
    assert constraints["echoCancellation"] is True
    assert constraints["noiseSuppression"] is True
    assert constraints["autoGainControl"] is True

def test_media_storage_lifecycle(tmp_path):
    storage = MediaStorageService(base_dir=str(tmp_path), quota_mb=10.0)
    interview_id = "test-session-202"
    user_id = "candidate-202"
    dummy_data = b"RIFF-WAVE-HEADER-MOCK-RECORDING-DATA"

    # Save media file
    saved = storage.save_media_file(interview_id, user_id, dummy_data, mime_type="video/webm")
    assert os.path.exists(saved["filepath"])
    assert saved["extension"] == ".webm"
    assert saved["size_bytes"] == len(dummy_data)

    # Verify quota tracking
    usage = storage.get_storage_usage_mb(user_id)
    assert usage >= 0.0

    # Purge media for GDPR Article 17
    purged = storage.purge_interview_media(interview_id, user_id)
    assert purged["deleted"] is True
    assert purged["purged_count"] >= 1
    assert not os.path.exists(saved["filepath"])

def test_media_cleanup_service_purged_recordings(tmp_path):
    """Verify MediaCleanupService cleans up purged recording files and orphaned temp artifacts."""
    from backend.app.services.media_cleanup_service import MediaCleanupService

    rec_dir = tmp_path / "recordings"
    up_dir = tmp_path / "uploads"
    rec_dir.mkdir()
    up_dir.mkdir()

    cleanup_svc = MediaCleanupService(recordings_dir=str(rec_dir), upload_dir=str(up_dir))

    interview_id = "purge-session-123"
    # Create fake recording files on disk
    rec_file1 = rec_dir / f"user1_{interview_id}_chunk1.webm"
    rec_file1.write_bytes(b"dummy-audio-bytes-12345")
    rec_file2 = rec_dir / f"{interview_id}_video.mp4"
    rec_file2.write_bytes(b"dummy-video-bytes-67890")

    assert rec_file1.exists()
    assert rec_file2.exists()

    # 1. Cleanup specific interview
    res = cleanup_svc.cleanup_interview_recordings(interview_id=interview_id)
    assert res["deleted"] is True
    assert res["purged_count"] == 2
    assert res["freed_bytes"] > 0
    assert not rec_file1.exists()
    assert not rec_file2.exists()

    # 2. Test orphan temporary files cleanup
    temp_orphan = rec_dir / "streaming_upload.tmp"
    temp_orphan.write_bytes(b"unfinished-temp-stream")
    part_orphan = rec_dir / "recording_chunk.part"
    part_orphan.write_bytes(b"unfinished-part")

    assert temp_orphan.exists()
    assert part_orphan.exists()

    # Create a mock DB object with no purged consents to test orphan scan
    from unittest.mock import MagicMock
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []

    sweep_res = cleanup_svc.cleanup_purged_recordings(db=mock_db)
    assert sweep_res["status"] == "success"
    assert sweep_res["orphaned_files_removed"] >= 2
    assert not temp_orphan.exists()
    assert not part_orphan.exists()
