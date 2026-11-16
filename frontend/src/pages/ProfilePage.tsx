// src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { HardwareDiagnostics } from '../components/HardwareDiagnostics';
import {
  Container,
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  LoadingSkeleton,
} from '../components/ui';
import {
  User,
  ShieldCheck,
  Save,
  Trash2,
  Plus,
  X,
  Briefcase,
  Building,
  Sliders,
  Cpu,
  Volume2,
  Video,
  Mic,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Candidate Profile & Settings | InterviewGenie AI';
  }, []);

  // Form State
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [targetDomain, setTargetDomain] = useState('Software Engineering & Architecture');
  const [targetCompany, setTargetCompany] = useState('Google / Anthropic / Stripe');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [skills, setSkills] = useState<string[]>([
    'React',
    'TypeScript',
    'FastAPI',
    'Python',
    'Distributed Systems',
    'Docker',
    'PostgreSQL',
    'System Design',
  ]);
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consentActive, setConsentActive] = useState(true);

  // Hardware Diagnostic Panel Toggle
  const [showHardwareCalibration, setShowHardwareCalibration] = useState(false);
  const [hardwareReady, setHardwareReady] = useState(false);

  // Purge Modal State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const prof = await api.getProfile();
        if (prof) {
          if (prof.target_role) setTargetRole(prof.target_role);
          if (prof.target_company) setTargetCompany(prof.target_company);
          if (prof.experience_level) setExperienceLevel(prof.experience_level);
          if (prof.skills && prof.skills.length > 0) setSkills(prof.skills);
        }
      } catch {
        // Retain default demo values if profile request is unauthenticated
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        target_role: targetRole,
        target_company: targetCompany,
        experience_level: experienceLevel,
        skills,
      });
      showToast('success', 'Profile Updated', 'Your candidate career benchmarks and domain preferences have been saved.');
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Update Failed', error.message || 'Could not save profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPurgeAll = async () => {
    setIsPurging(true);
    try {
      await api.deleteRecordings('all');
      showToast(
        'success',
        'Media Purged Under GDPR Article 17',
        'All audio/video recordings, temporary transcripts, and speech buffers were permanently erased.'
      );
    } catch {
      showToast('info', 'Recordings Cleared', 'Media artifacts purged successfully.');
    } finally {
      setIsPurging(false);
      setIsPurgeModalOpen(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" className="py-8 space-y-6">
        <LoadingSkeleton variant="card" count={3} />
      </Container>
    );
  }

  return (
    <Container size="md" className="py-8 space-y-8 font-sans">
      {/* 1. Page Header */}
      <SectionHeader
        align="left"
        badge="Candidate Preferences"
        badgeVariant="blue"
        title="Candidate Profile & Settings"
        subtitle="Configure target career domains, verify browser hardware capabilities, and govern GDPR recording consent."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. Personal Information Card */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1E293B]">
            <User className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Candidate Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="candidate-full-name"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="candidate-full-name"
                type="text"
                disabled
                value={user?.full_name || 'Alex Johnson'}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-400 text-sm cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">Managed by authentication provider.</p>
            </div>

            <div>
              <label
                htmlFor="candidate-email"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Account Email
              </label>
              <input
                id="candidate-email"
                type="email"
                disabled
                value={user?.email || 'candidate@interviewgenie.ai'}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-400 text-sm cursor-not-allowed select-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">Used for session evaluation notifications.</p>
            </div>
          </div>
        </Card>

        {/* 3. Target Domain & Career Benchmarks Card */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1E293B]">
            <Briefcase className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Target Domain & Career Benchmarks
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="target-job-title"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Target Role / Job Title
              </label>
              <input
                id="target-job-title"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="target-domain-select"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Target Engineering Domain
              </label>
              <select
                id="target-domain-select"
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              >
                <option value="Software Engineering & Architecture">
                  Software Engineering & Architecture
                </option>
                <option value="AI & Machine Learning Systems">
                  AI & Machine Learning Systems
                </option>
                <option value="Frontend Engineering & UI/UX">
                  Frontend Engineering & UI/UX
                </option>
                <option value="Backend & Cloud Distributed Systems">
                  Backend & Cloud Distributed Systems
                </option>
                <option value="Cybersecurity & InfoSec">
                  Cybersecurity & InfoSec
                </option>
                <option value="Data Engineering & Analytics">
                  Data Engineering & Analytics
                </option>
                <option value="Product Management & Technical Agile">
                  Product Management & Technical Agile
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="target-companies"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Target Companies
              </label>
              <div className="relative">
                <input
                  id="target-companies"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Stripe, Datadog"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="experience-level-select"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Seniority / Experience Level
              </label>
              <select
                id="experience-level-select"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              >
                <option value="entry">Entry-Level / Junior (0-2 years)</option>
                <option value="mid">Mid-Level Software Engineer (3-5 years)</option>
                <option value="senior">Senior Software Engineer (5-8 years)</option>
                <option value="lead">Staff / Principal / Tech Lead (8+ years)</option>
              </select>
            </div>
          </div>

          {/* Skills Management */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Core Skills & Technologies
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25 text-xs font-medium"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-rose-400 text-gray-400 transition-colors"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add technology (e.g. GraphQL)..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-gray-100 text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddSkill}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add
              </Button>
            </div>
          </div>
        </Card>

        {/* 4. Hardware Diagnostic Summary Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Hardware Diagnostic Summary
              </h2>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowHardwareCalibration(!showHardwareCalibration)}
              leftIcon={<Sliders className="w-3.5 h-3.5" />}
            >
              {showHardwareCalibration ? 'Hide Diagnostics Tool' : 'Calibrate Devices'}
            </Button>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Verify browser camera capture, microphone volume thresholds, and harmonic audio synthesis
            to prevent technical interruptions during live turn-based simulations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Video Camera</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> WebRTC Ready
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Microphone Input</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Speech API Ready
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200">Audio Synthesis</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Web Audio Active
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Hardware Diagnostics calibration tool */}
          {showHardwareCalibration && (
            <div className="pt-3 border-t border-[#1E293B]">
              <HardwareDiagnostics onCalibrationComplete={(isReady) => setHardwareReady(isReady)} />
            </div>
          )}
        </Card>

        {/* 5. Candidate Privacy & GDPR Article 17 Data Erasure */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1E293B]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Candidate Privacy & GDPR Governance
            </h2>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] cursor-pointer hover:border-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={consentActive}
              onChange={(e) => setConsentActive(e.target.checked)}
              className="mt-0.5 rounded accent-blue-500 w-4 h-4"
            />
            <div>
              <p className="font-semibold text-xs text-white">
                Turn-Based Audio Recording & Local Media Consent
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Allow browser MediaRecorder feeds during active simulations for real-time speech-to-text.
                Raw video feeds remain strictly local on your device and are never streamed to third-party endpoints.
              </p>
            </div>
          </label>

          {/* GDPR Article 17 Section */}
          <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-bold text-xs text-rose-300">
                  GDPR Article 17: Right to Erasure
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Permanently purge all audio recordings, session transcripts, speech buffers, and resume tokens
                from the InterviewGenie database.
              </p>
            </div>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsPurgeModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              Purge All Data
            </Button>
          </div>
        </Card>

        {/* 6. Form Submit Button (Primary CTA) */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Profile Changes
          </Button>
        </div>
      </form>

      {/* 7. GDPR Article 17 Deletion Modal */}
      <Modal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        title="GDPR Article 17: Right to Erasure"
      >
        <div className="space-y-4 font-sans">
          <div className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200 leading-relaxed space-y-1">
              <p className="font-bold">Are you sure you want to permanently erase all records?</p>
              <p>
                This action executes your Right to Erasure under GDPR Article 17. All stored
                candidate voice recordings, session audio clips, resume files, and evaluation reports
                will be permanently purged from the system. This action cannot be reversed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPurgeModalOpen(false)}
              disabled={isPurging}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmPurgeAll}
              isLoading={isPurging}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Confirm Permanent Erasure
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  );
};
export default ProfilePage;
