// src/pages/PrivacyPage.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  SectionHeader,
  Card,
  Badge,
  Button,
} from '../components/ui';
import {
  ShieldCheck,
  Lock,
  Trash2,
  EyeOff,
  Server,
  FileCheck2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy & GDPR Compliance | InterviewGenie AI';
  }, []);

  return (
    <Container size="md" className="py-8 space-y-8 font-sans">
      {/* 1. Page Header */}
      <SectionHeader
        align="left"
        badge="GDPR & Data Sovereignty"
        badgeVariant="blue"
        title="Privacy Policy & GDPR Compliance"
        subtitle="Last revised: November 2026 • Plain language commitment to data minimization, biometric privacy, and candidate ownership."
        action={
          <Link to="/profile">
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Manage Privacy Settings
            </Button>
          </Link>
        }
      />

      {/* 2. Privacy Policy Sections */}
      <div className="space-y-6">
        {/* Article 5 */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">Article 5 • Data Minimization</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                1. Local Device Media Processing & Edge Isolation
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Camera and microphone feeds are handled using standard browser WebRTC and Web Speech APIs. Video streams are rendered directly to your local HTML5 video element for candidate self-monitoring and are never streamed to remote cloud servers during standard question evaluations.
              </p>
            </div>
          </div>
        </Card>

        {/* Articles 6 & 7 */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="sm">Articles 6 & 7 • Consent</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                2. Explicit Informed Recording Consent
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Simulation recording requires affirmative, opt-in consent prior to entering an interview room. If recording is enabled, media buffers are stored locally in temporary browser memory with immediate preview, local MP4/WebM download capabilities, and complete user erasure controls.
              </p>
            </div>
          </div>
        </Card>

        {/* Model Governance */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="sm">Model Governance</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                3. Zero Foundation Model Training on Candidate Data
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Transcripts, uploaded resumes, code submissions, and rubric evaluations are processed solely for the duration of the active simulation session. Candidate submissions are never incorporated into foundational LLM training datasets, fine-tuning corpuses, or shared with third-party data brokers.
              </p>
            </div>
          </div>
        </Card>

        {/* Article 17 */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="rose" size="sm">Article 17 • Right to Erasure</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                4. Candidate Right to Erasure (GDPR / CCPA)
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Candidates retain full, perpetual ownership of their data. From the Candidate Profile screen, clicking &ldquo;Purge All Data&rdquo; will permanently expunge past session transcripts, uploaded resumes, speech buffers, and evaluation history from our databases.
              </p>
            </div>
          </div>
        </Card>

        {/* Article 25 */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="emerald" size="sm">Article 25 • Security by Design</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                5. Security Standards & Cryptographic Isolation
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                All communications between the browser client and backend microservices are encrypted via TLS 1.3 in transit and AES-256 at rest. Session tokens utilize cryptographically random UUIDv4 identifiers, and code executions run in sandboxed worker runtimes.
              </p>
            </div>
          </div>
        </Card>

        {/* DPO Contact Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="amber" size="sm">Data Protection Officer</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                6. Data Subject Access Inquiries
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                For questions regarding your privacy rights, data export requests, or regulatory compliance inquiries, please contact our privacy compliance team at <span className="text-blue-400 font-medium">privacy@interviewgenie.ai</span>.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
};
export default PrivacyPage;
