// src/pages/InterviewSetupPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { HardwareDiagnostics } from '../components/HardwareDiagnostics';
import type { InterviewType, DifficultyLevel, InterviewCreatePayload } from '../types';
import {
  Container,
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
} from '../components/ui';
import {
  Play,
  Video,
  Code,
  Brain,
  FileText,
  Layers,
  Mic,
  ShieldCheck,
  Check,
  X,
  Sliders,
} from 'lucide-react';

export const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Interview Setup | InterviewGenie AI';
  }, []);

  const [interviewType, setInterviewType] = useState<InterviewType>('hr');
  const [domain, setDomain] = useState('Software Engineering');
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableVideo, setEnableVideo] = useState(true);
  const [hasConsent, setHasConsent] = useState(true);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([
    'React',
    'TypeScript',
    'FastAPI',
    'Distributed Systems',
  ]);
  const [submitting, setSubmitting] = useState(false);

  const interviewModes = [
    {
      id: 'hr' as InterviewType,
      title: 'HR & Behavioral',
      desc: 'STAR Framework, leadership traits, conflict management, and culture alignment.',
      icon: Video,
      badge: 'Elena',
    },
    {
      id: 'technical' as InterviewType,
      title: 'Technical Coding',
      desc: 'Live code editor, multi-language test runners, algorithmic design, and data structures.',
      icon: Code,
      badge: 'Marcus',
    },
    {
      id: 'aptitude' as InterviewType,
      title: 'Aptitude & Logic',
      desc: 'Timed multiple-choice assessment: quantitative reasoning, logic, and OS fundamentals.',
      icon: Brain,
      badge: 'Cipher',
    },
    {
      id: 'resume' as InterviewType,
      title: 'Resume-Tailored',
      desc: 'Deep questions generated from your uploaded projects, tech stacks, and career milestones.',
      icon: FileText,
      badge: 'Athena',
    },
    {
      id: 'comprehensive' as InterviewType,
      title: 'Full Loop (All 3)',
      desc: 'Complete mock hiring loop cycling through HR, Technical Coding, and Logic assessment.',
      icon: Layers,
      badge: 'Director',
    },
  ];

  const domainOptions = [
    { value: 'Software Engineering', label: 'Software Engineering' },
    { value: 'Frontend / Web Engineering', label: 'Frontend / Web Engineering' },
    { value: 'Backend & Cloud Microservices', label: 'Backend & Cloud Microservices' },
    { value: 'Distributed Systems & Architecture', label: 'Distributed Systems & Architecture' },
    { value: 'AI / Machine Learning Engineering', label: 'AI / Machine Learning Engineering' },
    { value: 'DevOps, SRE & Infrastructure', label: 'DevOps, SRE & Infrastructure' },
  ];

  const handleAddTopic = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && topicInput.trim()) {
      e.preventDefault();
      const trimmed = topicInput.trim();
      if (!topics.includes(trimmed)) {
        setTopics([...topics, trimmed]);
      }
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (tToRemove: string) => {
    setTopics(topics.filter((t) => t !== tToRemove));
  };

  const handleLaunch = async () => {
    let hasValidationError = false;

    if (!targetRole.trim()) {
      setRoleError('Target role title is required.');
      hasValidationError = true;
    } else {
      setRoleError(null);
    }

    if (enableVideo && !hasConsent) {
      setConsentError('Explicit recording consent is required when camera video is enabled.');
      showToast(
        'warning',
        'Consent Required',
        'Please confirm recording consent to enable video simulation.'
      );
      hasValidationError = true;
    } else {
      setConsentError(null);
    }

    if (hasValidationError) return;

    setSubmitting(true);
    try {
      const payload: InterviewCreatePayload = {
        interview_type: interviewType,
        domain,
        target_role: targetRole.trim(),
        difficulty,
        total_questions: totalQuestions,
        custom_topics: topics,
        enable_voice: enableVoice,
        enable_video: enableVideo,
      };

      const session = await api.createInterview(payload);
      showToast(
        'success',
        'Interview Initialized',
        `Session created for ${targetRole} (${difficulty}). Launching room...`
      );

      // Route to the appropriate room
      if (interviewType === 'technical') {
        navigate(`/interview/technical?sessionId=${session.id}&consent=${hasConsent}`);
      } else if (interviewType === 'aptitude') {
        navigate(`/interview/aptitude?sessionId=${session.id}`);
      } else if (interviewType === 'resume') {
        navigate(`/resume?sessionId=${session.id}`);
      } else {
        navigate(`/interview/live?sessionId=${session.id}&consent=${hasConsent}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Launch Failed', error.message || 'Could not configure interview.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="lg" className="py-8 space-y-8">
      {/* 1. Page Header */}
      <SectionHeader
        align="left"
        badge="Simulation Configurator"
        badgeVariant="blue"
        title="Configure Your Interview"
        subtitle="Customize the autonomous agent persona, technical domain, difficulty scale, and hardware devices before launching the session."
      />

      <div className="space-y-6">
        {/* 2. Format / Track Selector */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Select Interview Track</span>
            </h2>
            <Badge variant="blue" size="sm">
              Required
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {interviewModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = interviewType === mode.id;
              return (
                <div
                  key={mode.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setInterviewType(mode.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setInterviewType(mode.id);
                    }
                  }}
                  className={`p-4 rounded-xl border text-left transition-all duration-150 relative flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600/15 shadow-lg shadow-blue-500/10'
                      : 'border-[#1E293B] bg-[#131B2E] text-gray-300 hover:border-gray-600 hover:bg-[#1A253D]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                      <Badge variant={isSelected ? 'blue' : 'gray'} size="sm">
                        {mode.badge}
                      </Badge>
                    </div>
                    <p className="font-bold text-sm text-white">{mode.title}</p>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      {mode.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 3. Target Role & Domain */}
        <Card padding="md" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Target Role</span>
            </h2>
            <Input
              label="Position / Title"
              value={targetRole}
              onChange={(e) => {
                setTargetRole(e.target.value);
                if (roleError) setRoleError(null);
              }}
              error={roleError || undefined}
              helperText="The AI will calibrate question depth and seniority expectations to this exact title."
              placeholder="e.g. Senior Full Stack Engineer, Tech Lead"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Primary Domain</span>
            </h2>
            <Select
              label="Engineering Domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              options={domainOptions}
              helperText="Evaluation rubrics and technical terminology align to this discipline."
            />
          </div>
        </Card>

        {/* 4. Difficulty & Question Count */}
        <Card padding="md" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((lvl) => {
                const isCurrent = difficulty === lvl;
                return (
                  <Button
                    key={lvl}
                    type="button"
                    variant={isCurrent ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setDifficulty(lvl)}
                    className="capitalize"
                  >
                    {lvl}
                  </Button>
                );
              })}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Adjusts the complexity of scenario prompts and coding challenge rubrics.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="question-count-slider" className="text-sm font-semibold text-gray-200">
                Question Count
              </label>
              <Badge variant="blue" size="sm">
                {totalQuestions} Questions
              </Badge>
            </div>
            <input
              id="question-count-slider"
              type="range"
              min={3}
              max={10}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
              aria-valuemin={3}
              aria-valuemax={10}
              aria-valuenow={totalQuestions}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-medium">
              <span>3 (Express ~10 min)</span>
              <span>5 (Standard ~20 min)</span>
              <span>10 (Comprehensive ~40 min)</span>
            </div>
          </div>
        </Card>

        {/* 5. Custom Focus Topics */}
        <Card padding="md" className="space-y-3">
          <label htmlFor="custom-topic-input" className="block text-sm font-semibold text-gray-200">
            Custom Focus Topics
          </label>
          <p className="text-sm text-gray-300">
            Type a topic (e.g. Redis, GraphQL, Sharding, Concurrency) and press{' '}
            <kbd className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200 font-mono text-xs">
              Enter
            </kbd>{' '}
            to add.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {topics.map((t) => (
              <Badge key={t} variant="blue" size="md" className="gap-2">
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(t)}
                  className="hover:text-rose-400 text-blue-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded p-0.5 cursor-pointer"
                  aria-label={`Remove topic ${t}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            id="custom-topic-input"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={handleAddTopic}
            placeholder="Add specific tech stack or skill (e.g., Kafka, Kubernetes, SQL Optimization)..."
          />
        </Card>

        {/* 6. Media Services & Privacy Consent */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Media & Privacy Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-[#1E293B] hover:border-gray-600 bg-[#131B2E] cursor-pointer transition-colors duration-150">
              <input
                type="checkbox"
                checked={enableVoice}
                onChange={(e) => setEnableVoice(e.target.checked)}
                className="mt-1 rounded accent-blue-500 w-4 h-4 cursor-pointer"
              />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-white flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-blue-400" />
                  Real-Time Voice STT & AI Speech
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Elena/Marcus reads questions aloud and transcribes candidate speech with low-latency audio pipelines.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-[#1E293B] hover:border-gray-600 bg-[#131B2E] cursor-pointer transition-colors duration-150">
              <input
                type="checkbox"
                checked={enableVideo}
                onChange={(e) => setEnableVideo(e.target.checked)}
                className="mt-1 rounded accent-blue-500 w-4 h-4 cursor-pointer"
              />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-white flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-400" />
                  Candidate Video & Audio Stream
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Provides live webcam preview and optional local video recording stored securely in browser memory.
                </p>
              </div>
            </label>
          </div>

          {enableVideo && (
            <div
              className={`p-4 rounded-xl border transition-colors ${
                consentError
                  ? 'bg-rose-950/20 border-rose-500/50'
                  : 'bg-blue-950/20 border-blue-500/25'
              } flex items-start gap-3.5`}
            >
              <input
                type="checkbox"
                id="consentCheck"
                checked={hasConsent}
                onChange={(e) => {
                  setHasConsent(e.target.checked);
                  if (consentError) setConsentError(null);
                }}
                className="mt-1 rounded accent-blue-500 w-4 h-4 shrink-0 cursor-pointer"
              />
              <div className="space-y-1">
                <label
                  htmlFor="consentCheck"
                  className="text-xs sm:text-sm text-gray-200 leading-relaxed cursor-pointer block"
                >
                  <span className="font-semibold text-blue-400">
                    Explicit Recording Consent:
                  </span>{' '}
                  I consent to local recording of this simulation session for performance analysis and self-review. Recordings remain stored in candidate local browser memory and can be deleted at any time with one click.
                </label>
                {consentError && (
                  <p className="text-xs text-rose-400 font-medium" role="alert">
                    {consentError}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* 7. Pre-Flight Hardware Diagnostics */}
        {(enableVoice || enableVideo) && <HardwareDiagnostics />}

        {/* 8. Launch Simulation CTA (Single Primary CTA) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            Session data is isolated to your candidate account with deterministic grading.
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={submitting}
            onClick={handleLaunch}
            leftIcon={<Play className="w-5 h-5 fill-current" />}
            className="w-full sm:w-auto"
          >
            Launch Simulation
          </Button>
        </div>
      </div>
    </Container>
  );
};
