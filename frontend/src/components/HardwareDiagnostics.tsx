// src/components/HardwareDiagnostics.tsx
import React, { useState } from 'react';
import { useCamera, useVoice, playSpeakerChime } from '../services/media';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Play,
  Check,
  Sparkles,
} from 'lucide-react';

interface HardwareDiagnosticsProps {
  onCalibrationComplete?: (isReady: boolean) => void;
  className?: string;
}

export const HardwareDiagnostics: React.FC<HardwareDiagnosticsProps> = ({
  onCalibrationComplete,
  className = '',
}) => {
  // Media hooks
  const {
    videoRef,
    cameraState,
    permissions,
    videoDevices,
    audioDevices,
    micLevel,
    isLoading,
    isCameraMuted,
    isMicrophoneMuted,
    toggleCamera,
    toggleMicrophone,
    switchCamera,
    switchMicrophone,
    checkPermissions,
  } = useCamera({ autoStart: true });

  const { speak } = useVoice();

  // Test State
  const [isPlayingChime, setIsPlayingChime] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [speakerTestState, setSpeakerTestState] = useState<'untested' | 'prompt' | 'passed' | 'failed'>('untested');
  const [hasTestedMic, setHasTestedMic] = useState(false);

  // Track if microphone activity has been detected
  React.useEffect(() => {
    if (micLevel > 15 && !hasTestedMic) {
      setHasTestedMic(true);
    }
  }, [micLevel, hasTestedMic]);

  // Overall hardware readiness
  const isCameraReady = cameraState.hasStream && !isCameraMuted;
  const isMicReady = cameraState.hasStream && !isMicrophoneMuted && (hasTestedMic || micLevel > 0);
  const isSpeakerReady = speakerTestState === 'passed';
  const allReady = isCameraReady && isMicReady && isSpeakerReady;

  React.useEffect(() => {
    onCalibrationComplete?.(allReady);
  }, [allReady, onCalibrationComplete]);

  // Play Harmonic Speaker Chime
  const handlePlayChime = async () => {
    setIsPlayingChime(true);
    setSpeakerTestState('prompt');
    try {
      await playSpeakerChime();
    } finally {
      setIsPlayingChime(false);
    }
  };

  // Play AI Voice Test
  const handleTestVoice = async () => {
    setIsPlayingVoice(true);
    setSpeakerTestState('prompt');
    try {
      await speak('Audio output verified. Your speakers and speech synthesis are calibrated for your interview.');
    } finally {
      setIsPlayingVoice(false);
    }
  };

  const getPermissionPill = (state: PermissionState | undefined) => {
    if (state === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Check className="w-2.5 h-2.5" /> Granted
        </span>
      );
    }
    if (state === 'denied') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-2.5 h-2.5" /> Denied
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Prompt
      </span>
    );
  };

  // Render 20 segmented LED meter bars
  const totalBars = 20;
  const activeBars = Math.round((micLevel / 100) * totalBars);

  return (
    <div className={`p-6 rounded-2xl bg-surface border border-gray-800 shadow-xl space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Pre-Flight Hardware Diagnostics</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-semibold lowercase tracking-normal">
              calibration
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Verify your camera framing, test microphone audio levels, and confirm speaker output before launching.
          </p>
        </div>

        {/* Global Permissions & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[11px] bg-surface-dark px-2.5 py-1 rounded-lg border border-gray-800">
            <span className="text-gray-400">Cam: {getPermissionPill(permissions?.camera)}</span>
            <span className="text-gray-700">|</span>
            <span className="text-gray-400">Mic: {getPermissionPill(permissions?.microphone)}</span>
          </div>

          <button
            type="button"
            onClick={() => checkPermissions()}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Refresh Permissions"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Diagnostic Grid: Camera Mirror (Left) & Audio Diagnostics (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (6 cols): Camera Mirror */}
        <div className="md:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
            <span className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-purple-400" />
              <span>Camera Mirror Preview</span>
            </span>

            {isCameraReady ? (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            ) : (
              <span className="text-[11px] text-gray-500">
                {isCameraMuted ? 'Video Muted' : 'No Feed'}
              </span>
            )}
          </div>

          {/* Video Mirror Box */}
          <div className="relative rounded-xl bg-surface-dark border border-gray-800 overflow-hidden aspect-video flex items-center justify-center shadow-inner group">
            {isCameraMuted || !cameraState.hasStream ? (
              <div className="flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center">
                <VideoOff className="w-8 h-8 mb-2 text-gray-600" />
                <p className="font-semibold text-gray-400">Camera Feed Inactive</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Click the camera icon below or check browser permissions.
                </p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />

                {/* Subtitle Framing Overlay */}
                <div className="absolute inset-4 border border-dashed border-blue-400/20 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between text-[9px] text-blue-400/60 font-mono">
                    <span>EYE LEVEL</span>
                    <span>HD 720P</span>
                  </div>
                  <div className="text-center text-[9px] text-blue-400/50 font-mono">
                    CENTER YOUR FRAME
                  </div>
                </div>
              </>
            )}

            {/* Quick Toggle Overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0B0F19]/80 backdrop-blur border border-gray-700/60 text-xs">
              <button
                type="button"
                onClick={() => toggleCamera()}
                className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold ${
                  isCameraMuted
                    ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40'
                    : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {isCameraMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                <span>{isCameraMuted ? 'Turn On' : 'Mute Video'}</span>
              </button>

              {/* Video Device Select */}
              {videoDevices.length > 0 && (
                <select
                  value={cameraState.selectedVideoDeviceId || ''}
                  onChange={(e) => switchCamera(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-800 text-[10px] text-gray-200 px-2 py-1 rounded border border-gray-700 outline-none max-w-[150px] truncate"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      📹 {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Microphone Level Meter & Speaker Chime Test */}
        <div className="md:col-span-6 flex flex-col justify-between gap-5">
          {/* 1. Microphone Level Meter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-blue-400" />
                <span>Microphone Input Level</span>
              </span>

              {isMicReady ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Voice Detected
                </span>
              ) : (
                <span className="text-[11px] text-gray-500">
                  {isMicrophoneMuted ? 'Mic Muted' : 'Awaiting Speech'}
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-dark border border-gray-800 space-y-3">
              {/* Segmented LED Volume Meter */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5">
                  <span>Input Volume</span>
                  <span className="font-mono text-white font-semibold">{micLevel}%</span>
                </div>

                <div className="flex items-center gap-1 h-3.5 bg-gray-900 p-0.5 rounded-md border border-gray-800">
                  {Array.from({ length: totalBars }).map((_, i) => {
                    const isLit = i < activeBars && !isMicrophoneMuted;
                    // Color gradient: Green -> Amber -> Rose
                    let barColor = 'bg-emerald-500 shadow-emerald-500/50';
                    if (i >= 12 && i < 17) {
                      barColor = 'bg-amber-400 shadow-amber-400/50';
                    } else if (i >= 17) {
                      barColor = 'bg-rose-500 shadow-rose-500/50';
                    }

                    return (
                      <span
                        key={i}
                        className={`flex-1 h-full rounded-xs transition-all duration-75 ${
                          isLit ? `${barColor} shadow-xs` : 'bg-gray-800'
                        }`}
                      />
                    );
                  })}
                </div>

                <p className="text-[10px] text-gray-500 mt-1.5 italic">
                  {isMicrophoneMuted
                    ? 'Microphone is muted. Unmute to calibrate voice.'
                    : micLevel > 15
                    ? 'Clear voice level detected! Calibration passed.'
                    : 'Speak into your microphone to calibrate input level...'}
                </p>
              </div>

              {/* Mic Controls & Device Selection */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleMicrophone()}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 text-[11px] font-semibold ${
                    isMicrophoneMuted
                      ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {isMicrophoneMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isMicrophoneMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>

                {audioDevices.length > 0 && (
                  <select
                    value={cameraState.selectedAudioDeviceId || ''}
                    onChange={(e) => switchMicrophone(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-800 text-[10px] text-gray-200 px-2 py-1 rounded border border-gray-700 outline-none max-w-[150px] truncate"
                  >
                    {audioDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        🎙️ {d.label || `Mic ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* 2. Speaker Chime Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Speaker Output & Chime Test</span>
              </span>

              {isSpeakerReady ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Audio Confirmed
                </span>
              ) : (
                <span className="text-[11px] text-gray-500">Test Required</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-dark border border-gray-800 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isPlayingChime || isPlayingVoice}
                  onClick={handlePlayChime}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isPlayingChime ? 'animate-spin' : 'fill-current'}`} />
                  <span>{isPlayingChime ? 'Playing Chime...' : 'Play Test Chime'}</span>
                </button>

                <button
                  type="button"
                  disabled={isPlayingChime || isPlayingVoice}
                  onClick={handleTestVoice}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isPlayingVoice ? 'Speaking...' : 'Test AI Voice'}</span>
                </button>
              </div>

              {/* Speaker Test Confirmation Dialog */}
              {speakerTestState === 'prompt' && (
                <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs flex flex-wrap items-center justify-between gap-2 animate-fade-in">
                  <span className="text-blue-200 text-[11px]">Did you clearly hear the sound?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSpeakerTestState('passed')}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                    >
                      Yes, Sounds Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlayChime()}
                      className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px]"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}

              {speakerTestState === 'passed' && (
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Speaker output successfully confirmed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calibration Readiness Summary Bar */}
      <div className="pt-3 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span className={`flex items-center gap-1 font-medium ${isCameraReady ? 'text-emerald-400' : 'text-gray-500'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Camera Framing
          </span>
          <span className={`flex items-center gap-1 font-medium ${isMicReady ? 'text-emerald-400' : 'text-gray-500'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Mic Input Levels
          </span>
          <span className={`flex items-center gap-1 font-medium ${isSpeakerReady ? 'text-emerald-400' : 'text-gray-500'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Speaker Output
          </span>
        </div>

        {allReady ? (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Fully Calibrated</span>
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">
            Complete the 3 quick checks above to ensure seamless interview simulation.
          </span>
        )}
      </div>
    </div>
  );
};
