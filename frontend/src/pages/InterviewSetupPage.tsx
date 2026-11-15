// src/pages/InterviewSetupPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { InterviewType, DifficultyLevel, InterviewCreatePayload } from '../types';
import {
  Sliders,
  Play,
  Video,
  Code,
  Brain,
  FileText,
  Layers,
  Mic,
  ShieldCheck,
  Check,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [interviewType, setInterviewType] = useState<InterviewType>('hr');
  const [domain, setDomain] = useState('Software Engineering');
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [enableVoice, setEnableVoice] = useState(true);
  const [enableVideo, setEnableVideo] = useState(true);
  const [hasConsent, setHasConsent] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>(['React', 'TypeScript', 'FastAPI', 'Distributed Systems']);
  const [submitting, setSubmitting] = useState(false);

  const interviewModes = [
    {
      id: 'hr' as InterviewType,
      title: 'HR & Behavioral',
      desc: 'STAR Framework, leadership traits, conflict management, and culture alignment.',
      icon: Video,
      color: 'border-blue-500 text-blue-400 bg-blue-500/10',
    },
    {
      id: 'technical' as InterviewType,
      title: 'Technical Coding',
      desc: 'Live code editor, multi-language test runners, algorithmic design, and data structures.',
      icon: Code,
      color: 'border-purple-500 text-purple-400 bg-purple-500/10',
    },
    {
      id: 'aptitude' as InterviewType,
      title: 'Aptitude & Logic',
      desc: 'Timed multiple-choice assessment: quantitative reasoning, logic, and OS fundamentals.',
      icon: Brain,
      color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    },
    {
      id: 'resume' as InterviewType,
      title: 'Resume-Tailored',
      desc: 'Deep questions generated from your uploaded projects, tech stacks, and career milestones.',
      icon: FileText,
      color: 'border-amber-500 text-amber-400 bg-amber-500/10',
    },
    {
      id: 'comprehensive' as InterviewType,
      title: 'Full Loop (All 3)',
      desc: 'Complete mock hiring loop cycling through HR, Technical Coding, and Logic assessment.',
      icon: Layers,
      color: 'border-cyan-500 text-cyan-400 bg-cyan-500/10',
    },
  ];

  const domains = [
    'Software Engineering',
    'Frontend / Web Engineering',
    'Backend & Cloud Microservices',
    'Distributed Systems & Architecture',
    'AI / Machine Learning Engineering',
    'DevOps, SRE & Infrastructure',
  ];

  const handleAddTopic = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && topicInput.trim()) {
      e.preventDefault();
      if (!topics.includes(topicInput.trim())) {
        setTopics([...topics, topicInput.trim()]);
      }
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (tToRemove: string) => {
    setTopics(topics.filter((t) => t !== tToRemove));
  };

  const handleLaunch = async () => {
    if (enableVideo && !hasConsent) {
      showToast('warning', 'Consent Required', 'Please confirm recording consent to enable video simulation.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: InterviewCreatePayload = {
        interview_type: interviewType,
        domain,
        target_role: targetRole,
        difficulty,
        total_questions: totalQuestions,
        custom_topics: topics,
        enable_voice: enableVoice,
        enable_video: enableVideo,
      };

      const session = await api.createInterview(payload);
      showToast('success', 'Interview Initialized', `Session created for ${targetRole} (${difficulty}). Launching room...`);

      // Route to the appropriate room
      if (interviewType === 'technical') {
        navigate(`/interview/technical?sessionId=${session.id}`);
      } else if (interviewType === 'aptitude') {
        navigate(`/interview/aptitude?sessionId=${session.id}`);
      } else if (interviewType === 'resume') {
        navigate(`/resume?sessionId=${session.id}`);
      } else {
        navigate(`/interview/live?sessionId=${session.id}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Launch Failed', error.message || 'Could not configure interview.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-2">
          <Sliders className="w-3.5 h-3.5" />
          <span>Simulation Configurator</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Configure Your Interview</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Customize the agent persona, domain specializations, difficulty, and media services before stepping into the room.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Mode Selector */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs flex items-center justify-center font-bold">1</span>
            Select Interview Format
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {interviewModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = interviewType === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setInterviewType(mode.id)}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? `${mode.color} border-current shadow-lg shadow-blue-500/10`
                      : 'border-gray-800 bg-surface/50 text-gray-300 hover:border-gray-700 hover:bg-surface-light'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <div>
                    <Icon className="w-6 h-6 mb-3" />
                    <p className="font-bold text-xs text-white">{mode.title}</p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug line-clamp-3">{mode.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Target Role & Domain */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
              Target Role
            </h2>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer, Tech Lead"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-gray-700 text-white text-xs outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              The AI will tailor question depth and seniority expectations to this exact title.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 text-xs flex items-center justify-center font-bold">3</span>
              Primary Domain
            </h2>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-gray-700 text-white text-xs outline-none focus:border-blue-500"
            >
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">Focus areas and technical terminology align to this domain.</p>
          </div>
        </div>

        {/* 3. Difficulty & Questions Count */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Difficulty Level</h2>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                    difficulty === lvl
                      ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                      : 'border-gray-800 bg-surface/50 text-gray-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Question Count</span>
              <span className="text-blue-400 font-mono text-xs">{totalQuestions} Questions</span>
            </h2>
            <input
              type="range"
              min={3}
              max={10}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>3 (Express)</span>
              <span>5 (Standard)</span>
              <span>10 (Exhaustive)</span>
            </div>
          </div>
        </div>

        {/* 4. Custom Focus Topics */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Custom Focus Topics</h2>
          <p className="text-xs text-gray-400 mb-3">
            Type a topic (e.g. Redis, GraphQL, Sharding) and press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-[10px]">Enter</kbd> to add.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {topics.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-medium"
              >
                {t}
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(t)}
                  className="hover:text-rose-400 text-gray-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={handleAddTopic}
            placeholder="Add specific tech stack or skill..."
            className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-gray-700 text-white text-xs outline-none focus:border-blue-500"
          />
        </div>

        {/* 5. Media Services & Privacy Consent */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Media & Privacy Services
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-800 hover:border-gray-700 bg-surface/50 cursor-pointer">
              <input
                type="checkbox"
                checked={enableVoice}
                onChange={(e) => setEnableVoice(e.target.checked)}
                className="mt-0.5 rounded accent-blue-500 w-4 h-4"
              />
              <div>
                <p className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-blue-400" />
                  Real-Time Voice STT & AI Speech
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  AI reads questions aloud and transcribes candidate speech with latency &lt;350ms.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-800 hover:border-gray-700 bg-surface/50 cursor-pointer">
              <input
                type="checkbox"
                checked={enableVideo}
                onChange={(e) => setEnableVideo(e.target.checked)}
                className="mt-0.5 rounded accent-blue-500 w-4 h-4"
              />
              <div>
                <p className="font-semibold text-xs text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  Candidate Video & Audio Stream
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Provides live webcam preview and optional local video recording.
                </p>
              </div>
            </label>
          </div>

          {enableVideo && (
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-3">
              <input
                type="checkbox"
                id="consentCheck"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-0.5 rounded accent-blue-500 w-4 h-4 shrink-0"
              />
              <label htmlFor="consentCheck" className="text-[11px] text-gray-300 leading-relaxed cursor-pointer">
                <span className="font-semibold text-blue-400">Explicit Recording Consent:</span> I consent to local recording of this simulation session for performance analysis and self-review. Recordings remain stored in candidate local browser memory and can be deleted at any time with one click.
              </label>
            </div>
          )}
        </div>

        {/* Launch CTA */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={handleLaunch}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{submitting ? 'Initializing Session...' : 'Step Into Interview Room'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
