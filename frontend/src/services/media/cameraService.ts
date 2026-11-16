/**
 * InterviewGenie AI - Client-Side Camera & MediaStream Service
 * Implementation: getUserMedia Preview, Device Selection, Mic/Camera Muting,
 * Permission Guarding, and Complete Resource Cleanup.
 * Specification: specs/tasks/media_task.md
 */

import type {
  CameraState,
  MediaDeviceItem,
  PermissionStatusSummary,
} from './types.ts';

type StateListener = (state: CameraState) => void;
type ErrorListener = (error: string) => void;
type PermissionListener = (status: PermissionStatusSummary) => void;

export class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  private state: CameraState = {
    hasStream: false,
    isVideoActive: false,
    isAudioActive: false,
    isCameraMuted: false,
    isMicrophoneMuted: false,
    selectedVideoDeviceId: undefined,
    selectedAudioDeviceId: undefined,
    error: null,
  };

  private permissions: PermissionStatusSummary = {
    camera: 'prompt',
    microphone: 'prompt',
  };

  private stateListeners: Set<StateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private permissionListeners: Set<PermissionListener> = new Set();

  constructor() {
    this.listenToDeviceChanges();
    this.checkPermissions().catch(() => {});
  }

  // ==========================================
  // Device Enumeration & Event Handlers
  // ==========================================

  private listenToDeviceChanges(): void {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        try {
          await this.getAvailableDevices();
        } catch {
          // Non-fatal device change lookup
        }
      });
    }
  }

  public async getAvailableDevices(): Promise<{
    videoDevices: MediaDeviceItem[];
    audioDevices: MediaDeviceItem[];
  }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return { videoDevices: [], audioDevices: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices: MediaDeviceItem[] = [];
      const audioDevices: MediaDeviceItem[] = [];

      devices.forEach((device, index) => {
        if (device.kind === 'videoinput') {
          videoDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
            kind: 'videoinput',
          });
        } else if (device.kind === 'audioinput') {
          audioDevices.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
            kind: 'audioinput',
          });
        }
      });

      return { videoDevices, audioDevices };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enumerate media devices';
      this.notifyError(msg);
      return { videoDevices: [], audioDevices: [] };
    }
  }

  // ==========================================
  // Permissions Guard
  // ==========================================

  public async checkPermissions(): Promise<PermissionStatusSummary> {
    const summary: PermissionStatusSummary = {
      camera: this.permissions.camera || 'prompt',
      microphone: this.permissions.microphone || 'prompt',
    };

    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return summary;
    }

    try {
      // Query camera permission
      const camQuery = await navigator.permissions.query({ name: 'camera' as unknown as PermissionName });
      summary.camera = camQuery.state;
      camQuery.onchange = () => {
        this.permissions.camera = camQuery.state;
        this.notifyPermissions();
      };
    } catch {
      // Browser may not support querying camera directly
    }

    try {
      // Query microphone permission
      const micQuery = await navigator.permissions.query({ name: 'microphone' as unknown as PermissionName });
      summary.microphone = micQuery.state;
      micQuery.onchange = () => {
        this.permissions.microphone = micQuery.state;
        this.notifyPermissions();
      };
    } catch {
      // Browser may not support querying microphone directly
    }

    this.permissions = summary;
    this.notifyPermissions();
    return summary;
  }

  public getPermissions(): PermissionStatusSummary {
    return { ...this.permissions };
  }

  public onPermissionChange(listener: PermissionListener): () => void {
    this.permissionListeners.add(listener);
    listener({ ...this.permissions });
    return () => this.permissionListeners.delete(listener);
  }

  private notifyPermissions(): void {
    this.permissionListeners.forEach(listener => listener({ ...this.permissions }));
  }

  // ==========================================
  // Preview Lifecycle & Stream Setup
  // ==========================================

  /**
   * Starts camera and microphone preview.
   * Configures echo cancellation and noise suppression for high quality audio.
   */
  public async startPreview(
    videoElement?: HTMLVideoElement | null,
    customConstraints?: MediaStreamConstraints
  ): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = 'getUserMedia is not supported by your browser.';
      this.updateState({ error: msg });
      this.notifyError(msg);
      throw new Error(msg);
    }

    // Stop any existing stream first
    this.stopPreview();

    if (videoElement) {
      this.videoElement = videoElement;
    }

    // Default professional audio/video constraints
    const constraints: MediaStreamConstraints = customConstraints || {
      video: this.state.selectedVideoDeviceId
        ? {
            deviceId: { exact: this.state.selectedVideoDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
      audio: this.state.selectedAudioDeviceId
        ? {
            deviceId: { exact: this.state.selectedAudioDeviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;

      // Attach stream to preview element if provided
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        // Preview should be locally muted to prevent speaker howl/feedback
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        try {
          await this.videoElement.play();
        } catch {
          // User interaction policy might require user click
        }
      }

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      // Retrieve selected device IDs from tracks
      const videoDeviceId = videoTracks[0]?.getSettings().deviceId || this.state.selectedVideoDeviceId;
      const audioDeviceId = audioTracks[0]?.getSettings().deviceId || this.state.selectedAudioDeviceId;

      this.permissions = {
        camera: 'granted',
        microphone: 'granted',
      };
      this.notifyPermissions();

      this.updateState({
        hasStream: true,
        isVideoActive: videoTracks.length > 0 && videoTracks[0].enabled,
        isAudioActive: audioTracks.length > 0 && audioTracks[0].enabled,
        isCameraMuted: !videoTracks[0]?.enabled,
        isMicrophoneMuted: !audioTracks[0]?.enabled,
        selectedVideoDeviceId: videoDeviceId,
        selectedAudioDeviceId: audioDeviceId,
        error: null,
      });

      return stream;
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      let friendlyMessage = 'Unable to access camera or microphone.';

      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        friendlyMessage = 'Camera or microphone access was denied. Please grant permission in browser settings.';
        this.permissions = {
          camera: 'denied',
          microphone: 'denied',
        };
        this.notifyPermissions();
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        friendlyMessage = 'No camera or microphone device was found on this system.';
      } else if (errorObj.name === 'NotReadableError' || errorObj.name === 'TrackStartError') {
        friendlyMessage = 'Hardware camera/microphone is currently in use by another application.';
      } else if (errorObj.name === 'OverconstrainedError') {
        friendlyMessage = 'The requested video resolution is not supported by your camera.';
      } else if (errorObj.message) {
        friendlyMessage = errorObj.message;
      }

      this.updateState({
        hasStream: false,
        isVideoActive: false,
        isAudioActive: false,
        error: friendlyMessage,
      });
      this.notifyError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  }

  /**
   * Stops all active audio/video tracks and detaches preview element.
   * Completely releases hardware resources on component unmount.
   */
  public stopPreview(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // Track already stopped
        }
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.updateState({
      hasStream: false,
      isVideoActive: false,
      isAudioActive: false,
      isCameraMuted: false,
      isMicrophoneMuted: false,
      error: null,
    });
  }

  // ==========================================
  // Device Controls (Mute / Unmute / Toggles)
  // ==========================================

  /**
   * Toggles camera video track enabled state.
   * If explicitEnabled is provided, sets it to that boolean.
   */
  public toggleCamera(explicitEnabled?: boolean): boolean {
    if (!this.stream) return false;

    const videoTracks = this.stream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const newEnabled = explicitEnabled !== undefined ? explicitEnabled : !videoTracks[0].enabled;
    videoTracks.forEach(track => {
      track.enabled = newEnabled;
    });

    this.updateState({
      isVideoActive: newEnabled,
      isCameraMuted: !newEnabled,
    });

    return newEnabled;
  }

  /**
   * Toggles microphone audio track enabled state.
   * If explicitEnabled is provided, sets it to that boolean.
   */
  public toggleMicrophone(explicitEnabled?: boolean): boolean {
    if (!this.stream) return false;

    const audioTracks = this.stream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const newEnabled = explicitEnabled !== undefined ? explicitEnabled : !audioTracks[0].enabled;
    audioTracks.forEach(track => {
      track.enabled = newEnabled;
    });

    this.updateState({
      isAudioActive: newEnabled,
      isMicrophoneMuted: !newEnabled,
    });

    return newEnabled;
  }

  public isCameraMuted(): boolean {
    return this.state.isCameraMuted;
  }

  public isMicrophoneMuted(): boolean {
    return this.state.isMicrophoneMuted;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getState(): CameraState {
    return { ...this.state };
  }

  // ==========================================
  // Device Switching
  // ==========================================

  public async switchVideoDevice(deviceId: string): Promise<MediaStream> {
    this.state.selectedVideoDeviceId = deviceId;
    return this.startPreview(this.videoElement);
  }

  public async switchAudioDevice(deviceId: string): Promise<MediaStream> {
    this.state.selectedAudioDeviceId = deviceId;
    return this.startPreview(this.videoElement);
  }

  // ==========================================
  // State Subscriptions
  // ==========================================

  private updateState(partial: Partial<CameraState>): void {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach(listener => listener({ ...this.state }));
  }

  private notifyError(error: string): void {
    this.errorListeners.forEach(listener => listener(error));
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener({ ...this.state });
    return () => this.stateListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Complete teardown
   */
  public destroy(): void {
    this.stopPreview();
    this.stateListeners.clear();
    this.errorListeners.clear();
    this.permissionListeners.clear();
  }
}

// Global singleton instance for easy import
export const cameraService = new CameraService();
