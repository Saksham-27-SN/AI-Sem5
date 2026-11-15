/**
 * InterviewGenie AI - React Custom Hooks for Voice, Camera & Recording Services
 * Idiomatic React integration for interview rooms, avatar lip-sync, turn-taking,
 * consent gates, and camera previews.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  VoiceRecognitionState,
  TurnTakingState,
  FallbackMode,
  SpeechMetrics,
  TranscriptUpdate,
  TTSOptions,
  CameraState,
  MediaDeviceItem,
  RecordingState,
  RecordingConsent,
  RecordedMedia,
  RecordingOptions,
} from './types.ts';
import { voiceService } from './voiceService.ts';
import { cameraService } from './cameraService.ts';
import { recordingService } from './recordingService.ts';

// ==========================================
// 1. useVoice Hook
// ==========================================

export interface UseVoiceOptions {
  autoStart?: boolean;
  onFinalTranscript?: (transcript: string, metrics: SpeechMetrics) => void;
  onInterimTranscript?: (transcript: string) => void;
  onFallbackActivated?: (mode: FallbackMode, reason: string) => void;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>(voiceService.getStatus());
  const [turnState, setTurnState] = useState<TurnTakingState>(voiceService.getTurnState());
  const [fallbackMode, setFallbackMode] = useState<FallbackMode>(voiceService.getFallbackMode());
  const [isAudioLocked, setIsAudioLocked] = useState<boolean>(voiceService.getIsAudioLocked());
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [fullTranscript, setFullTranscript] = useState<string>('');
  const [metrics, setMetrics] = useState<SpeechMetrics>({
    wordsPerMinute: 0,
    wordCount: 0,
    fillerWordsCount: 0,
    pauseCount: 0,
    durationSeconds: 0,
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(voiceService.isSpeaking());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(voiceService.getSelectedVoice());

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Subscribe to status changes
    const unsubStatus = voiceService.onStatus(setVoiceState);

    // Subscribe to turn state & lock changes
    const unsubTurn = voiceService.onTurnState((state) => {
      setTurnState(state);
      setIsAudioLocked(voiceService.getIsAudioLocked());
      setIsSpeaking(voiceService.isSpeaking());
    });

    // Subscribe to transcript events
    const unsubTranscript = voiceService.onTranscript((update: TranscriptUpdate) => {
      setFullTranscript(update.fullTranscript);
      setInterimTranscript(update.interimTranscript);
      if (update.isFinal && update.finalTranscript) {
        setTranscript(update.finalTranscript);
        optionsRef.current.onFinalTranscript?.(update.finalTranscript, update.metrics);
      } else if (update.interimTranscript) {
        optionsRef.current.onInterimTranscript?.(update.interimTranscript);
      }
      setMetrics(update.metrics);
    });

    // Subscribe to fallback events
    const unsubFallback = voiceService.onFallback((mode, reason) => {
      setFallbackMode(mode);
      optionsRef.current.onFallbackActivated?.(mode, reason);
    });

    // Initialize available TTS voices
    setVoices(voiceService.getVoices());
    setSelectedVoice(voiceService.getSelectedVoice());

    if (options.autoStart) {
      voiceService.startListening();
    }

    return () => {
      unsubStatus();
      unsubTurn();
      unsubTranscript();
      unsubFallback();
    };
  }, [options.autoStart]);

  const startListening = useCallback(() => {
    return voiceService.startListening();
  }, []);

  const stopListening = useCallback(() => {
    voiceService.stopListening();
  }, []);

  const pauseListening = useCallback(() => {
    voiceService.pauseListening();
  }, []);

  const resumeListening = useCallback(() => {
    voiceService.resumeListening();
  }, []);

  const clearTranscript = useCallback(() => {
    voiceService.clearTranscript();
    setTranscript('');
    setInterimTranscript('');
    setFullTranscript('');
  }, []);

  const submitManualTranscript = useCallback((text: string) => {
    voiceService.submitManualTranscript(text);
  }, []);

  const speak = useCallback(async (text: string, ttsOptions?: TTSOptions) => {
    setIsSpeaking(true);
    try {
      await voiceService.speak(text, ttsOptions);
    } finally {
      setIsSpeaking(voiceService.isSpeaking());
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const selectVoice = useCallback((voiceOrName: SpeechSynthesisVoice | string) => {
    voiceService.selectVoice(voiceOrName);
    setSelectedVoice(voiceService.getSelectedVoice());
  }, []);

  const forceKeyboardFallback = useCallback(() => {
    voiceService.forceKeyboardFallback();
  }, []);

  return {
    voiceState,
    turnState,
    fallbackMode,
    isAudioLocked,
    isSpeaking,
    transcript,
    interimTranscript,
    fullTranscript,
    metrics,
    voices,
    selectedVoice,
    isSpeechSupported: voiceService.isSpeechSupported(),
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    clearTranscript,
    submitManualTranscript,
    speak,
    stopSpeaking,
    selectVoice,
    forceKeyboardFallback,
  };
}

// ==========================================
// 2. useCamera Hook
// ==========================================

export interface UseCameraOptions {
  autoStart?: boolean;
  videoElement?: HTMLVideoElement | null;
  constraints?: MediaStreamConstraints;
}

export function useCamera(options: UseCameraOptions = {}) {
  const [cameraState, setCameraState] = useState<CameraState>(cameraService.getState());
  const [stream, setStream] = useState<MediaStream | null>(cameraService.getStream());
  const [videoDevices, setVideoDevices] = useState<MediaDeviceItem[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(options.videoElement || null);

  useEffect(() => {
    const unsubState = cameraService.onStateChange((state) => {
      setCameraState(state);
      setStream(cameraService.getStream());
    });

    const loadDevices = async () => {
      const devices = await cameraService.getAvailableDevices();
      setVideoDevices(devices.videoDevices);
      setAudioDevices(devices.audioDevices);
    };
    loadDevices();

    if (options.autoStart) {
      setIsLoading(true);
      cameraService
        .startPreview(videoRef.current, options.constraints)
        .catch(() => {
          // Handled via state.error
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    return () => {
      unsubState();
    };
  }, [options.autoStart, options.constraints]);

  const startCamera = useCallback(async (customVideoEl?: HTMLVideoElement | null) => {
    setIsLoading(true);
    const targetEl = customVideoEl || videoRef.current;
    try {
      const newStream = await cameraService.startPreview(targetEl, options.constraints);
      setStream(newStream);
      return newStream;
    } finally {
      setIsLoading(false);
    }
  }, [options.constraints]);

  const stopCamera = useCallback(() => {
    cameraService.stopPreview();
    setStream(null);
  }, []);

  const toggleCamera = useCallback((explicit?: boolean) => {
    return cameraService.toggleCamera(explicit);
  }, []);

  const toggleMicrophone = useCallback((explicit?: boolean) => {
    return cameraService.toggleMicrophone(explicit);
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    setIsLoading(true);
    try {
      const newStream = await cameraService.switchVideoDevice(deviceId);
      setStream(newStream);
      return newStream;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    setIsLoading(true);
    try {
      const newStream = await cameraService.switchAudioDevice(deviceId);
      setStream(newStream);
      return newStream;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    videoRef,
    stream,
    cameraState,
    videoDevices,
    audioDevices,
    isLoading,
    isCameraMuted: cameraState.isCameraMuted,
    isMicrophoneMuted: cameraState.isMicrophoneMuted,
    error: cameraState.error,
    startCamera,
    stopCamera,
    toggleCamera,
    toggleMicrophone,
    switchCamera,
    switchMicrophone,
    checkPermissions: cameraService.checkPermissions.bind(cameraService),
  };
}

// ==========================================
// 3. useRecording Hook
// ==========================================

export interface UseRecordingOptions {
  interviewId?: string;
}

export function useRecording(options: UseRecordingOptions = {}) {
  const [recordingState, setRecordingState] = useState<RecordingState>(recordingService.getState());
  const [consent, setConsent] = useState<RecordingConsent>(recordingService.getConsent());
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia | null>(recordingService.getRecordedMedia());
  const [durationSeconds, setDurationSeconds] = useState<number>(recordingService.getDurationSeconds());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubState = recordingService.onStateChange((state) => {
      setRecordingState(state);
      setRecordedMedia(recordingService.getRecordedMedia());
    });

    const unsubConsent = recordingService.onConsentChange(setConsent);
    const unsubDuration = recordingService.onDurationChange(setDurationSeconds);

    return () => {
      unsubState();
      unsubConsent();
      unsubDuration();
    };
  }, []);

  const grantConsent = useCallback(async (interviewId?: string, authToken?: string) => {
    const targetId = interviewId || options.interviewId || 'session-default';
    try {
      return await recordingService.grantConsent(targetId, authToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to grant recording consent';
      setError(msg);
      throw err;
    }
  }, [options.interviewId]);

  const revokeConsent = useCallback(async (authToken?: string) => {
    try {
      await recordingService.revokeConsent(authToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke recording consent';
      setError(msg);
      throw err;
    }
  }, []);

  const startRecording = useCallback(async (stream: MediaStream, recordingOptions?: RecordingOptions) => {
    setError(null);
    try {
      await recordingService.startRecording(stream, recordingOptions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(msg);
      throw err;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    recordingService.pauseRecording();
  }, []);

  const resumeRecording = useCallback(() => {
    recordingService.resumeRecording();
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const media = await recordingService.stopRecording();
      setRecordedMedia(media);
      return media;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(msg);
      throw err;
    }
  }, []);

  const downloadRecording = useCallback((filename?: string) => {
    recordingService.downloadRecording(filename);
  }, []);

  const deleteRecording = useCallback(async (authToken?: string, syncWithBackend = true) => {
    try {
      const res = await recordingService.deleteRecording(authToken, syncWithBackend);
      setRecordedMedia(null);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete recording';
      setError(msg);
      throw err;
    }
  }, []);

  return {
    recordingState,
    consent,
    hasConsent: consent.hasConsent,
    recordedMedia,
    previewUrl: recordedMedia?.url || null,
    durationSeconds,
    error,
    grantConsent,
    revokeConsent,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    downloadRecording,
    deleteRecording,
  };
}
