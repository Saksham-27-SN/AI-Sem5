// src/pages/ResultsPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { EvaluationReport } from '../types';
import {
  Container,
  SectionHeader,
  Card,
  Badge,
  Button,
  EmptyState,
  LoadingSkeleton,
  ErrorState,
} from '../components/ui';
import {
  Award,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export const ResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'session_demo_eval';
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Evaluation & Rubrics | InterviewGenie AI';
  }, []);

  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        if (!user && sessionId === 'session_demo_eval') {
          setReport(null);
          return;
        }
        const data = await api.getEvaluation(sessionId);
        setReport(data);
        if (data?.question_evaluations?.length) {
          setExpandedQuestion(data.question_evaluations[0].question_id);
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        const msg = errorObj.message || '';
        // If unauthenticated, not found, or default placeholder session, present clean EmptyState
        if (
          msg.includes('401') ||
          msg.includes('404') ||
          msg.includes('Authentication') ||
          msg.includes('credentials') ||
          sessionId === 'session_demo_eval'
        ) {
          setReport(null);
        } else {
          setError(msg || 'Could not load evaluation report.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [sessionId, user]);

  const handleDownloadPdf = () => {
    const url = api.getReportPdfDownloadUrl(sessionId);
    window.open(url, '_blank');
    showToast('info', 'Downloading PDF Report', 'Opening binary PDF report in a new tab.');
  };

  const getTierBadge = (score: number) => {
    if (score >= 85) {
      return <Badge variant="emerald" size="md">Strong Hire Tier</Badge>;
    }
    if (score >= 70) {
      return <Badge variant="blue" size="md">Hire Tier</Badge>;
    }
    if (score >= 55) {
      return <Badge variant="amber" size="md">Borderline Tier</Badge>;
    }
    return <Badge variant="rose" size="md">Needs Practice Tier</Badge>;
  };

  if (loading) {
    return (
      <Container size="lg" className="py-8 space-y-6">
        <LoadingSkeleton variant="card" count={3} />
        <LoadingSkeleton variant="table" rows={4} columns={4} />
      </Container>
    );
  }

  if (error || !report) {
    return (
      <Container size="lg" className="py-12">
        {error ? (
          <ErrorState
            title="Unable to Retrieve Evaluation"
            message={error}
            onRetry={() => window.location.reload()}
            retryLabel="Retry"
          />
        ) : (
          <EmptyState
            icon={<Award className="w-8 h-8 text-blue-400" />}
            title="No Evaluation Report Found"
            description="Complete an interview simulation to generate deterministic rubric analytics and performance debrief."
            action={{
              label: 'Start Practice',
              onClick: () => navigate('/setup'),
              icon: <Play className="w-4 h-4 fill-current" />,
            }}
          />
        )}
      </Container>
    );
  }

  // Transform round scores for Recharts
  const chartData = Object.entries(report.round_scores).map(([name, score]) => ({
    name: name.length > 18 ? name.slice(0, 16) + '...' : name,
    fullName: name,
    score: Math.round(score),
  }));

  const barColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4'];

  return (
    <Container size="lg" className="py-8 space-y-8 font-sans">
      {/* 1. Top Header Card */}
      <Card variant="glow" padding="lg" className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-3">
              <Award className="w-4 h-4 text-blue-400" />
              <span>Official Simulation Evaluation Report</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Candidate Performance Debrief
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Session ID: <span className="font-mono text-gray-200">{report.interview_id}</span> • Status:{' '}
              <span className="capitalize text-emerald-400 font-semibold">{report.status}</span>
            </p>
          </div>

          {/* Overall Score Box */}
          <div className="flex items-center gap-5 bg-[#0B0F19]/90 p-5 rounded-2xl border border-[#1E293B] shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Overall Score</p>
              <p className="text-4xl font-extrabold text-emerald-400 my-1">
                {report.overall_score}%
              </p>
              <div>{getTierBadge(report.overall_score)}</div>
            </div>

            <div className="border-l border-[#1E293B] pl-5 space-y-2.5">
              {/* Single Primary CTA */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                leftIcon={<Download className="w-4 h-4" />}
                className="w-full"
              >
                Download PDF Report
              </Button>

              <Link to="/setup" className="block w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="w-full"
                >
                  New Simulation
                </Button>
              </Link>

              <Link to="/analytics" className="block w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<TrendingUp className="w-3.5 h-3.5 text-blue-400" />}
                  className="w-full text-blue-300 hover:text-white"
                >
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Rubric Breakdown Chart & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Bar Chart (7 cols) */}
        <Card padding="md" className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Rubric Dimension Breakdown
            </h2>
            <p className="text-sm text-gray-300 mb-6">
              Normalized scoring across core software engineering competencies.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#9CA3AF" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#131B2E',
                      borderColor: '#1E293B',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F3F4F6',
                    }}
                    formatter={(val) => [`${val}%`, 'Score']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4 border-t border-[#1E293B] text-center">
            {chartData.map((d) => (
              <div key={d.fullName} className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                <p className="text-xs text-gray-400 truncate">{d.fullName}</p>
                <p className="text-sm font-bold text-white mt-0.5">{d.score}%</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Strengths & Focus Areas (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Key Strengths */}
          <Card padding="md" className="border-emerald-500/30 flex-1">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Identified Strengths
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-200">
              {report.overall_strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Focus Areas & Blindspots */}
          <Card padding="md" className="border-amber-500/30 flex-1">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Focus Areas & Blindspots
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-200">
              {report.critical_weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* 3. Question-by-Question Deep Dive */}
      <Card padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Detailed Question Responses & Feedback
          </h2>
          <p className="text-sm text-gray-300 mt-0.5">
            Click any question to review your transcript, sub-scores, and deterministic evaluator feedback.
          </p>
        </div>

        <div className="space-y-3">
          {report.question_evaluations.map((q, idx) => {
            const isExpanded = expandedQuestion === q.question_id;
            return (
              <div
                key={q.question_id}
                className="rounded-xl border border-[#1E293B] bg-[#0B0F19] overflow-hidden transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.question_id)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-800/40 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-white line-clamp-1">
                      {q.question_text}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <Badge variant={q.score >= 80 ? 'emerald' : q.score >= 65 ? 'blue' : 'amber'} size="sm">
                      {q.score}%
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-[#1E293B] text-sm space-y-4 text-gray-200">
                    <div>
                      <p className="font-semibold text-gray-400 uppercase text-xs mb-1.5">
                        Candidate Answer
                      </p>
                      <p className="p-3.5 rounded-xl bg-[#131B2E] border border-[#1E293B] text-gray-200 leading-relaxed font-mono text-xs">
                        "{q.answer_text}"
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-2.5 rounded-xl bg-[#131B2E] border border-[#1E293B]">
                        <p className="text-xs text-gray-400">Relevance</p>
                        <p className="font-bold text-sm text-white mt-0.5">{q.relevance_score}%</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131B2E] border border-[#1E293B]">
                        <p className="text-xs text-gray-400">Clarity</p>
                        <p className="font-bold text-sm text-white mt-0.5">{q.clarity_score}%</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#131B2E] border border-[#1E293B]">
                        <p className="text-xs text-gray-400">Technical Depth</p>
                        <p className="font-bold text-sm text-white mt-0.5">{q.technical_depth_score}%</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/25">
                      <p className="font-semibold text-blue-300 mb-1 text-sm">Evaluator Feedback</p>
                      <p className="text-sm text-gray-200 leading-relaxed">{q.feedback}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <p className="font-semibold text-emerald-400 mb-1.5 text-sm">Key Strengths</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                          {q.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-amber-400 mb-1.5 text-sm">Targeted Improvements</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                          {q.improvements.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 4. Actionable Improvement Plan */}
      <Card padding="lg" className="space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          Recommended Actionable Improvement Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.improvement_plan.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">{item.topic}</p>
                <p className="text-xs text-gray-300 leading-relaxed">{item.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Container>
  );
};
