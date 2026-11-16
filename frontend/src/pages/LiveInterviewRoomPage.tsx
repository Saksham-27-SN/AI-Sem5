// src/pages/LiveInterviewRoomPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVoice, useCamera, useRecording } from '../services/media';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Question } from '../types';
import {
  Button,
  Card,
  Badge,
  Container,
  Modal,
} from '../components/ui';
import {
  Sparkles,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Square,
  Volume2,
  CheckCircle2,
  Clock,
  Settings,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Download,
  Trash2,
  Play,
  Lock,
  AlertCircle,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';

export const LiveInterviewRoomPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'session_demo_live';
  const initialConsentParam = searchParams.get('consent') === 'true';
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Live Interview Room | InterviewGenie AI';
  }, []);

  // 1. Voice & TTS Media Hook
  const {
    voiceState,
    turnState,
    fallbackMode,
    isAudioLocked,
    isSpeaking,
    isSpeechSupported,
    fullTranscript,
    interimTranscript,
    metrics,
    voices,
    selectedVoice,
    startListening,
    stopListening,
    clearTranscript,
    speak,
    stopSpeaking,
    selectVoice,
  } = useVoice();

  // 2. Camera & Hardware Stream Hook
  const {
    videoRef,
    stream,
    cameraState,
    permissions,
    videoDevices,
    audioDevices,
    stopCamera,
    toggleCamera,
    toggleMicrophone,
    switchCamera,
    switchMicrophone,
    checkPermissions,
  } = useCamera({ autoStart: true });

  // 3. Recording & GDPR Consent Hook
  const {
    recordingState,
    hasConsent,
    recordedMedia,
    previewUrl,
    durationSeconds: recDuration,
    startRecording,
    stopRecording,
    downloadRecording,
    deleteRecording,
    grantConsent,
    revokeConsent,
  } = useRecording({ interviewId: sessionId });

  // Room State
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: 'q_001',
    order_index: 1,
    round_type: 'hr',
    category: 'Background & STAR Experience',
    difficulty: 'medium',
    question_text:
      'Tell me about a time you led a challenging technical project under tight deadlines. What was the situation and how did you resolve roadblocks?',
    is_follow_up: false,
  });
  const [questionProgress, setQuestionProgress] = useState({ current: 1, total: 5 });
  const [editableAnswer, setEditableAnswer] = useState('');
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interimFeedback, setInterimFeedback] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Modals & Controls State
  const [showSettings, setShowSettings] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [explicitConsentChecked, setExplicitConsentChecked] = useState(initialConsentParam);
  const [isDeletingRecording, setIsDeletingRecording] = useState(false);

  // Determine active input fallback mode
  const isFallbackActive =
    !isSpeechSupported ||
    fallbackMode === 'unsupported' ||
    fallbackMode === 'denied' ||
    fallbackMode === 'keyboard' ||
    isManualEdit;

  // Sync spoken transcript to editable answer when not manually typing
  useEffect(() => {
    if (!isManualEdit && fullTranscript) {
      setEditableAnswer(fullTranscript);
    }
  }, [fullTranscript, isManualEdit]);

  // If speech becomes unsupported or denied, automatically enable manual keyboard mode
  useEffect(() => {
    if (!isSpeechSupported || fallbackMode === 'unsupported' || fallbackMode === 'denied') {
      setIsManualEdit(true);
    }
  }, [isSpeechSupported, fallbackMode]);

  // Session elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize session question and handle initial consent
  useEffect(() => {
    let active = true;

    async function initSession() {
      const token = localStorage.getItem('token');
      if (!sessionId || !token || sessionId === 'session_demo_live') return;
      try {
        const startRes = await api.startInterview(sessionId);
        if (active && startRes?.current_question) {
          setCurrentQuestion(startRes.current_question);
          setQuestionProgress(startRes.progress || { current: 1, total: 5 });
        }
      } catch {
        // Fallback to initial question
      }
    }

    initSession();
    checkPermissions().catch(() => {});

    const token = localStorage.getItem('token');
    if (initialConsentParam && sessionId && token && sessionId !== 'session_demo_live') {
      grantConsent(sessionId).catch(() => {});
    }

    return () => {
      active = false;
      stopSpeaking();
      stopListening();
      stopCamera();
    };
  }, [sessionId, initialConsentParam]);

  // Auto start recording when stream is active AND explicit consent is verified
  useEffect(() => {
    if (stream && hasConsent && recordingState === 'inactive') {
      startRecording(stream).catch((err) => {
        console.warn('Could not auto-start recording:', err);
      });
    }
  }, [stream, hasConsent, recordingState]);

  // Consent Management Handlers
  const handleToggleConsent = async (agreed: boolean) => {
    setExplicitConsentChecked(agreed);
    if (agreed) {
      try {
        await grantConsent(sessionId);
        showToast('success', 'Consent Granted', 'Audio/video recording is now enabled for this session.');
        if (stream && recordingState === 'inactive') {
          await startRecording(stream);
        }
      } catch {
        showToast('error', 'Consent Error', 'Failed to register recording consent.');
      }
    } else {
      try {
        await revokeConsent();
        showToast('info', 'Consent Revoked', 'Recording stopped and consent revoked.');
      } catch {
        showToast('error', 'Revocation Error', 'Failed to revoke recording consent.');
      }
    }
  };

  // Handle Repeat Question
  const handleRepeatQuestion = async () => {
    try {
      stopSpeaking();
      speak(`Repeating the question: ${currentQuestion.question_text}`);
      showToast('info', 'Repeating Question', 'AI interviewer is repeating the question.');
    } catch {
      speak(currentQuestion.question_text);
    }
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    const answerToSubmit = editableAnswer.trim() || fullTranscript.trim();
    if (!answerToSubmit) {
      showToast('warning', 'Answer Required', 'Please speak or type your answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    stopListening();

    try {
      const response = await api.submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        answer_text: answerToSubmit,
        duration_seconds: metrics.durationSeconds || 45,
        speech_metrics: {
          words_per_minute: metrics.wordsPerMinute,
          filler_words_count: metrics.fillerWordsCount,
          pause_count: metrics.pauseCount,
        },
      });

      if (response.interim_feedback) {
        setInterimFeedback(response.interim_feedback);
      }

      if (response.next_action === 'completed' || questionProgress.current >= questionProgress.total) {
        showToast('success', 'Interview Concluded', 'Generating your comprehensive evaluation report...');
        if (recordingState === 'recording') {
          await stopRecording();
        }
        setTimeout(() => {
          navigate(`/results?sessionId=${sessionId}`);
        }, 1200);
      } else if (response.next_question) {
        setCurrentQuestion(response.next_question);
        setQuestionProgress((prev) => ({
          current: prev.current + 1,
          total: prev.total,
        }));
        clearTranscript();
        setEditableAnswer('');
        setIsManualEdit(false);
        showToast('info', 'Next Question Loaded', `Question ${questionProgress.current + 1} of ${questionProgress.total}`);
        speak(response.next_question.question_text);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Submission Failed', error.message || 'Could not submit response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndEarly = async () => {
    try {
      if (recordingState === 'recording') {
        await stopRecording();
      }
      await api.endInterview(sessionId);
      showToast('info', 'Session Ended', 'Redirecting to performance evaluation.');
      navigate(`/results?sessionId=${sessionId}`);
    } catch {
      navigate(`/results?sessionId=${sessionId}`);
    }
  };

  const handleStopAndPreview = async () => {
    try {
      if (recordingState === 'recording') {
        await stopRecording();
        showToast('info', 'Recording Captured', 'Opening recorded media preview.');
      }
      setShowMediaModal(true);
    } catch {
      showToast('error', 'Preview Failed', 'Could not prepare recording preview.');
    }
  };

  const handleDeleteRecording = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this recording? This action complies with GDPR Article 17.')) {
      return;
    }

    setIsDeletingRecording(true);
    try {
      await deleteRecording();
      showToast('success', 'Recording Purged', 'Local and backend media artifacts have been permanently deleted.');
      setShowMediaModal(false);
    } catch {
      showToast('error', 'Delete Failed', 'Could not delete recording.');
    } finally {
      setIsDeletingRecording(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
      {/* 1. Top Session Ribbon */}
      <div className="border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Live HR Behavioral Simulation</span>
              <Badge variant="blue" size="sm" dot>Active</Badge>
            </h1>
            <p className="text-xs text-gray-400">
              Agent Elena • Turn-based voice with live transcript
            </p>
          </div>
        </div>

        {/* Hardware Status, Timers & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Permission Status Indicators */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-[#131B2E] border border-[#1E293B] rounded-xl text-xs">
            <span className="text-gray-300 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-gray-400" />
              Cam: <Badge variant={permissions?.camera === 'granted' ? 'emerald' : 'amber'} size="sm">{permissions?.camera || 'prompt'}</Badge>
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-gray-400" />
              Mic: <Badge variant={permissions?.microphone === 'granted' ? 'emerald' : 'amber'} size="sm">{permissions?.microphone || 'prompt'}</Badge>
            </span>
          </div>

          {/* Session Timer */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-300 bg-[#131B2E] px-3 py-1.5 rounded-xl border border-[#1E293B]">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-medium">{formatTimer(elapsedTime)}</span>
          </div>

          {/* Recording Status Badge */}
          {hasConsent ? (
            <Badge
              variant={recordingState === 'recording' ? 'rose' : 'gray'}
              size="md"
              dot={recordingState === 'recording'}
              className="font-mono"
            >
              {recordingState === 'recording' ? `REC ${formatTimer(recDuration)}` : 'REC IDLE'}
            </Badge>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConsentModal(true)}
              leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              Consent Required
            </Button>
          )}

          {/* Recorded Media Preview Button */}
          {(recordedMedia || previewUrl || recordingState === 'recording') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleStopAndPreview}
              leftIcon={<Eye className="w-3.5 h-3.5 text-blue-400" />}
            >
              Preview Media
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndEarly}
            className="hover:text-rose-400 hover:bg-rose-950/20"
          >
            End Early
          </Button>
        </div>
      </div>

      {/* 2. Echo Prevention & Turn-Taking Lock Active Banner */}
      {(isAudioLocked || turnState === 'AI_SPEAKING' || turnState === 'LOCKED') && (
        <div className="bg-indigo-950/40 border-b border-indigo-500/30 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              <strong>Turn-based voice with live transcript:</strong> Anti-echo turn lock active while AI Elena is speaking. Speech recognition resumes automatically when it is your turn.
            </span>
          </div>
          <span className="text-xs text-indigo-300 font-mono hidden md:inline">
            Acoustic dissipation: 350ms
          </span>
        </div>
      )}

      {/* 3. Explicit Candidate Recording Consent Banner */}
      {!hasConsent && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Recording Disabled (Consent Required):</strong> Under GDPR Article 17, explicit candidate consent is required before MediaRecorder starts recording audio or video.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleToggleConsent(true)}
              className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold border-amber-400"
            >
              Grant Recording Consent
            </Button>
            <button
              onClick={() => setShowConsentModal(true)}
              className="px-2.5 py-1 text-amber-300 hover:underline text-xs cursor-pointer"
            >
              Details
            </button>
          </div>
        </div>
      )}

      {/* 4. Main Room Grid */}
      <Container size="xl" className="flex-1 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): AI Interviewer & Question Prompt */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* AI Avatar Card */}
          <Card variant="glow" padding="lg" className="flex flex-col items-center justify-center relative overflow-hidden text-center min-h-[270px]">
            {/* Ambient Avatar Glow */}
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isSpeaking
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 scale-105 shadow-blue-500/30 ring-4 ring-blue-500/30'
                  : 'bg-[#131B2E] border border-blue-500/20'
              }`}
            >
              <div className="w-24 h-24 rounded-full bg-[#0B0F19] flex items-center justify-center shadow-inner">
                <Sparkles className={`w-10 h-10 ${isSpeaking ? 'text-blue-400 animate-spin' : 'text-gray-400'}`} />
              </div>
            </div>

            {/* Speaking Voice Waves with pristine gradient tokens */}
            {isSpeaking && (
              <div className="flex items-center gap-1.5 mt-4" aria-label="Audio Waveform Active">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-t from-blue-600 to-indigo-400 animate-pulse"></span>
                <span className="w-1.5 h-8 rounded-full bg-gradient-to-t from-blue-600 to-indigo-400 animate-pulse delay-75"></span>
                <span className="w-1.5 h-10 rounded-full bg-gradient-to-t from-blue-600 to-indigo-400 animate-pulse delay-150"></span>
                <span className="w-1.5 h-7 rounded-full bg-gradient-to-t from-blue-600 to-indigo-400 animate-pulse delay-100"></span>
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-t from-blue-600 to-indigo-400 animate-pulse delay-200"></span>
              </div>
            )}

            <div className="mt-4">
              <h2 className="text-base font-bold text-white tracking-wide">Agent Elena</h2>
              <div className="mt-1.5">
                {isSpeaking ? (
                  <Badge variant="blue" size="sm" dot>
                    <Volume2 className="w-3 h-3 inline mr-1 animate-pulse" /> AI Speaking (Mic Locked)
                  </Badge>
                ) : turnState === 'LOCKED' ? (
                  <Badge variant="indigo" size="sm" dot>
                    <Lock className="w-3 h-3 inline mr-1" /> Dissipating Echo...
                  </Badge>
                ) : turnState === 'USER_SPEAKING' ? (
                  <Badge variant="emerald" size="sm" dot>
                    <Mic className="w-3 h-3 inline mr-1 animate-pulse" /> Listening to you (Speak now)
                  </Badge>
                ) : (
                  <Badge variant="gray" size="sm">
                    Awaiting Candidate Response
                  </Badge>
                )}
              </div>
            </div>

            {/* Voice Setting Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Voice Settings"
              aria-label="Voice Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </Card>

          {/* Active Question Card */}
          <Card variant="default" padding="lg" className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">
                  Question {questionProgress.current} of {questionProgress.total}
                </span>
                <Badge variant="gray" size="sm">
                  {currentQuestion.category}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-800 h-1.5 rounded-full mb-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-300"
                  style={{
                    width: `${(questionProgress.current / questionProgress.total) * 100}%`,
                  }}
                />
              </div>

              <p className="text-base font-semibold text-white leading-relaxed">
                "{currentQuestion.question_text}"
              </p>
            </div>

            {/* Repeat & Audio Hint Buttons */}
            <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRepeatQuestion}
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-blue-400" />}
              >
                Repeat Question
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak('Focus on the Situation, Task, Action, and quantifiable Results.')}
                leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
              >
                STAR Hint
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column (7 cols): Candidate Video & Response Transcription */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Candidate Webcam Feed */}
          <Card variant="default" padding="none" className="relative overflow-hidden aspect-video max-h-[300px] flex items-center justify-center shadow-2xl bg-black rounded-2xl">
            {cameraState.isCameraMuted ? (
              <div className="flex flex-col items-center text-gray-400 text-xs">
                <VideoOff className="w-8 h-8 mb-2 text-gray-500" />
                <span>Camera feed is muted</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            )}

            {/* Floating Camera, Mic & Device Selection Controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#0B0F19]/90 backdrop-blur-md border border-[#1E293B] shadow-2xl max-w-[95%]">
              {/* Toggle Video */}
              <button
                type="button"
                onClick={() => toggleCamera()}
                className={`p-2 rounded-xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  cameraState.isCameraMuted
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                    : 'bg-[#131B2E] text-gray-200 hover:text-white hover:bg-gray-800'
                }`}
                title={cameraState.isCameraMuted ? 'Enable Camera' : 'Mute Camera'}
                aria-label={cameraState.isCameraMuted ? 'Enable Camera' : 'Mute Camera'}
              >
                {cameraState.isCameraMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              {/* Toggle Mic */}
              <button
                type="button"
                onClick={() => toggleMicrophone()}
                className={`p-2 rounded-xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  cameraState.isMicrophoneMuted
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                    : 'bg-[#131B2E] text-gray-200 hover:text-white hover:bg-gray-800'
                }`}
                title={cameraState.isMicrophoneMuted ? 'Unmute Mic' : 'Mute Mic'}
                aria-label={cameraState.isMicrophoneMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {cameraState.isMicrophoneMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Camera Device Dropdown */}
              {videoDevices.length > 0 && (
                <select
                  value={cameraState.selectedVideoDeviceId || ''}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="bg-[#131B2E] text-xs text-gray-200 px-2.5 py-1.5 rounded-xl border border-[#1E293B] outline-none max-w-[130px] truncate cursor-pointer"
                  title="Select Camera Input"
                  aria-label="Select Camera Input"
                >
                  {videoDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      📹 {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Microphone Device Dropdown */}
              {audioDevices.length > 0 && (
                <select
                  value={cameraState.selectedAudioDeviceId || ''}
                  onChange={(e) => switchMicrophone(e.target.value)}
                  className="bg-[#131B2E] text-xs text-gray-200 px-2.5 py-1.5 rounded-xl border border-[#1E293B] outline-none max-w-[130px] truncate cursor-pointer"
                  title="Select Microphone Input"
                  aria-label="Select Microphone Input"
                >
                  {audioDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      🎙️ {d.label || `Microphone ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {/* Refresh Hardware Permissions */}
              <button
                type="button"
                onClick={() => checkPermissions()}
                className="p-1.5 rounded-xl bg-[#131B2E] hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Refresh Hardware Permissions"
                aria-label="Refresh Hardware Permissions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Video Candidate & Consent Status Label */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-[#0B0F19]/85 backdrop-blur text-xs font-medium text-gray-200 border border-[#1E293B] flex items-center gap-2">
              <span>Candidate: You</span>
              {hasConsent && (
                <Badge variant="emerald" size="sm" dot>Consent Verified</Badge>
              )}
            </div>
          </Card>

          {/* Transcript & Candidate Answer Box */}
          <Card variant="default" padding="lg" className="flex-1 flex flex-col justify-between">
            <div>
              {/* Header: Mode & Text Fallback Indicator */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Your Spoken / Written Response</span>
                  {voiceState === 'listening' && !isAudioLocked && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                  {isAudioLocked && (
                    <Badge variant="indigo" size="sm">
                      <Lock className="w-3 h-3 inline mr-1" /> Audio Lock
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManualEdit(!isManualEdit)}
                    leftIcon={<FileText className="w-3 h-3 text-blue-400" />}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {isManualEdit ? 'Switch to Voice View' : 'Switch to Keyboard Fallback'}
                  </Button>
                </div>
              </div>

              {/* Reliable Text Fallback Banner */}
              {(!isSpeechSupported || fallbackMode === 'unsupported' || fallbackMode === 'denied') && (
                <div className="mb-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">Speech Recognition Fallback Active</p>
                    <p className="text-xs text-amber-200/90 mt-0.5">
                      {fallbackMode === 'denied'
                        ? 'Microphone permission was denied. Switched to reliable keyboard fallback mode.'
                        : 'Web Speech API is unavailable in this browser environment. You can smoothly type and submit your responses below.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Reviewable & Editable Transcript Container */}
              {isFallbackActive ? (
                <div>
                  <textarea
                    rows={5}
                    value={editableAnswer}
                    onChange={(e) => setEditableAnswer(e.target.value)}
                    placeholder="Type your structured answer here (Situation, Task, Action, Result)..."
                    className="w-full p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 leading-relaxed font-sans resize-none shadow-inner"
                  />
                  <div className="flex justify-between items-center text-xs text-gray-400 mt-1.5 px-1">
                    <span>Keyboard Fallback Input Active</span>
                    <Badge variant="gray" size="sm">
                      {editableAnswer.trim().split(/\s+/).filter(Boolean).length} words
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="min-h-[130px] max-h-[190px] overflow-y-auto p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-sm text-gray-200 leading-relaxed shadow-inner">
                  {fullTranscript ? (
                    <span>
                      {fullTranscript}
                      {interimTranscript && (
                        <span className="text-blue-400 italic font-medium ml-1 animate-pulse">
                          {interimTranscript}...
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">
                      {isAudioLocked
                        ? 'Microphone muted while AI interviewer speaks. Awaiting candidate response...'
                        : 'Click "Start Speaking" or begin speaking into your microphone to transcribe your response...'}
                    </span>
                  )}
                </div>
              )}

              {/* Interim Feedback Encouragement */}
              {interimFeedback && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{interimFeedback}</span>
                </div>
              )}

              {/* Speech Analytics Bar */}
              <div className="mt-4 grid grid-cols-4 gap-2.5 pt-3 border-t border-[#1E293B] text-center">
                <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                  <p className="text-xs text-gray-400">Words / Min</p>
                  <p className="font-bold text-sm text-white mt-0.5">{metrics.wordsPerMinute || 0}</p>
                </div>
                <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                  <p className="text-xs text-gray-400">Filler Words</p>
                  <p className="font-bold text-sm text-amber-400 mt-0.5">{metrics.fillerWordsCount || 0}</p>
                </div>
                <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                  <p className="text-xs text-gray-400">Pauses</p>
                  <p className="font-bold text-sm text-white mt-0.5">{metrics.pauseCount || 0}</p>
                </div>
                <div className="p-2.5 bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="font-bold text-sm text-blue-400 mt-0.5">{metrics.durationSeconds}s</p>
                </div>
              </div>
            </div>

            {/* Submission & Speech Controls */}
            <div className="mt-6 pt-4 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isSpeechSupported && fallbackMode !== 'denied' && (
                  voiceState === 'listening' ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={stopListening}
                      leftIcon={<Square className="w-3.5 h-3.5 fill-current" />}
                    >
                      Pause Mic
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startListening}
                      disabled={isAudioLocked}
                      leftIcon={<Mic className="w-3.5 h-3.5 text-emerald-400" />}
                      className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    >
                      {isAudioLocked ? 'Locked (AI Speaking)' : 'Start Speaking'}
                    </Button>
                  )
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearTranscript();
                    setEditableAnswer('');
                  }}
                >
                  Clear
                </Button>
              </div>

              {/* Single Primary Gradient CTA */}
              <Button
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                onClick={handleSubmitAnswer}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
              </Button>
            </div>
          </Card>
        </div>
      </Container>

      {/* 5. Audio & Media Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Voice & Media Configuration"
        description="Configure TTS speech voice persona and anti-echo lock parameters."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">
              TTS Synthesizer Voice
            </label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => selectVoice(e.target.value)}
              className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-gray-200 text-sm outline-none focus:border-blue-500"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name} className="bg-[#131B2E]">
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex justify-between items-center text-xs text-gray-300">
            <span>Turn-Taking Lock:</span>
            <Badge variant="emerald" size="sm">Active (350ms)</Badge>
          </div>
        </div>
      </Modal>

      {/* 6. Explicit Recording Consent Modal */}
      <Modal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        title="Candidate Recording Consent & Privacy"
        description="GDPR Article 17 Compliant Media Processing"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            InterviewGenie AI guarantees full data sovereignty. Video recording is never initiated without candidate agreement. Recordings remain isolated in local browser memory and can be downloaded or permanently purged at any time.
          </p>

          <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={explicitConsentChecked}
                onChange={(e) => handleToggleConsent(e.target.checked)}
                className="mt-1 rounded accent-blue-500 w-4 h-4 shrink-0"
              />
              <span className="text-sm text-gray-200 leading-relaxed">
                I explicitly consent to audio and video recording during this simulation session. I acknowledge that I can preview, download (.webm/.mp4), or permanently delete recording artifacts at any time.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            {hasConsent && (
              <button
                type="button"
                onClick={() => handleToggleConsent(false)}
                className="text-sm text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Revoke Consent
              </button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowConsentModal(false)}
              className="ml-auto"
            >
              Confirm & Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Recorded Media Preview Modal (.webm / .mp4 Download & Delete Controls) */}
      <Modal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        title="Interview Media Preview"
        description="Playback, Download & Privacy Deletion Controls"
        size="lg"
      >
        <div className="space-y-4">
          {previewUrl ? (
            <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-[340px] flex items-center justify-center border border-[#1E293B]">
              <video
                src={previewUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="p-8 text-center bg-[#0B0F19] rounded-xl border border-[#1E293B] text-gray-400 text-sm">
              <Video className="w-8 h-8 mx-auto mb-2 text-gray-500" />
              <p>No recording artifact is currently available.</p>
              <p className="text-xs text-gray-500 mt-1">Start recording and stop to view playback preview.</p>
            </div>
          )}

          {recordedMedia && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-[#0B0F19] rounded-xl border border-[#1E293B] text-center text-sm">
              <div>
                <span className="text-xs text-gray-400">Duration</span>
                <p className="font-semibold text-white">{formatTimer(recordedMedia.durationSeconds)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">File Size</span>
                <p className="font-semibold text-white">{(recordedMedia.sizeBytes / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Format</span>
                <Badge variant="indigo" size="sm" className="mt-0.5 uppercase">
                  {recordedMedia.mimeType.includes('mp4') ? 'MP4' : 'WEBM'}
                </Badge>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={!previewUrl}
                onClick={() => downloadRecording(undefined, 'webm')}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download (.webm)
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={!previewUrl}
                onClick={() => downloadRecording(undefined, 'mp4')}
                leftIcon={<Download className="w-3.5 h-3.5 text-indigo-400" />}
              >
                Download (.mp4)
              </Button>
            </div>

            <Button
              variant="danger"
              size="sm"
              disabled={!previewUrl || isDeletingRecording}
              onClick={handleDeleteRecording}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              {isDeletingRecording ? 'Purging...' : 'Delete Recording (GDPR)'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
