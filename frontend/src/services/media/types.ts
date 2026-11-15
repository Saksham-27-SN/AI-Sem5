/**
 * InterviewGenie AI - Media & Voice Services Type Definitions
 * Specification: specs/tasks/media_task.md
 */

// ==========================================
// Speech Recognition & Voice Types
// ==========================================

export type VoiceRecognitionState = 
  | 'idle'
  | 'listening'
  | 'paused'
  | 'processing'
  | 'error'
  | 'unsupported';

export type TurnTakingState =
  | 'IDLE'
  | 'AI_SPEAKING'
  | 'USER_SPEAKING'
  | 'LOCKED';

export type FallbackMode =
  | 'speech'
  | 'keyboard'
  | 'denied'
  | 'unsupported';

export interface SpeechMetrics {
  wordsPerMinute: number;
  wordCount: number;
  fillerWordsCount: number;
  pauseCount: number;
  durationSeconds: number;
}

export interface TranscriptUpdate {
  fullTranscript: string;
  interimTranscript: string;
  finalTranscript: string;
  isFinal: boolean;
  metrics: SpeechMetrics;
}

export interface SpeechRecognitionConfig {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface TTSOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number; // 0.5 to 2.0 (default 1.0)
  pitch?: number; // 0 to 2 (default 1.0)
  volume?: number; // 0 to 1 (default 1.0)
  lang?: string;
}

export interface VoiceServiceConfig extends SpeechRecognitionConfig {
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  turnTakingGuardMs?: number; // Acoustic buffer in ms after AI finishes speaking (default 350ms)
}

// ==========================================
// Camera & Hardware Stream Types
// ==========================================

export interface MediaDeviceItem {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput';
}

export interface CameraState {
  hasStream: boolean;
  isVideoActive: boolean;
  isAudioActive: boolean;
  isCameraMuted: boolean;
  isMicrophoneMuted: boolean;
  selectedVideoDeviceId?: string;
  selectedAudioDeviceId?: string;
  error: string | null;
}

export interface PermissionStatusSummary {
  camera: PermissionState;
  microphone: PermissionState;
}

// ==========================================
// Recording & Consent Types
// ==========================================

export type RecordingState =
  | 'inactive'
  | 'recording'
  | 'paused'
  | 'stopped';

export interface RecordingConsent {
  hasConsent: boolean;
  consentGivenAt: string | null;
  interviewId: string | null;
}

export interface RecordedMedia {
  blob: Blob;
  url: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  createdAt: string;
  interviewId?: string;
}

export interface RecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  timeslice?: number;
}

// ==========================================
// Ambient Web Speech API Declarations
// ==========================================

export interface WebSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface WebSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface IBrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: IBrowserSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: IBrowserSpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: IBrowserSpeechRecognition, ev: WebSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: IBrowserSpeechRecognition, ev: WebSpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
