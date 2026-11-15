# VOICE & MEDIA ENGINEER TASK SPECIFICATION
Agent Name: `media` (Pane `w2:p3`, Tab 3)
Owned Files: `media_services/*`, `frontend/src/services/media/*`

## Objectives:
1. Implement `frontend/src/services/media/voiceService.ts`:
   - Browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) wrapper with continuous or phrase-based listening.
   - Speech Synthesis (TTS) natural voice engine with playback rate and voice selection.
   - Turn-taking coordinator: Audio lock preventing AI spoken prompt from being transcribed by the microphone as student answer.
   - Graceful fallback to keyboard/text input when browser speech recognition is not supported or microphone access is denied.
2. Implement `frontend/src/services/media/cameraService.ts`:
   - `getUserMedia` camera and audio stream preview.
   - Microphone mute/unmute and camera toggle controls.
   - Stream resource cleanup on component unmount.
3. Implement `frontend/src/services/media/recordingService.ts`:
   - MediaRecorder wrapper that requires explicit candidate consent before initiating recording.
   - Recording start, pause, stop, local playback preview, download, and delete controls.
4. Report deliverables and verification to Master Orchestrator.
