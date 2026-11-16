// src/pages/TermsPage.tsx
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
  BookOpen,
  AlertCircle,
  FileCheck2,
  CheckCircle2,
  Terminal,
  Shield,
  Play,
} from 'lucide-react';

export const TermsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms of Service | InterviewGenie AI';
  }, []);

  return (
    <Container size="md" className="py-8 space-y-8 font-sans">
      {/* 1. Page Header */}
      <SectionHeader
        align="left"
        badge="Legal & Usage Policy"
        badgeVariant="blue"
        title="Terms of Service"
        subtitle="Last revised: November 2026 • Plain language guidelines governing simulation access, code execution, and evaluation rubrics."
        action={
          <Link to="/setup">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              Start Simulation
            </Button>
          </Link>
        }
      />

      {/* 2. Terms Sections */}
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">Section 1 • Practice Scope</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                1. Practice & Educational Purpose
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                InterviewGenie AI is an autonomous simulation suite designed for technical preparation, aptitude benchmarking, and behavioral practice. The simulation scores, competency radars, and rubric feedback are advisory tools to assist candidate improvement and do not constitute a formal hiring guarantee with third-party employers.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="amber" size="sm">Section 2 • Code Studio</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                2. Acceptable Use of Sandboxed Code Execution
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                The Technical Code Studio runs JavaScript and Python code within an isolated browser sandbox environment for algorithmic verification and test case validation. Users may not attempt sandbox breakout, remote command execution, denial-of-service, or network scanning operations.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="emerald" size="sm">Section 3 • Intellectual Property</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                3. Candidate Content & Resume Ownership
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                You retain complete, exclusive intellectual property rights to your uploaded resume documents, submitted code solutions, and interview audio recordings. You grant InterviewGenie AI only the limited, temporary license strictly necessary to parse and evaluate your active session.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="sm">Section 4 • Rubric Scoring</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                4. Deterministic STAR Rubrics & Service Availability
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Quantitative and qualitative evaluations are rendered deterministically using structured STAR frameworks and verified algorithmic answer keys. Service availability is subject to local network connectivity and runtime browser compatibility.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="sm">Section 5 • Security & Accounts</Badge>
              </div>
              <h2 className="text-lg font-bold text-white">
                5. Account Security & Permitted Use
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Users are responsible for maintaining the confidentiality of their credentials and session tokens. Automated bulk scraping, reverse engineering of agent evaluation prompts, or sharing credentials across unauthorized commercial parties is strictly prohibited.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
};
export default TermsPage;
