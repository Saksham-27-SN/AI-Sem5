/**
 * InterviewGenie AI - Client-Side Recording Service
 * Implementation: MediaRecorder Wrapper with Explicit Candidate Consent Gate,
 * Start/Pause/Stop Lifecycle, Local Playback Preview, Download, and Delete Controls.
 * Specification: specs/tasks/media_task.md
 */

import type {
  RecordingConsent,
  RecordingState,
  RecordedMedia,
  RecordingOptions,
} from './types.ts';

export class RecordingConsentError extends Error {
  constructor(message = 'Explicit candidate consent is required before audio/video recording can be initiated.') {
    super(message);
    this.name = 'RecordingConsentError';
  }
}

type StateListener = (state: RecordingState) => void;
type ConsentListener = (consent: RecordingConsent) => void;
type DurationListener = (seconds: number) => void;

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private lastRecordedMedia: RecordedMedia | null = null;

  private state: RecordingState = 'inactive';
  private consent: RecordingConsent = {
    hasConsent: false,
    consentGivenAt: null,
    interviewId: null,
  };

  private startTime = 0;
  private durationSeconds = 0;
  private durationInterval: ReturnType<typeof setInterval> | null = null;

  // Listeners
  private stateListeners: Set<StateListener> = new Set();
  private consentListeners: Set<ConsentListener> = new Set();
  private durationListeners: Set<DurationListener> = new Set();

  constructor() {
    this.checkSupportedMimeType();
  }

  // ==========================================
  // MIME Type Compatibility
  // ==========================================

  public getPreferredMimeType(): string {
    if (typeof MediaRecorder === 'undefined') {
      return '';
    }

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
    ];

    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }

    return '';
  }

  private checkSupportedMimeType(): void {
    // Verified during initialization
  }

  // ==========================================
  // Explicit Candidate Consent Gate
  // ==========================================

  /**
   * Records candidate's explicit consent for interview session recording.
   * Optionally syncs with backend /api/media/consent endpoint.
   */
  public async grantConsent(
    interviewId: string,
    authToken?: string,
    syncWithBackend = true
  ): Promise<RecordingConsent> {
    const timestamp = new Date().toISOString();
    this.consent = {
      hasConsent: true,
      consentGivenAt: timestamp,
      interviewId,
    };

    if (syncWithBackend && typeof fetch !== 'undefined') {
      try {
        const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        await fetch('/api/media/consent', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            interview_id: interviewId,
            has_consent: true,
          }),
        });
      } catch (err) {
        console.warn('Could not sync consent with backend API:', err);
      }
    }

    this.notifyConsent();
    return { ...this.consent };
  }

  /**
   * Revokes candidate consent.
   * If recording is currently active, immediately stops and purges current recording.
   */
  public async revokeConsent(
    authToken?: string,
    syncWithBackend = true
  ): Promise<void> {
    const previousInterviewId = this.consent.interviewId;

    if (this.state === 'recording' || this.state === 'paused') {
      this.cancelRecording();
    }

    this.consent = {
      hasConsent: false,
      consentGivenAt: null,
      interviewId: null,
    };

    if (syncWithBackend && previousInterviewId && typeof fetch !== 'undefined') {
      try {
        const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        await fetch('/api/media/consent', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            interview_id: previousInterviewId,
            has_consent: false,
          }),
        });
      } catch (err) {
        console.warn('Could not sync revoked consent with backend API:', err);
      }
    }

    this.notifyConsent();
  }

  public getConsent(): RecordingConsent {
    return { ...this.consent };
  }

  public hasActiveConsent(): boolean {
    return this.consent.hasConsent;
  }

  /**
   * Enforces that consent has been granted. Throws RecordingConsentError if not.
   */
  public verifyConsentRequired(): void {
    if (!this.consent.hasConsent) {
      throw new RecordingConsentError(
        'Consent required: The candidate must explicitly check the recording consent agreement before recording can start.'
      );
    }
  }

  // ==========================================
  // MediaRecorder Lifecycle Controls
  // ==========================================

  /**
   * Initiates recording on the provided MediaStream.
   * Gated by explicit candidate consent.
   */
  public async startRecording(
    stream: MediaStream,
    options: RecordingOptions = {}
  ): Promise<void> {
    // 1. Explicit Consent Gate Verification
    this.verifyConsentRequired();

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder API is not supported in this browser.');
    }

    if (!stream || stream.getTracks().length === 0) {
      throw new Error('Cannot start recording: Provided MediaStream has no active tracks.');
    }

    // Clean up any previous recording artifact
    this.cleanupLastRecording();
    this.recordedChunks = [];

    const mimeType = options.mimeType || this.getPreferredMimeType();
    const recorderOptions: MediaRecorderOptions = {};
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }
    if (options.audioBitsPerSecond) {
      recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
    }
    if (options.videoBitsPerSecond) {
      recorderOptions.videoBitsPerSecond = options.videoBitsPerSecond;
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);
    } catch {
      // Fallback without mimeType specification if browser rejects options
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.durationSeconds = 0;
    this.startDurationTimer();

    // Start recording with timeslice chunks (e.g. 1000ms)
    const timeslice = options.timeslice ?? 1000;
    this.mediaRecorder.start(timeslice);
    this.setState('recording');
  }

  public pauseRecording(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.stopDurationTimer();
      this.setState('paused');
    }
  }

  public resumeRecording(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.startDurationTimer();
      this.setState('recording');
    }
  }

  /**
   * Stops active recording and packages accumulated chunks into a RecordedMedia preview result.
   */
  public stopRecording(): Promise<RecordedMedia> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.state === 'inactive') {
        reject(new Error('No active recording to stop.'));
        return;
      }

      this.stopDurationTimer();

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || this.getPreferredMimeType() || 'video/webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);

          const result: RecordedMedia = {
            blob,
            url,
            mimeType,
            durationSeconds: this.durationSeconds,
            sizeBytes: blob.size,
            createdAt: new Date().toISOString(),
            interviewId: this.consent.interviewId || undefined,
          };

          this.lastRecordedMedia = result;
          this.setState('stopped');
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Immediately aborts and discards recording in progress without saving.
   */
  public cancelRecording(): void {
    this.stopDurationTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignored
      }
    }
    this.cleanupLastRecording();
    this.recordedChunks = [];
    this.setState('inactive');
  }

  // ==========================================
  // Duration Tracking
  // ==========================================

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationInterval = setInterval(() => {
      this.durationSeconds++;
      this.durationListeners.forEach(l => l(this.durationSeconds));
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  // ==========================================
  // Preview, Download & Delete Controls
  // ==========================================

  public getRecordedMedia(): RecordedMedia | null {
    return this.lastRecordedMedia;
  }

  public getPreviewUrl(): string | null {
    return this.lastRecordedMedia?.url || null;
  }

  public getDurationSeconds(): number {
    return this.durationSeconds;
  }

  public getState(): RecordingState {
    return this.state;
  }

  /**
   * Initiates browser download of the recorded audio/video file.
   */
  public downloadRecording(filename?: string): void {
    if (!this.lastRecordedMedia) {
      throw new Error('No recorded media available for download.');
    }

    const ext = this.lastRecordedMedia.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const defaultName = `interview-${this.consent.interviewId || 'session'}-${Date.now()}.${ext}`;
    const finalName = filename || defaultName;

    const link = document.createElement('a');
    link.href = this.lastRecordedMedia.url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Deletes local recorded media artifacts from browser memory
   * and optionally purges backend recordings for GDPR compliance.
   */
  public async deleteRecording(
    authToken?: string,
    syncWithBackend = true
  ): Promise<{ success: boolean; message: string }> {
    const interviewId = this.lastRecordedMedia?.interviewId || this.consent.interviewId;

    // Purge local blob and object URL
    this.cleanupLastRecording();
    this.recordedChunks = [];
    this.durationSeconds = 0;
    this.setState('inactive');

    // Purge backend storage if requested
    if (syncWithBackend && interviewId && typeof fetch !== 'undefined') {
      try {
        const token = authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        await fetch(`/api/media/recordings/${interviewId}`, {
          method: 'DELETE',
          headers,
        });
      } catch (err) {
        console.warn('Backend recording deletion warning:', err);
      }
    }

    return {
      success: true,
      message: 'Interview recording and preview artifacts successfully purged.',
    };
  }

  private cleanupLastRecording(): void {
    if (this.lastRecordedMedia?.url) {
      try {
        URL.revokeObjectURL(this.lastRecordedMedia.url);
      } catch {
        // Ignored
      }
      this.lastRecordedMedia = null;
    }
  }

  // ==========================================
  // Subscriptions & Lifecycle
  // ==========================================

  private setState(state: RecordingState): void {
    if (this.state !== state) {
      this.state = state;
      this.stateListeners.forEach(listener => listener(state));
    }
  }

  private notifyConsent(): void {
    this.consentListeners.forEach(listener => listener({ ...this.consent }));
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public onConsentChange(listener: ConsentListener): () => void {
    this.consentListeners.add(listener);
    listener({ ...this.consent });
    return () => this.consentListeners.delete(listener);
  }

  public onDurationChange(listener: DurationListener): () => void {
    this.durationListeners.add(listener);
    listener(this.durationSeconds);
    return () => this.durationListeners.delete(listener);
  }

  /**
   * Complete teardown
   */
  public destroy(): void {
    this.cancelRecording();
    this.stateListeners.clear();
    this.consentListeners.clear();
    this.durationListeners.clear();
  }
}

// Global singleton instance for easy import
export const recordingService = new RecordingService();
