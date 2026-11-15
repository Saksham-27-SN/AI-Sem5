/**
 * InterviewGenie AI - Client-Side Voice Service
 * Implementation: Speech Recognition (STT), Speech Synthesis (TTS),
 * Turn-Taking Audio Lock & Graceful Keyboard Fallback.
 * Specification: specs/tasks/media_task.md
 */

import type {
  VoiceRecognitionState,
  TurnTakingState,
  FallbackMode,
  SpeechMetrics,
  TranscriptUpdate,
  VoiceServiceConfig,
  TTSOptions,
  IBrowserSpeechRecognition,
  WebSpeechRecognitionEvent,
  WebSpeechRecognitionErrorEvent,
} from './types.ts';

// Common conversational filler words in interview responses
const FILLER_WORDS = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'actually', 'basically', 
  'literally', 'honestly', 'you know', 'sort of', 'kind of',
  'i mean', 'right'
]);

type TranscriptListener = (update: TranscriptUpdate) => void;
type TurnStateListener = (state: TurnTakingState) => void;
type StatusListener = (status: VoiceRecognitionState) => void;
type FallbackListener = (mode: FallbackMode, reason: string) => void;
type ErrorListener = (error: string, isFatal: boolean) => void;

export class VoiceService {
  // Recognition state
  private recognition: IBrowserSpeechRecognition | null = null;
  private isListeningActive = false;
  private shouldRestartRecognition = false;
  private status: VoiceRecognitionState = 'idle';
  private fallbackMode: FallbackMode = 'speech';
  private config: VoiceServiceConfig;

  // Turn-taking and audio lock
  private turnState: TurnTakingState = 'IDLE';
  private isAudioLocked = false;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;
  private speakingStartTime: number | null = null;

  // Transcripts & metrics
  private accumulatedFinalTranscript = '';
  private currentInterimTranscript = '';
  private pauseCount = 0;
  private lastSpeechTimestamp = 0;
  private listeningStartTime = 0;

  // TTS State
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isTtsSpeaking = false;

  // Event Listeners
  private transcriptListeners: Set<TranscriptListener> = new Set();
  private turnStateListeners: Set<TurnStateListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private fallbackListeners: Set<FallbackListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  constructor(config: VoiceServiceConfig = {}) {
    this.config = {
      lang: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ttsRate: 1.0,
      ttsPitch: 1.0,
      ttsVolume: 1.0,
      turnTakingGuardMs: 350,
      ...config,
    };

    this.initSpeechSynthesis();
    this.initSpeechRecognition();
  }

  // ==========================================
  // Initialization & Feature Detection
  // ==========================================

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') {
      this.status = 'unsupported';
      this.fallbackMode = 'unsupported';
      return;
    }

    // Support standard and vendor prefixed webkitSpeechRecognition
    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => IBrowserSpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => IBrowserSpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      this.status = 'unsupported';
      this.fallbackMode = 'unsupported';
      this.notifyFallback('unsupported', 'Web Speech Recognition is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = this.config.continuous ?? true;
      this.recognition.interimResults = this.config.interimResults ?? true;
      this.recognition.lang = this.config.lang ?? 'en-US';
      this.recognition.maxAlternatives = this.config.maxAlternatives ?? 1;

      this.recognition.onstart = () => {
        this.setStatus('listening');
        if (this.turnState === 'IDLE' && !this.isAudioLocked) {
          this.setTurnState('USER_SPEAKING');
        }
      };

      this.recognition.onresult = (event: WebSpeechRecognitionEvent) => {
        this.handleRecognitionResult(event);
      };

      this.recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
        this.handleRecognitionError(event);
      };

      this.recognition.onend = () => {
        this.handleRecognitionEnd();
      };
    } catch (err) {
      this.status = 'error';
      this.fallbackMode = 'unsupported';
      const msg = err instanceof Error ? err.message : 'Unknown recognition init error';
      this.notifyError(msg, true);
      this.notifyFallback('unsupported', msg);
    }
  }

  private initSpeechSynthesis(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      if (this.voices.length > 0 && !this.selectedVoice) {
        // Prefer natural / high-quality English voices
        const preferredVoices = [
          'Google US English',
          'Samantha',
          'Microsoft Jenny Online (Natural)',
          'Microsoft Guy Online (Natural)',
          'Microsoft David - English (United States)',
          'Daniel',
        ];

        for (const preferred of preferredVoices) {
          const found = this.voices.find(v => v.name.includes(preferred));
          if (found) {
            this.selectedVoice = found;
            break;
          }
        }

        if (!this.selectedVoice) {
          this.selectedVoice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
        }
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // ==========================================
  // Turn-Taking Coordinator & Audio Lock
  // ==========================================

  /**
   * Acquires the turn-taking audio lock.
   * Prevents AI spoken prompts (via speaker) from leaking into microphone input
   * and being transcribed as student answers.
   */
  public acquireAudioLock(reason = 'AI is speaking'): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }

    this.isAudioLocked = true;
    this.setTurnState('AI_SPEAKING');

    // Pause recognition listening to prevent acoustic bleed
    if (this.recognition && this.isListeningActive) {
      try {
        this.recognition.stop();
      } catch {
        // Recognition might already be stopped
      }
    }
  }

  /**
   * Releases the audio lock with a configurable acoustic dissipation guard.
   * Debounces the release so room reverb / speaker reflections clear before mic opens.
   */
  public releaseAudioLock(): void {
    const guardMs = this.config.turnTakingGuardMs ?? 350;

    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    this.setTurnState('LOCKED');

    this.lockTimer = setTimeout(() => {
      this.isAudioLocked = false;
      this.lockTimer = null;
      this.setTurnState(this.isListeningActive ? 'USER_SPEAKING' : 'IDLE');

      // Safely resume microphone listening for candidate answer
      if (this.isListeningActive && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // May already be started or restarting
        }
      }
    }, guardMs);
  }

  public getIsAudioLocked(): boolean {
    return this.isAudioLocked;
  }

  public getTurnState(): TurnTakingState {
    return this.turnState;
  }

  private setTurnState(state: TurnTakingState): void {
    if (this.turnState !== state) {
      this.turnState = state;
      this.turnStateListeners.forEach(listener => listener(state));
    }
  }

  // ==========================================
  // Speech Recognition (STT) Controls
  // ==========================================

  public startListening(): boolean {
    if (this.fallbackMode === 'denied' || this.fallbackMode === 'unsupported') {
      return false;
    }

    if (!this.recognition) {
      this.notifyFallback('unsupported', 'Speech recognition engine is unavailable.');
      return false;
    }

    this.isListeningActive = true;
    this.shouldRestartRecognition = true;
    this.listeningStartTime = Date.now();
    this.lastSpeechTimestamp = Date.now();

    // If audio lock is currently held by AI speaking, defer actual mic start
    if (this.isAudioLocked) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch {
      // If already started, ignore error
      return true;
    }
  }

  public stopListening(): void {
    this.isListeningActive = false;
    this.shouldRestartRecognition = false;
    this.setStatus('idle');
    if (this.turnState === 'USER_SPEAKING') {
      this.setTurnState('IDLE');
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignored
      }
    }
  }

  public pauseListening(): void {
    this.shouldRestartRecognition = false;
    this.setStatus('paused');
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignored
      }
    }
  }

  public resumeListening(): void {
    if (this.isListeningActive) {
      this.startListening();
    }
  }

  public clearTranscript(): void {
    this.accumulatedFinalTranscript = '';
    this.currentInterimTranscript = '';
    this.pauseCount = 0;
    this.listeningStartTime = Date.now();
    this.lastSpeechTimestamp = Date.now();
    this.emitTranscriptUpdate('', '', '', true);
  }

  /**
   * Direct manual submission of text transcript for keyboard fallback mode
   * or inline candidate corrections.
   */
  public submitManualTranscript(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.accumulatedFinalTranscript) {
      this.accumulatedFinalTranscript += ' ' + trimmed;
    } else {
      this.accumulatedFinalTranscript = trimmed;
    }
    this.currentInterimTranscript = '';

    this.emitTranscriptUpdate(
      this.accumulatedFinalTranscript,
      '',
      trimmed,
      true
    );
  }

  // ==========================================
  // Recognition Event Handlers
  // ==========================================

  private handleRecognitionResult(event: WebSpeechRecognitionEvent): void {
    // AUDIO LOCK ENFORCEMENT:
    // If AI is speaking or turn is locked, drop audio input immediately
    if (this.isAudioLocked || this.turnState === 'AI_SPEAKING' || this.turnState === 'LOCKED') {
      return;
    }

    const now = Date.now();
    if (this.lastSpeechTimestamp && (now - this.lastSpeechTimestamp > 1800)) {
      this.pauseCount++;
    }
    this.lastSpeechTimestamp = now;

    let interim = '';
    let finalChunk = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      if (result.isFinal) {
        finalChunk += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

    if (finalChunk) {
      finalChunk = finalChunk.trim();
      if (this.accumulatedFinalTranscript) {
        this.accumulatedFinalTranscript += ' ' + finalChunk;
      } else {
        this.accumulatedFinalTranscript = finalChunk;
      }
    }

    this.currentInterimTranscript = interim;

    const full = this.accumulatedFinalTranscript + (interim ? ' ' + interim : '');
    this.emitTranscriptUpdate(full, interim, finalChunk, !!finalChunk);
  }

  private handleRecognitionError(event: WebSpeechRecognitionErrorEvent): void {
    const errorType = event.error;

    // Handle permission denials & device unavailability
    if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
      this.isListeningActive = false;
      this.shouldRestartRecognition = false;
      this.fallbackMode = 'denied';
      this.setStatus('error');
      this.notifyError('Microphone permission denied. Switched to keyboard input.', true);
      this.notifyFallback('denied', 'Microphone permission denied. Switched to keyboard input.');
      return;
    }

    if (errorType === 'no-speech') {
      // Non-fatal, keep listening
      return;
    }

    if (errorType === 'aborted') {
      // Normal when stopping or pausing
      return;
    }

    this.notifyError(`Speech recognition error: ${errorType}`, false);
  }

  private handleRecognitionEnd(): void {
    // If listening is supposed to be continuous and lock isn't held, auto-restart
    if (this.isListeningActive && this.shouldRestartRecognition && !this.isAudioLocked) {
      try {
        this.recognition?.start();
      } catch {
        // Recognition might already be restarting
      }
    } else if (!this.isAudioLocked) {
      this.setStatus('idle');
      if (this.turnState === 'USER_SPEAKING') {
        this.setTurnState('IDLE');
      }
    }
  }

  // ==========================================
  // Metrics Computation
  // ==========================================

  private computeMetrics(text: string): SpeechMetrics {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Detect filler words
    let fillerWordsCount = 0;
    const lower = text.toLowerCase();
    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        fillerWordsCount += matches.length;
      }
    }

    // Compute duration and WPM
    const durationSeconds = this.listeningStartTime > 0 
      ? Math.max(1, Math.round((Date.now() - this.listeningStartTime) / 1000))
      : 1;

    const durationMinutes = durationSeconds / 60;
    const wordsPerMinute = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

    return {
      wordsPerMinute,
      wordCount,
      fillerWordsCount,
      pauseCount: this.pauseCount,
      durationSeconds,
    };
  }

  private emitTranscriptUpdate(
    fullTranscript: string,
    interimTranscript: string,
    finalTranscript: string,
    isFinal: boolean
  ): void {
    const metrics = this.computeMetrics(fullTranscript);
    const update: TranscriptUpdate = {
      fullTranscript,
      interimTranscript,
      finalTranscript,
      isFinal,
      metrics,
    };

    this.transcriptListeners.forEach(listener => listener(update));
  }

  // ==========================================
  // Speech Synthesis (TTS) Engine
  // ==========================================

  public getVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  public selectVoice(voiceOrName: SpeechSynthesisVoice | string): void {
    if (typeof voiceOrName === 'string') {
      const found = this.voices.find(v => v.name === voiceOrName);
      if (found) this.selectedVoice = found;
    } else {
      this.selectedVoice = voiceOrName;
    }
  }

  public setTtsRate(rate: number): void {
    this.config.ttsRate = Math.min(Math.max(rate, 0.5), 2.0);
  }

  public setTtsPitch(pitch: number): void {
    this.config.ttsPitch = Math.min(Math.max(pitch, 0.0), 2.0);
  }

  public setTtsVolume(volume: number): void {
    this.config.ttsVolume = Math.min(Math.max(volume, 0.0), 1.0);
  }

  /**
   * Speaks the provided text using the natural voice synthesis engine.
   * Automatically coordinates with the Turn-Taking Coordinator and Audio Lock:
   * 1. Acquires lock and suspends mic input before sound starts.
   * 2. Plays synthesized speech.
   * 3. Releases lock after acoustic dissipation window.
   */
  public speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Fallback: If TTS unsupported, resolve without throwing
        resolve();
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) {
        resolve();
        return;
      }

      // Stop any active utterance
      this.stopSpeaking();

      // Acquire audio lock immediately before speaking
      this.acquireAudioLock('AI Interviewer Speaking');
      this.isTtsSpeaking = true;

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.voice = options.voice || this.selectedVoice;
      utterance.rate = options.rate ?? this.config.ttsRate ?? 1.0;
      utterance.pitch = options.pitch ?? this.config.ttsPitch ?? 1.0;
      utterance.volume = options.volume ?? this.config.ttsVolume ?? 1.0;
      if (options.lang) utterance.lang = options.lang;

      utterance.onend = () => {
        this.isTtsSpeaking = false;
        this.releaseAudioLock();
        resolve();
      };

      utterance.onerror = (ev) => {
        this.isTtsSpeaking = false;
        this.releaseAudioLock();
        if (ev.error === 'canceled' || ev.error === 'interrupted') {
          resolve();
        } else {
          this.notifyError(`TTS playback error: ${ev.error}`, false);
          reject(new Error(`TTS error: ${ev.error}`));
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isTtsSpeaking = false;
      if (this.isAudioLocked) {
        this.releaseAudioLock();
      }
    }
  }

  public pauseSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resumeSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  public isSpeaking(): boolean {
    return this.isTtsSpeaking;
  }

  // ==========================================
  // Fallback & Status Management
  // ==========================================

  public getStatus(): VoiceRecognitionState {
    return this.status;
  }

  public getFallbackMode(): FallbackMode {
    return this.fallbackMode;
  }

  public isSpeechSupported(): boolean {
    return this.status !== 'unsupported';
  }

  public forceKeyboardFallback(): void {
    this.stopListening();
    this.fallbackMode = 'keyboard';
    this.notifyFallback('keyboard', 'User switched to manual keyboard input.');
  }

  private setStatus(status: VoiceRecognitionState): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  private notifyFallback(mode: FallbackMode, reason: string): void {
    this.fallbackListeners.forEach(listener => listener(mode, reason));
  }

  private notifyError(error: string, isFatal: boolean): void {
    this.errorListeners.forEach(listener => listener(error, isFatal));
  }

  // ==========================================
  // Subscription Handlers
  // ==========================================

  public onTranscript(listener: TranscriptListener): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  public onTurnState(listener: TurnStateListener): () => void {
    this.turnStateListeners.add(listener);
    // Emit initial state
    listener(this.turnState);
    return () => this.turnStateListeners.delete(listener);
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public onFallback(listener: FallbackListener): () => void {
    this.fallbackListeners.add(listener);
    return () => this.fallbackListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Complete cleanup for component unmount
   */
  public destroy(): void {
    this.stopListening();
    this.stopSpeaking();
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    this.transcriptListeners.clear();
    this.turnStateListeners.clear();
    this.statusListeners.clear();
    this.fallbackListeners.clear();
    this.errorListeners.clear();
  }
}

// Global singleton instance for easy import
export const voiceService = new VoiceService();
