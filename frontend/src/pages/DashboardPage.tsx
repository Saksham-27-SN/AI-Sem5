// src/pages/DashboardPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { InterviewSession } from '../types';
import {
  Container,
  SectionHeader,
  Card,
  Badge,
  Button,
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  LoadingSkeleton,
  ErrorState,
} from '../components/ui';
import {
  Play,
  Video,
  Code,
  Brain,
  FileText,
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  BarChart3,
  Bot,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Dashboard | InterviewGenie AI';
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) {
        setInterviews([]);
        return;
      }
      const list = await api.listInterviews();
      setInterviews(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Unable to retrieve your interview sessions. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived fact-based statistics from real session data
  const totalSimulations = interviews.length;
  const completedSessions = interviews.filter((s) => s.status === 'completed');
  const evaluatedSessions = interviews.filter(
    (s) => typeof s.overall_score === 'number' && !isNaN(s.overall_score)
  );
  const averageScore =
    evaluatedSessions.length > 0
      ? Math.round(
          evaluatedSessions.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) /
            evaluatedSessions.length
        )
      : null;

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
    <Container size="lg" className="py-8 space-y-8">
      {/* 1. Page Header & Single Primary CTA */}
      <SectionHeader
        align="left"
        badge="Multi-Agent Readiness Hub"
        badgeVariant="blue"
        title={`Welcome back${user?.full_name ? `, ${user.full_name}` : ''}`}
        subtitle="Manage your mock simulation pipeline, review multi-agent evaluation rubrics, and launch focused interview tracks."
        action={
          <Link to="/setup">
            <Button variant="primary" size="md" leftIcon={<Play className="w-4 h-4 fill-current" />}>
              Start Practice
            </Button>
          </Link>
        }
      />

      {/* 2. Loading State */}
      {loading && (
        <div className="space-y-6">
          <LoadingSkeleton variant="card" count={4} />
          <LoadingSkeleton variant="table" rows={4} columns={6} />
        </div>
      )}

      {/* 3. Error State */}
      {!loading && error && (
        <ErrorState
          title="Could Not Load Dashboard Data"
          message={error}
          onRetry={loadData}
          retryLabel="Retry Connection"
        />
      )}

      {/* 4. Main Content when loaded successfully */}
      {!loading && !error && (
        <>
          {/* Fact-Based Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Real Completed Count */}
            <Card padding="sm" className="flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-sm font-semibold">Completed Simulations</span>
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{completedSessions.length}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalSimulations} total sessions recorded
                </p>
              </div>
            </Card>

            {/* Tile 2: Real Average Score or Ready to Benchmark */}
            <Card padding="sm" className="flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-sm font-semibold">Average Score</span>
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">
                  {averageScore !== null ? `${averageScore}%` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {evaluatedSessions.length > 0
                    ? `Based on ${evaluatedSessions.length} evaluated round${evaluatedSessions.length > 1 ? 's' : ''}`
                    : 'Awaiting first evaluated session'}
                </p>
              </div>
            </Card>

            {/* Tile 3: Fact-based Track Coverage */}
            <Card padding="sm" className="flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-sm font-semibold">Interview Tracks</span>
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">4 Modules</p>
                <p className="text-xs text-emerald-400 mt-1 font-medium">
                  HR, Technical, Aptitude, Resume
                </p>
              </div>
            </Card>

            {/* Tile 4: Fact-based Autonomous Engine Status */}
            <Card padding="sm" className="flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-sm font-semibold">Autonomous Agents</span>
                <Bot className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">4 Personas</p>
                <p className="text-xs text-gray-400 mt-1">
                  Elena, Marcus, Cipher, Athena
                </p>
              </div>
            </Card>
          </div>

          {/* Quick Launch Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Interview Practice Modules
                </h2>
                <Badge variant="blue" size="sm">
                  Direct Launch
                </Badge>
              </div>
              <Link
                to="/setup"
                className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors duration-150"
              >
                <span>Custom Configurator</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLaunchers.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Card
                    key={mod.title}
                    variant="interactive"
                    padding="sm"
                    onClick={() => navigate(mod.path)}
                    className="flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${mod.color} flex items-center justify-center text-white shadow-md`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <Badge variant="gray" size="sm">
                          {mod.badge}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors duration-150">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                        {mod.subtitle}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">{mod.tag}</span>
                      <span className="text-blue-400 font-semibold group-hover:translate-x-1 transition-transform duration-150 flex items-center gap-0.5">
                        Start <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Interviews / Empty State Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Recent Interview Simulations
                </h2>
                <p className="text-sm text-gray-300 mt-0.5">
                  Review deterministic scoring, question transcripts, and performance rubrics.
                </p>
              </div>
              {interviews.length > 0 && (
                <Link
                  to="/history"
                  className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors duration-150"
                >
                  <span>View All History</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {interviews.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-6 h-6 text-blue-400" />}
                title="No Interview Sessions Yet"
                description="Start your first simulation to benchmark your skills with deterministic multi-agent scoring."
                action={{
                  label: 'Start Practice',
                  onClick: () => navigate('/setup'),
                  icon: <Play className="w-4 h-4 fill-current" />,
                }}
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHeader sticky>
                    <TableRow>
                      <TableHead>Role & Domain</TableHead>
                      <TableHead>Track Type</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interviews.map((item) => (
                      <TableRow key={item.id} hoverable striped>
                        <TableCell>
                          <p className="font-semibold text-white">{item.target_role}</p>
                          <p className="text-xs text-gray-400">{item.domain}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="indigo" size="sm">
                            {item.interview_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-gray-200">
                          {item.difficulty}
                        </TableCell>
                        <TableCell>
                          {typeof item.overall_score === 'number' ? (
                            <span className="font-bold text-emerald-400">
                              {item.overall_score}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Evaluating</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.status === 'completed' ? 'emerald' : 'amber'}
                            size="sm"
                            dot
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to={`/results?sessionId=${item.id}`}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-sm transition-colors duration-150"
                          >
                            <span>View Report</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        </>
      )}
    </Container>
  );
};
