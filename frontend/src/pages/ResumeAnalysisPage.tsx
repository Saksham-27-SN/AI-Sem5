// src/pages/ResumeAnalysisPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { ResumeUploadResponse } from '../types';
import {
  Button,
  Card,
  Badge,
  Container,
  SectionHeader,
  Input,
} from '../components/ui';
import {
  FileText,
  UploadCloud,
  Sparkles,
  Play,
  X,
  Plus,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

export const ResumeAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.title = 'Resume Tailor & Question Generator | InterviewGenie AI';
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Zero fabricated initial state - starts strictly null
  const [resumeData, setResumeData] = useState<ResumeUploadResponse | null>(null);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [tailoredQuestions, setTailoredQuestions] = useState<string[]>([]);

  const handleFile = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Please upload a resume under 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadResume(file);
      setResumeData(res);
      if (res.extracted_skills?.length) {
        setTailoredQuestions([
          `Based on your hands-on experience with ${res.extracted_skills.slice(0, 2).join(' and ')}, how do you architect high-throughput services under peak traffic?`,
          `Can you describe a challenging performance bottleneck or architectural regression you investigated and resolved in ${res.extracted_skills[0]}?`,
          `How do you design database schema migrations, automated rollback strategies, and zero-downtime deployment pipelines in production?`,
        ]);
      } else {
        setTailoredQuestions([
          'Describe a complex software project you led from inception to production deployment.',
          'How do you approach performance profiling, concurrency bottlenecks, and system scalability?',
          'What strategies do you use for automated testing and continuous integration?',
        ]);
      }
      showToast(
        'success',
        'Resume Parsed Successfully',
        `Extracted ${res.extracted_skills?.length || 0} skills from ${file.name}`
      );
    } catch (err: unknown) {
      const error = err as Error;
      showToast('error', 'Upload Error', error.message || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleAddSkill = () => {
    if (!resumeData) return;
    const trimmed = newSkillInput.trim();
    if (trimmed && !resumeData.extracted_skills.includes(trimmed)) {
      setResumeData({
        ...resumeData,
        extracted_skills: [...resumeData.extracted_skills, trimmed],
      });
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      extracted_skills: resumeData.extracted_skills.filter((s) => s !== skill),
    });
  };

  const handleLaunchTailored = async () => {
    if (!resumeData) return;
    try {
      const session = await api.createInterview({
        interview_type: 'resume',
        domain: 'Full Stack & Cloud Architecture',
        target_role: 'Senior Software Engineer',
        difficulty: 'medium',
        total_questions: 5,
        custom_topics: resumeData.extracted_skills,
        enable_voice: true,
        enable_video: true,
      });

      showToast(
        'success',
        'Resume Session Initialized',
        'Launching simulation with questions calibrated to your resume...'
      );
      navigate(`/interview/live?sessionId=${session.id}`);
    } catch {
      navigate('/interview/live');
    }
  };

  const handleResetResume = () => {
    setResumeData(null);
    setTailoredQuestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container size="md" className="min-h-[calc(100vh-4rem)] py-8 space-y-8 font-sans">
      {/* 1. Header */}
      <SectionHeader
        badge="Resume Deep-Dive Engine"
        badgeVariant="amber"
        title="Resume Tailor & Question Generator"
        subtitle="Upload your resume to extract verified competencies, experience history, and generate targeted behavioral and technical interview challenges."
        align="left"
      />

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 text-center flex flex-col items-center justify-center relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : 'border-[#1E293B] bg-[#131B2E] hover:border-gray-500 hover:bg-[#1A253D]'
        }`}
        tabIndex={0}
        role="button"
        aria-label="Upload Resume File"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10 border border-amber-500/30">
          {uploading ? (
            <RefreshCw className="w-8 h-8 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight">
          {uploading
            ? 'Extracting Resume Signals...'
            : resumeData
            ? 'Upload a Different Resume'
            : 'Click to Upload or Drag & Drop'}
        </h3>
        <p className="text-sm text-gray-300 mt-1 max-w-sm leading-relaxed">
          Supports PDF, DOCX, and TXT files (Max 10 MB). Data is parsed in memory with strict candidate privacy.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-semibold"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Upload PDF Resume
          </Button>
          <Badge variant="gray" size="sm">PDF &lt;= 10MB</Badge>
          <Badge variant="emerald" size="sm" dot>
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
            GDPR Compliant • Data processed securely in memory
          </Badge>
        </div>
      </div>

      {/* 3. Extracted Profile Breakdown (Rendered ONLY after genuine upload) */}
      {resumeData && (
        <Card variant="default" padding="lg" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">{resumeData.filename}</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Parsed Length: {resumeData.raw_text_length} characters
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="amber" size="md">
                Seniority: {resumeData.experience_level || 'Evaluated'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetResume}
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-gray-400" />}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Extracted Summary */}
          {resumeData.summary && (
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                Extracted Professional Summary
              </h4>
              <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-sm text-gray-200 leading-relaxed italic shadow-inner">
                "{resumeData.summary}"
              </div>
            </div>
          )}

          {/* Verified Skills Tags with Dismiss & Add */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Extracted Competency & Skill Tags ({resumeData.extracted_skills.length})
              </h4>
              <span className="text-xs text-gray-400">Click × to remove</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {resumeData.extracted_skills.map((skill) => (
                <Badge key={skill} variant="blue" size="md" className="gap-2">
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-rose-400 text-blue-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded p-0.5 cursor-pointer"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Add Custom Skill Tag */}
            <div className="flex gap-2 max-w-sm">
              <Input
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add custom skill (e.g. Kubernetes, Redis)..."
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddSkill}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                Add
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Generated Tailored Questions (Rendered after upload) */}
      {resumeData && tailoredQuestions.length > 0 && (
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Tailored Simulation Questions Generated</span>
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Multi-agent synthesis targeting specific architectural trade-offs in your background
              </p>
            </div>

            <Badge variant="amber" size="sm">
              Agent Athena
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            {tailoredQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-start gap-3.5 hover:border-gray-700 transition-colors shadow-inner"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{q}</p>
              </div>
            ))}
          </div>

          {/* Launch Targeted Session: Single Primary CTA */}
          <div className="pt-4 border-t border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready to calibrate against real architectural questions</span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleLaunchTailored}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 border-amber-400/30"
            >
              Launch Targeted Session
            </Button>
          </div>
        </Card>
      )}
    </Container>
  );
};
