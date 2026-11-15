// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { InterviewSession } from '../types';
import {
  Sparkles,
  Play,
  Video,
  Code,
  Brain,
  FileText,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await api.listInterviews();
        setInterviews(list);
      } catch (err) {
        console.error('Failed to load past interviews', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const quickLaunchers = [
    {
      title: 'HR & Behavioral Interview',
      subtitle: 'STAR Method & Culture Alignment',
      icon: Video,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Agent Elena',
      path: '/interview/live',
      tag: '5 Questions • Voice & Cam',
    },
    {
      title: 'Technical Room & Code Editor',
      subtitle: 'Algorithms & System Architecture',
      icon: Code,
      color: 'from-purple-600 to-pink-600',
      badge: 'Agent Marcus',
      path: '/interview/technical',
      tag: 'Live IDE • Multi-Language',
    },
    {
      title: 'Aptitude & Logic Test',
      subtitle: 'Timed MCQ Quantitative & CS',
      icon: Brain,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Agent Cipher',
      path: '/interview/aptitude',
      tag: '5 Questions • 15 Mins',
    },
    {
      title: 'Resume-Tailored Deep Dive',
      subtitle: 'Extract Projects & Custom Inquiries',
      icon: FileText,
      color: 'from-amber-600 to-orange-600',
      badge: 'Agent Athena',
      path: '/resume',
      tag: 'PDF Upload & Question Gen',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative p-6 sm:p-8 rounded-2xl glow-card overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Agent Readiness Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user?.full_name || 'Alex Johnson'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Targeting <span className="text-blue-400 font-semibold">Senior Full Stack Engineer</span> at Big Tech / Tier 1 SaaS. Your overall readiness is on track!
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Readiness Circle Widget */}
            <div className="flex items-center gap-4 bg-surface/80 p-3.5 rounded-xl border border-gray-800">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-14 h-14 -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="#1F2937"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeDasharray="138"
                    strokeDashoffset="16.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <span className="absolute font-bold text-sm text-white">88%</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-400">Interview Ready</p>
                <p className="text-[11px] text-gray-400">Top 9th Percentile</p>
              </div>
            </div>

            <Link
              to="/setup"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>New Simulation</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs">Simulations Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">14</p>
          <span className="text-[11px] text-emerald-400 font-medium">↑ +3 this week</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs">Average Score</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">87.2%</p>
          <span className="text-[11px] text-emerald-400 font-medium">Strong Hire Tier</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs">Top Rated Strength</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-white truncate">System Architecture</p>
          <span className="text-[11px] text-gray-400">92% Technical Depth</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-gray-800/80">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs">Key Improvement Area</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-white truncate">Distributed Observability</p>
          <span className="text-[11px] text-amber-400">Review OpenTelemetry</span>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Interview Practice Modules</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-normal">
              Direct Launch
            </span>
          </h2>
          <Link to="/setup" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
            <span>Custom Configurator</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLaunchers.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                onClick={() => navigate(mod.path)}
                className="group p-5 rounded-xl bg-surface border border-gray-800/80 hover:border-gray-700 hover:bg-surface-light transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-tr ${mod.color} flex items-center justify-center text-white shadow`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{mod.subtitle}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">{mod.tag}</span>
                  <span className="text-blue-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Start <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Interviews Table */}
      <div className="p-6 rounded-2xl bg-surface border border-gray-800/80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white">Recent Interview Simulations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Review AI rubrics, question audio, and download evaluation PDFs.
            </p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            Loading past simulation history...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Role & Domain</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-xs">
                {interviews.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.target_role}
                      <p className="text-[11px] font-normal text-gray-400">{item.domain}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-medium text-[11px]">
                        {item.interview_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-gray-300">{item.difficulty}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-400">
                        {item.overall_score ? `${item.overall_score}%` : 'Evaluating'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to="/results"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-xs"
                      >
                        <span>View Report</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
