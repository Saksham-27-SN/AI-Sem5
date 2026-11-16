// src/pages/AnalyticsPage.tsx
import React, { useEffect, useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AnalyticsResponse, ScoreProgressionPoint } from '../types';
import {
  Container,
  SectionHeader,
  Card,
  Badge,
  Button,
  EmptyState,
  LoadingSkeleton,
  ErrorState,
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui';
import {
  TrendingUp,
  Award,
  Clock,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Play,
  Video,
  Code,
  Brain,
  FileText,
  ChevronRight,
  Layers,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const gradientId = useId();

  useEffect(() => {
    document.title = 'Performance Analytics | InterviewGenie AI';
  }, []);

  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlayVectors, setOverlayVectors] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) {
        setData(null);
        return;
      }
      const res = await api.getAnalytics();
      setData(res);
    } catch (err: unknown) {
      const errorObj = err as Error;
      const msg = errorObj.message || '';
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('Authentication') ||
        msg.includes('credentials')
      ) {
        setData(null);
      } else {
        setError(msg || 'Failed to retrieve analytics data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const getRoundIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hr':
        return <Video className="w-3.5 h-3.5 text-blue-400" />;
      case 'technical':
        return <Code className="w-3.5 h-3.5 text-purple-400" />;
      case 'aptitude':
        return <Brain className="w-3.5 h-3.5 text-emerald-400" />;
      case 'resume':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  if (loading) {
    return (
      <Container size="lg" className="py-8 space-y-6">
        <LoadingSkeleton variant="card" count={4} />
        <LoadingSkeleton variant="table" rows={5} columns={6} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" className="py-12">
        <ErrorState
          title="Could Not Load Analytics"
          message={error}
          onRetry={fetchAnalytics}
          retryLabel="Retry"
        />
      </Container>
    );
  }

  // True empty state when no interviews have been completed
  const hasNoData =
    !data ||
    (data.summary.total_interviews === 0 && data.score_progression.length === 0);

  if (hasNoData) {
    return (
      <Container size="lg" className="py-12">
        <EmptyState
          icon={<BarChart3 className="w-8 h-8 text-blue-400" />}
          title="No Analytics Data Available"
          description="Complete your first interview simulation to calibrate competency trajectories, rubric scoring distributions, and AI feedback trends."
          action={{
            label: 'Start Practice',
            onClick: () => navigate('/setup'),
            icon: <Play className="w-4 h-4 fill-current" />,
          }}
        />
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-8 space-y-8 font-sans">
      {/* 1. Header with Single Primary CTA */}
      <SectionHeader
        align="left"
        badge="Autonomous Performance Intelligence"
        badgeVariant="blue"
        title="Performance Analytics & Progress"
        subtitle="Track multi-agent rubric evaluations, competency trajectories, and deterministic growth vectors over time."
        action={
          <div className="flex items-center gap-2.5">
            <Link to="/history">
              <Button variant="secondary" size="sm">
                View History
              </Button>
            </Link>
            <Link to="/setup">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Start Practice
              </Button>
            </Link>
          </div>
        }
      />

      {/* 2. Real KPI Summary Tiles (0 Fabricated Claims) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Score */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-sm font-semibold">Average Score</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white">
              {data.summary.average_score > 0 ? `${data.summary.average_score}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {data.summary.readiness_status || 'Active Evaluation'}
            </p>
          </div>
        </Card>

        {/* Highest Score */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-sm font-semibold">Highest Score</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-purple-400">
              {data.summary.highest_score > 0 ? `${data.summary.highest_score}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Top evaluated benchmark
            </p>
          </div>
        </Card>

        {/* Total Interviews */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-sm font-semibold">Simulations Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white">
              {data.summary.total_interviews}
            </p>
            <p className="text-xs text-emerald-400 mt-1 font-medium">
              Completion Rate: {data.summary.completion_rate}%
            </p>
          </div>
        </Card>

        {/* Practice Time */}
        <Card padding="md" className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-sm font-semibold">Practice Time</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400">
              {data.summary.total_practice_minutes}m
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Turn-based voice with live transcript
            </p>
          </div>
        </Card>
      </div>

      {/* 3. Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Progression Area / Line Chart (Span 2 cols) */}
        <Card padding="lg" className="lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Score Progression Over Time
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Trajectory of overall and sub-vector scores across completed simulations
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOverlayVectors(!overlayVectors)}
              leftIcon={<Layers className="w-3.5 h-3.5" />}
              className="self-start sm:self-auto"
            >
              {overlayVectors ? 'Detailed Sub-Scores On' : 'Overall Score Only'}
            </Button>
          </div>

          <div className="h-72 w-full pt-2">
            {data.score_progression.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.score_progression}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1E293B' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={11}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={{ stroke: '#1E293B' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload as ScoreProgressionPoint;
                        return (
                          <div className="bg-[#131B2E] border border-[#1E293B] p-3 rounded-xl shadow-xl text-xs space-y-1 text-gray-200">
                            <p className="font-bold text-white">
                              {label} • {pt.role}
                            </p>
                            <p className="text-gray-400 capitalize">
                              Track: <span className="text-blue-400 font-medium">{pt.interview_type}</span>
                            </p>
                            <div className="pt-1.5 border-t border-[#1E293B] space-y-0.5">
                              <p className="text-blue-400 font-semibold">
                                Overall Score: {pt.overall_score}%
                              </p>
                              {pt.technical_score !== undefined && (
                                <p className="text-purple-400">Technical Depth: {pt.technical_score}%</p>
                              )}
                              {pt.communication_score !== undefined && (
                                <p className="text-emerald-400">Communication: {pt.communication_score}%</p>
                              )}
                              {pt.problem_solving_score !== undefined && (
                                <p className="text-amber-400">Problem Solving: {pt.problem_solving_score}%</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="overall_score"
                    name="Overall Score"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    activeDot={{ r: 6, fill: '#60A5FA', stroke: '#1D4ED8', strokeWidth: 2 }}
                  />
                  {overlayVectors && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="technical_score"
                        name="Technical"
                        stroke="#A855F7"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="communication_score"
                        name="Communication"
                        stroke="#10B981"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="problem_solving_score"
                        name="Problem Solving"
                        stroke="#F59E0B"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-[#1E293B] rounded-xl text-xs text-gray-500">
                Progression curve renders once a simulation session is completed.
              </div>
            )}
          </div>
        </Card>

        {/* Competencies Radar Chart */}
        <Card padding="lg" className="space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Competency Radar
              </h2>
              <Badge variant="purple" size="sm">
                Vectors
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Candidate profile vs standard benchmark
            </p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {data.competencies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={data.competencies}
                >
                  <PolarGrid stroke="#1E293B" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="#334155"
                    tick={{ fill: '#64748B', fontSize: 9 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#131B2E] border border-[#1E293B] p-2.5 rounded-xl text-xs space-y-1 shadow-lg text-gray-200">
                            <p className="font-bold text-white">{item.competency}</p>
                            <p className="text-purple-400 font-semibold">
                              Candidate: {item.candidate_score}%
                            </p>
                            <p className="text-gray-400">
                              Benchmark: {item.benchmark_score}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Radar
                    name="Candidate"
                    dataKey="candidate_score"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.4}
                  />
                  <Radar
                    name="Benchmark"
                    dataKey="benchmark_score"
                    stroke="#475569"
                    fill="#475569"
                    fillOpacity={0.15}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-[#1E293B] rounded-xl text-xs text-gray-500">
                Radar analysis awaits initial rubric scores.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. Round Comparison & Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Round Performance Comparison BarChart (Span 2 cols) */}
        <Card padding="lg" className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Round-by-Round Breakdown vs Benchmark
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Candidate average score against tier-1 engineering benchmark (70-75%)
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            {data.round_comparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.round_comparison}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="round"
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1E293B' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={11}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={{ stroke: '#1E293B' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-[#131B2E] border border-[#1E293B] p-2.5 rounded-xl text-xs space-y-1 shadow-lg text-gray-200">
                            <p className="font-bold text-white">{label}</p>
                            <p className="text-emerald-400 font-semibold">
                              Candidate Average: {item.average_score}%
                            </p>
                            <p className="text-gray-400">
                              Benchmark: {item.benchmark}%
                            </p>
                            <p className="text-gray-500 text-[10px]">
                              Sessions recorded: {item.sessions_count}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="rect"
                    wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }}
                  />
                  <Bar
                    dataKey="average_score"
                    name="Candidate Average"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  >
                    {data.round_comparison.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.average_score >= entry.benchmark
                            ? '#10B981'
                            : '#F59E0B'
                        }
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="benchmark"
                    name="Benchmark"
                    fill="#334155"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-[#1E293B] rounded-xl text-xs text-gray-500">
                Round performance data populates after completing interviews.
              </div>
            )}
          </div>
        </Card>

        {/* Actionable Next Step & Rubric Vectors */}
        <Card padding="lg" className="space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                AI Recommendation
              </h2>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {data.recommended_next_action}
              </p>
            </div>

            {data.strengths.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Key Strengths Articulated
                </h3>
                <div className="space-y-1.5">
                  {data.strengths.slice(0, 3).map((str, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/25 text-xs text-emerald-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                      <span className="leading-tight">{str}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.weaknesses.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Growth Focus Areas
                </h3>
                <div className="space-y-1.5">
                  {data.weaknesses.slice(0, 2).map((weak, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-amber-950/20 border border-amber-500/25 text-xs text-amber-300"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                      <span className="leading-tight">{weak}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link to="/setup" className="block w-full">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-500/30"
            >
              Launch Next Practice Round
            </Button>
          </Link>
        </Card>
      </div>

      {/* 5. Evaluated Sessions History Table */}
      {data.score_progression.length > 0 && (
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Evaluated Sessions History
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Detailed records and links to full STAR rubric evaluation reports
              </p>
            </div>

            <Link
              to="/history"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All Sessions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <TableContainer>
            <Table>
              <TableHeader sticky>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Target Role</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.score_progression.map((item) => (
                  <TableRow key={item.session_id} hoverable striped>
                    <TableCell className="font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center">
                          {getRoundIcon(item.interview_type)}
                        </div>
                        <span>#{item.session_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">{item.date}</TableCell>
                    <TableCell className="font-medium text-gray-200">{item.role}</TableCell>
                    <TableCell>
                      <Badge variant="indigo" size="sm" className="capitalize">
                        {item.interview_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-bold ${
                          item.overall_score >= 85
                            ? 'text-emerald-400'
                            : item.overall_score >= 70
                            ? 'text-blue-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {item.overall_score}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/results?sessionId=${item.session_id}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-xs"
                      >
                        <span>View Rubric</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Container>
  );
};
