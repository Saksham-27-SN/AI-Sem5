/**
 * InterviewGenie AI - Media Services Entry Point
 * Cleanly exports all voice, camera, and recording services,
 * hooks, and type definitions for seamless consumption across the frontend.
 */

// Core Services & Singletons
import { CameraService, cameraService } from './cameraService.ts';
import { VoiceService, voiceService } from './voiceService.ts';
import { RecordingService, recordingService, RecordingConsentError } from './recordingService.ts';

// React Hooks & Hook Options
import {
  useCamera,
  useVoice,
  useRecording,
  useMicLevel,
  playSpeakerChime,
  type UseCameraOptions,
  type UseVoiceOptions,
  type UseRecordingOptions,
} from './useMedia.ts';

// Explicit re-exports of service classes and singleton instances
export { CameraService, cameraService };
export { VoiceService, voiceService };
export { RecordingService, recordingService, RecordingConsentError };
export { playSpeakerChime };

// Explicit re-exports of React hooks and options
export {
  useCamera,
  useVoice,
  useRecording,
  useMicLevel,
  type UseCameraOptions,
  type UseVoiceOptions,
  type UseRecordingOptions,
};

// TypeScript Types & Interfaces
export type {
  VoiceRecognitionState,
  TurnTakingState,
  FallbackMode,
  SpeechMetrics,
  TranscriptUpdate,
  SpeechRecognitionConfig,
  TTSOptions,
  VoiceServiceConfig,
  MediaDeviceItem,
  CameraState,
  PermissionStatusSummary,
  RecordingState,
  RecordingConsent,
  RecordedMedia,
  RecordingOptions,
  WebSpeechRecognitionEvent,
  WebSpeechRecognitionErrorEvent,
  IBrowserSpeechRecognition,
} from './types.ts';

// Re-export all types via type wildcard for future additions
export type * from './types.ts';

// Unified Default Export for convenient object-style access
const mediaServices = {
  camera: cameraService,
  cameraService,
  voice: voiceService,
  voiceService,
  recording: recordingService,
  recordingService,
  useCamera,
  useVoice,
  useRecording,
  useMicLevel,
  playSpeakerChime,
};

export default mediaServices;
