// src/pages/LandingPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Video,
  Code,
  Brain,
  FileText,
  FileCheck,
  MessageSquareText,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Container } from '../components/ui/Container';

export const LandingPage: React.FC = () => {
  const [activePreview, setActivePreview] = useState<'room' | 'results'>('room');

  const simulationTracks = [
    {
      title: 'HR & Behavioral Interview',
      desc: 'Turn-based voice simulation evaluating communication clarity, situation relevance, and structured STAR evidence with adaptive follow-ups.',
      icon: Video,
      badge: 'STAR Framework',
      badgeVariant: 'blue' as const,
      color: 'from-blue-600 to-indigo-600',
      link: '/setup',
      capabilities: [
        'Turn-based voice with live transcript',
        'Automatic filler word & pacing analysis',
        'Adaptive behavioral follow-up prompts',
      ],
    },
    {
      title: 'Technical Code Studio',
      desc: 'Split-screen coding workspace supporting Python, TypeScript, and JavaScript with live test evaluation and complexity rationale.',
      icon: Code,
      badge: 'Live Code IDE',
      badgeVariant: 'purple' as const,
      color: 'from-purple-600 to-pink-600',
      link: '/interview/technical',
      capabilities: [
        'In-browser sandbox execution',
        'Algorithmic complexity evaluation',
        'Scenario-based system design queries',
      ],
    },
    {
      title: 'Aptitude & Logic Assessment',
      desc: 'Timed quantitative reasoning, logical deduction, and computer science fundamentals with deterministic answer verification.',
      icon: Brain,
      badge: 'Timed Proctoring',
      badgeVariant: 'emerald' as const,
      color: 'from-emerald-600 to-teal-600',
      link: '/interview/aptitude',
      capabilities: [
        'Deterministic mathematical scoring',
        'Timed multiple-choice proctoring',
        'Step-by-step verified explanations',
      ],
    },
    {
      title: 'Resume-Tailored Deep Dive',
      desc: 'PDF resume analysis extracting technical skills, project architecture, and work history to generate personalized interview questions.',
      icon: FileText,
      badge: 'Resume Grounded',
      badgeVariant: 'amber' as const,
      color: 'from-amber-600 to-orange-600',
      link: '/resume',
      capabilities: [
        'PyMuPDF structural resume extraction',
        'Project architecture interrogation',
        'Targeted experience verification',
      ],
    },
  ];

  const whatYouGet = [
    {
      icon: MessageSquareText,
      title: 'Turn-Based Voice & Live Transcript',
      desc: 'Speak naturally with specialized AI interviewers. View real-time transcript streaming with audio echo protection and instant keyboard fallback.',
    },
    {
      icon: FileCheck,
      title: 'Per-Question Objective STAR Rubrics',
      desc: 'Multi-dimensional evaluation measuring communication clarity, technical depth, and concrete STAR evidence on every response.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Deterministic PDF Reports & History',
      desc: 'Instant, reproducible score breakdowns with actionable improvement plans. Download clean PDFs or permanently purge records anytime.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
      {/* 1. Hero Section */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-24 border-b border-gray-800/80 bg-[#0B0F19]">
        <Container size="lg" className="text-center">
          {/* Plain Text Header Label (Replaced Pill) */}
          <p className="text-xs font-semibold tracking-wider uppercase text-blue-400 mb-4">
            Autonomous Multi-Agent Interview Simulation Suite
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Master Any Interview with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Multi-Agent AI
            </span>
          </h1>

          {/* Supporting sentence under 75 chars line-length with WCAG AA contrast */}
          <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Practice realistic voice interviews, live technical coding, and timed aptitude tests with objective rubric evaluations.
          </p>

          {/* Two Buttons: One Primary CTA, One Secondary Outline Action */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/setup">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Start Free Simulation
              </Button>
            </Link>

            <Link to="/setup">
              <Button
                variant="secondary"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4 text-gray-400" />}
              >
                View Interview Setup
              </Button>
            </Link>
          </div>

          {/* Real Product Visual (Replaced Stat Tiles with Live Running App Screenshot) */}
          <div className="mt-14 max-w-4xl mx-auto text-left">
            {/* Visual Frame Header with Tab Controls */}
            <div className="rounded-2xl border border-gray-800 bg-[#131B2E] overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-gray-800/90 bg-[#0E1524] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  <span className="ml-2 text-xs font-mono text-gray-400 hidden sm:inline">
                    http://localhost:5173{activePreview === 'room' ? '/interview/live' : '/results'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1 rounded-lg border border-gray-800">
                  <button
                    onClick={() => setActivePreview('room')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                      activePreview === 'room'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Live Interview Room
                  </button>
                  <button
                    onClick={() => setActivePreview('results')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                      activePreview === 'results'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Evaluation Results
                  </button>
                </div>
              </div>

              {/* Preview Image from Running App with Sample Data */}
              <div className="relative bg-[#0B0F19] aspect-[16/9] overflow-hidden flex items-center justify-center">
                <img
                  src={activePreview === 'room' ? '/images/preview_live_room.png' : '/images/preview_results.png'}
                  alt={activePreview === 'room' ? 'InterviewGenie Live Interview Room with AI avatar' : 'Candidate Performance Debrief and Rubrics'}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>

              <div className="px-4 py-2.5 bg-[#0E1524] border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
                <span>Real product interface captured from active simulation session</span>
                <span className="text-emerald-400 font-medium">Deterministic Scoring Active</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. Four Practice Tracks Section */}
      <section className="py-16 md:py-24 border-b border-gray-800/80">
        <Container size="lg">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Comprehensive Interview Practice Tracks
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-300 leading-relaxed">
              Four specialized tracks designed to simulate each stage of modern technical and behavioral hiring loops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {simulationTracks.map((track) => {
              const Icon = track.icon;
              return (
                <Card
                  key={track.title}
                  variant="interactive"
                  padding="lg"
                  className="flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${track.color} flex items-center justify-center text-white shadow-md`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={track.badgeVariant}>{track.badge}</Badge>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{track.title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-5">
                      {track.desc}
                    </p>

                    <div className="space-y-2 pt-4 border-t border-gray-800/80">
                      {track.capabilities.map((cap) => (
                        <div key={cap} className="flex items-center gap-2 text-xs text-gray-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-800/60">
                    <Link to={track.link}>
                      <Button variant="secondary" size="sm" className="w-full justify-between">
                        <span>Launch {track.title.split(' ')[0]} Track</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 3. What You Get Section (Replaced 'Built on Responsible AI' cards with 3 concrete deliverable items) */}
      <section className="py-16 md:py-24 border-b border-gray-800/80 bg-[#070B14]">
        <Container size="lg">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              What You Get After Every Session
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-300 leading-relaxed">
              Objective, actionable feedback designed to systematically eliminate blind spots before your real interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whatYouGet.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-6 rounded-2xl bg-[#131B2E] border border-gray-800 flex flex-col"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-4 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 4. Privacy & Data Control Banner */}
      <section className="py-12 border-b border-gray-800/80 bg-[#0B0F19]">
        <Container size="md">
          <div className="p-6 rounded-2xl bg-[#131B2E] border border-gray-800 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">
                Candidate Privacy & Media Governance
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Recordings are never uploaded without explicit toggle consent. Audio and transcripts are previewable locally and can be permanently purged from your profile.
              </p>
            </div>
            <Link to="/privacy">
              <Button variant="secondary" size="sm" className="shrink-0">
                View Privacy Policy
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* 5. Final Call to Action */}
      <section className="py-16 md:py-24 bg-[#0B0F19] text-center">
        <Container size="sm">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to Practice Your Next Interview?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-300 max-w-lg mx-auto leading-relaxed">
            Select a track, test your audio and camera, and receive structured rubric evaluations on every response.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/setup">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Start Practice Simulation
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
};
