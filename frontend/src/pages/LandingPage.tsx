// src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Play,
  Video,
  Code,
  Brain,
  FileText,
  Award,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const features = [
    {
      title: 'Real-Time Voice Turn-Taking',
      desc: 'Seamless natural conversational dialog with AI interviewer avatar. Audio locking prevents barge-ins and measures filler words & WPM.',
      icon: Video,
      color: 'from-blue-500 to-indigo-500',
      badge: 'Web Speech STT/TTS',
      link: '/interview/live',
    },
    {
      title: 'Live Technical Code Studio',
      desc: 'Split-screen IDE supporting Python, TypeScript, Go, Java, and C++. Run test cases in real-time while explaining your algorithmic approach.',
      icon: Code,
      color: 'from-purple-500 to-pink-500',
      badge: 'Multi-Language IDE',
      link: '/interview/technical',
    },
    {
      title: 'Adaptive Aptitude & Logic',
      desc: 'Timed assessment testing quantitative math, logical deduction, and computer science fundamentals with instant detailed explanations.',
      icon: Brain,
      color: 'from-emerald-500 to-teal-500',
      badge: 'Timed Proctoring',
      link: '/interview/aptitude',
    },
    {
      title: 'Resume-Tailored Deep Dives',
      desc: 'Upload your PDF resume to extract skills, project architecture, and tech stacks. Receive questions targeted specifically to your career history.',
      icon: FileText,
      color: 'from-amber-500 to-orange-500',
      badge: 'PDF Parser',
      link: '/resume',
    },
    {
      title: 'STAR Rubric & Performance Radar',
      desc: 'Comprehensive multi-metric evaluations scoring Technical Depth, Communication Clarity, STAR Structure, and Problem Solving with PDF reports.',
      icon: Award,
      color: 'from-rose-500 to-red-500',
      badge: 'Deterministic Rubric',
      link: '/results',
    },
    {
      title: 'Consent-Gated Privacy Shield',
      desc: 'Candidate-controlled webcam & microphone streams. Automatic local recording with GDPR-compliant one-click media purge controls.',
      icon: ShieldCheck,
      color: 'from-cyan-500 to-blue-500',
      badge: 'Zero-Leaked Audio',
      link: '/profile',
    },
  ];

  const agents = [
    {
      role: 'HR & Behavioral Specialist',
      name: 'Agent Elena',
      avatarColor: 'bg-blue-600',
      focus: 'STAR Behavioral Framework, Leadership, Culture Fit & Conflict Resolution',
      tag: 'HR Round',
    },
    {
      role: 'Principal Systems Architect',
      name: 'Agent Marcus',
      avatarColor: 'bg-purple-600',
      focus: 'System Scalability, Distributed Locking, Concurrency, and Algorithms',
      tag: 'Technical Round',
    },
    {
      role: 'Quantitative & Logic Proctor',
      name: 'Agent Cipher',
      avatarColor: 'bg-emerald-600',
      focus: 'Algorithmic Complexity, Discrete Math, Logic Sequences & Data Structures',
      tag: 'Aptitude Round',
    },
    {
      role: 'Rubric Evaluator & Career Coach',
      name: 'Agent Athena',
      avatarColor: 'bg-amber-600',
      focus: 'Multi-metric Scoring, Blindspot Detection & Actionable Study Plans',
      tag: 'Debrief & Report',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 selection:bg-blue-500/30 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-gray-800/60">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/20 to-purple-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold mb-6 animate-fade-in shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>Autonomous Multi-Agent AI Interview Suite</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Master Any Interview with{' '}
            <span className="gradient-text">Conversational Multi-Agent AI</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Practice realistic full-duplex voice interviews, live coding challenges, adaptive aptitude tests, and resume-driven deep dives with immediate actionable rubric feedback.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/setup"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2 group"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              <span>Launch Free Simulation</span>
            </Link>

            <Link
              to="/dashboard"
              className="px-6 py-3.5 rounded-xl border border-gray-700 hover:border-gray-500 bg-surface/80 hover:bg-surface text-gray-200 font-semibold text-sm transition-all duration-200 flex items-center gap-2"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              to="/interview/technical"
              className="px-6 py-3.5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20 text-purple-300 font-semibold text-sm transition-all duration-200 flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              <span>Try Code Sandbox</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-gray-800/60">
            <div className="p-3 bg-surface/50 rounded-xl border border-gray-800/80">
              <p className="text-2xl font-bold text-white">94%</p>
              <p className="text-xs text-gray-400 mt-0.5">Offer Rate Increase</p>
            </div>
            <div className="p-3 bg-surface/50 rounded-xl border border-gray-800/80">
              <p className="text-2xl font-bold text-white">&lt;250ms</p>
              <p className="text-xs text-gray-400 mt-0.5">Voice Turn Latency</p>
            </div>
            <div className="p-3 bg-surface/50 rounded-xl border border-gray-800/80">
              <p className="text-2xl font-bold text-white">4 Modes</p>
              <p className="text-xs text-gray-400 mt-0.5">HR, Tech, MCQ & Resume</p>
            </div>
            <div className="p-3 bg-surface/50 rounded-xl border border-gray-800/80">
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-gray-400 mt-0.5">Deterministic STAR Rubric</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Cards */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-2">
            Engineered For High-Performance Interviewing
          </h2>
          <h3 className="text-3xl font-extrabold text-white">
            Comprehensive Simulation Architecture
          </h3>
          <p className="text-sm text-gray-400 mt-3">
            Every layer—from real-time Web Speech audio turn-taking to live browser code execution—is built to replicate modern Big Tech hiring loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.title}
                to={feat.link}
                className="group relative p-6 rounded-2xl glow-card flex flex-col justify-between hover:scale-[1.02] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shadow-lg`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-800/90 text-gray-300 border border-gray-700">
                      {feat.badge}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {feat.title}
                  </h4>
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Module</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Multi-Agent Showcase */}
      <section className="py-20 bg-surface/30 border-y border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">
              Specialized Agent Personas
            </span>
            <h3 className="text-3xl font-extrabold text-white mt-1">
              Meet Your AI Interview Panel
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Unlike generic chatbots, InterviewGenie assigns purpose-built agent personalities for each evaluation phase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="p-6 rounded-2xl bg-surface border border-gray-800/80 hover:border-gray-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${agent.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                    >
                      {agent.name.split(' ')[1].slice(0, 2)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-800 text-blue-300">
                      {agent.tag}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-base">{agent.name}</h4>
                  <p className="text-xs text-blue-400 font-medium mb-3">{agent.role}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{agent.focus}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autonomous
                  </span>
                  <span>v2.0 Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - 3 Step Flow */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest text-purple-400 uppercase">
            Fast Track To Success
          </span>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            How An Interview Session Works
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-surface/60 border border-gray-800/80 relative">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-xs mb-4">
              1
            </div>
            <h4 className="text-base font-bold text-white mb-2">Configure & Select Mode</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Pick your target role, domain, difficulty, and question count. Choose between HR behavioral, technical code challenge, or aptitude tests.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface/60 border border-gray-800/80 relative">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold text-xs mb-4">
              2
            </div>
            <h4 className="text-base font-bold text-white mb-2">Live Interactive Practice</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Answer using real-time voice speech or code editor. The AI interviewer listens, detects pauses, asks targeted follow-ups, and speaks dynamically.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface/60 border border-gray-800/80 relative">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs mb-4">
              3
            </div>
            <h4 className="text-base font-bold text-white mb-2">Deterministic Scoring & PDF</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Get an instant deep evaluation breakdown across all rubrics, review question-by-question strengths, and download your verified PDF report.
            </p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h4 className="text-xl font-bold text-white">Ready to elevate your interview performance?</h4>
            <p className="text-xs text-gray-300 mt-1">Start practicing in less than 30 seconds with no credit card required.</p>
          </div>
          <Link
            to="/setup"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-lg shrink-0 flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Simulation Now</span>
          </Link>
        </div>
      </section>
    </div>
  );
};
