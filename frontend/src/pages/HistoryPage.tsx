// src/pages/HistoryPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  Modal,
} from '../components/ui';
import {
  Clock,
  Search,
  Video,
  Code,
  Brain,
  FileText,
  ChevronRight,
  Trash2,
  Play,
  BarChart3,
  X,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Session History | InterviewGenie AI';
  }, []);

  const { user } = useAuth();
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Purge modal state
  const [purgeTargetId, setPurgeTargetId] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const fetchInterviews = async () => {
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
      const e = err as Error;
      const msg = e.message || '';
      if (msg.includes('401') || msg.includes('403') || msg.includes('Authentication') || msg.includes('credentials')) {
        setInterviews([]);
      } else {
        setError(msg || 'Failed to load session history.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [user]);

  const handleConfirmPurge = async () => {
    if (!purgeTargetId) return;
    setIsPurging(true);
    try {
      await api.deleteRecordings(purgeTargetId);
      showToast(
        'success',
        'Recordings Purged',
        `All media recording artifacts for session ${purgeTargetId.slice(0, 8)}... were permanently deleted.`
      );
    } catch {
      showToast('info', 'Recordings Cleared', 'Media artifacts purged from session cache.');
    } finally {
      setIsPurging(false);
      setPurgeTargetId(null);
    }
  };

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

  const getScoreBadge = (score?: number, status?: string) => {
    if (score === undefined || score === null) {
      return (
        <Badge variant="gray" size="sm">
          {status === 'evaluating' ? 'Evaluating...' : 'In Progress'}
        </Badge>
      );
    }
    if (score >= 85) {
      return (
        <Badge variant="emerald" size="sm">
          {score}% • Strong Hire
        </Badge>
      );
    }
    if (score >= 70) {
      return (
        <Badge variant="blue" size="sm">
          {score}% • Hire
        </Badge>
      );
    }
    if (score >= 55) {
      return (
        <Badge variant="amber" size="sm">
          {score}% • Borderline
        </Badge>
      );
    }
    return (
      <Badge variant="rose" size="sm">
        {score}% • Needs Practice
      </Badge>
    );
  };

  // Filter & Search Logic
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (filterType !== 'all' && item.interview_type.toLowerCase() !== filterType.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRole = item.target_role?.toLowerCase().includes(q);
        const matchesDomain = item.domain?.toLowerCase().includes(q);
        const matchesId = item.id?.toLowerCase().includes(q);
        if (!matchesRole && !matchesDomain && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [interviews, filterType, searchQuery]);

  // Tab Counts
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: interviews.length,
      hr: 0,
      technical: 0,
      aptitude: 0,
      resume: 0,
    };
    interviews.forEach((i) => {
      const t = i.interview_type.toLowerCase();
      if (map[t] !== undefined) {
        map[t] += 1;
      }
    });
    return map;
  }, [interviews]);

  const filterTabs = [
    { id: 'all', label: 'All Sessions', count: counts.all },
    { id: 'hr', label: 'HR Behavioral', count: counts.hr },
    { id: 'technical', label: 'Technical IDE', count: counts.technical },
    { id: 'aptitude', label: 'Aptitude Test', count: counts.aptitude },
    { id: 'resume', label: 'Resume Tailored', count: counts.resume },
  ];

  return (
    <Container size="lg" className="py-8 space-y-8 font-sans">
      {/* 1. Header with Single Primary CTA */}
      <SectionHeader
        align="left"
        badge="Session Archive"
        badgeVariant="blue"
        title="Candidate Session History"
        subtitle="Review past rubric evaluations, track progression benchmarks, and manage session media artifacts under GDPR compliance."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/analytics')}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              Analytics
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/setup')}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Start Simulation
            </Button>
          </div>
        }
      />

      {/* 2. Error State */}
      {error && (
        <ErrorState
          title="Could Not Load Sessions"
          message={error}
          onRetry={fetchInterviews}
          retryLabel="Reload Sessions"
        />
      )}

      {/* 3. Search and Filter Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by role, domain, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Session round filters">
            {filterTabs.map((tab) => {
              const isActive = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilterType(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-[#0B0F19] text-gray-400 hover:text-gray-200 border border-[#1E293B] hover:border-gray-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 4. Session Content Area */}
      {loading ? (
        <LoadingSkeleton variant="table" rows={6} columns={5} />
      ) : interviews.length === 0 ? (
        /* Empty state when 0 sessions exist in total */
        <EmptyState
          icon={<Clock className="w-8 h-8 text-blue-400" />}
          title="No Interview Sessions Yet"
          description="Complete your first interview simulation to calibrate competency trajectories, rubric scoring distributions, and performance archives."
          action={{
            label: 'Start Practice',
            onClick: () => navigate('/setup'),
            icon: <Play className="w-4 h-4 fill-current" />,
          }}
        />
      ) : filteredInterviews.length === 0 ? (
        /* Empty state when filters return 0 results */
        <EmptyState
          icon={<Search className="w-8 h-8 text-amber-400" />}
          title="No Matching Sessions Found"
          description="No past interview simulations matched your search query or selected track filter."
          action={{
            label: 'Reset Filters',
            onClick: () => {
              setSearchQuery('');
              setFilterType('all');
            },
          }}
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Role & Track</TableHead>
                <TableHead>Domain & Focus</TableHead>
                <TableHead>Difficulty & Date</TableHead>
                <TableHead>Overall Rubric Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterviews.map((item) => {
                const dateString = item.created_at
                  ? new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <TableRow key={item.id}>
                    {/* Role & Icon */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center shrink-0">
                          {getRoundIcon(item.interview_type)}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {item.target_role || 'General Software Engineer'}
                          </div>
                          <div className="text-xs text-gray-400 capitalize flex items-center gap-1.5 mt-0.5">
                            <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-300">
                              {item.interview_type}
                            </span>
                            <span>•</span>
                            <span>ID: {item.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Domain */}
                    <TableCell>
                      <span className="text-sm text-gray-300">{item.domain}</span>
                    </TableCell>

                    {/* Difficulty & Date */}
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium text-gray-300 capitalize">
                          {item.difficulty} Level
                        </div>
                        <div className="text-gray-500">{dateString}</div>
                      </div>
                    </TableCell>

                    {/* Score */}
                    <TableCell>{getScoreBadge(item.overall_score, item.status)}</TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/results?sessionId=${item.id}`)}
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                        >
                          Report
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPurgeTargetId(item.id)}
                          title="Purge media recording artifacts (GDPR Article 17)"
                          aria-label={`Purge recordings for session ${item.id}`}
                          className="text-gray-400 hover:text-rose-400 hover:bg-rose-950/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 5. Purge Confirmation Modal */}
      <Modal
        isOpen={Boolean(purgeTargetId)}
        onClose={() => setPurgeTargetId(null)}
        title="Purge Session Media Recordings?"
      >
        <div className="space-y-4 font-sans">
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200 leading-relaxed">
              In compliance with GDPR Article 17 (Right to Erasure), this will permanently expunge
              all recorded audio/video streams, temporary browser blobs, and voice buffers for
              session <strong className="text-white">{purgeTargetId?.slice(0, 12)}...</strong>.
              Rubric scores and numerical evaluations will be retained.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPurgeTargetId(null)}
              disabled={isPurging}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmPurge}
              isLoading={isPurging}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Permanently Purge Media
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
};
export default HistoryPage;
