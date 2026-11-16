// src/types/index.ts
// Shared TypeScript types aligned with InterviewGenie AI backend schemas

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Profile {
  id: string;
  user_id: string;
  target_role?: string;
  target_company?: string;
  experience_level: string;
  skills: string[];
  resume_filename?: string;
  resume_summary?: string;
}

export interface ProfileUpdatePayload {
  target_role?: string;
  target_company?: string;
  experience_level?: string;
  skills?: string[];
}

export interface ResumeUploadResponse {
  filename: string;
  extracted_skills: string[];
  experience_level: string;
  summary: string;
  raw_text_length: number;
}

export type InterviewType = 'hr' | 'technical' | 'aptitude' | 'resume' | 'comprehensive';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type InterviewStatus = 'configured' | 'in_progress' | 'evaluating' | 'completed' | 'cancelled';

export interface InterviewSession {
  id: string;
  user_id: string;
  interview_type: InterviewType;
  domain: string;
  target_role: string;
  difficulty: DifficultyLevel;
  status: InterviewStatus;
  current_question_index: number;
  total_questions: number;
  enable_voice: boolean;
  enable_video: boolean;
  started_at?: string;
  completed_at?: string;
  overall_score?: number;
  created_at: string;
}

export interface InterviewCreatePayload {
  interview_type: InterviewType;
  domain: string;
  target_role: string;
  difficulty: DifficultyLevel;
  total_questions: number;
  custom_topics?: string[];
  enable_voice: boolean;
  enable_video: boolean;
}

export interface Question {
  id: string;
  order_index: number;
  round_type: string;
  category: string;
  difficulty: string;
  question_text: string;
  is_follow_up: boolean;
  parent_question_id?: string | null;
}

export interface SpeechMetrics {
  words_per_minute?: number;
  pause_count?: number;
  filler_words_count?: number;
}

export interface SubmitAnswerPayload {
  question_id: string;
  answer_text: string;
  duration_seconds?: number;
  speech_metrics?: SpeechMetrics;
}

export interface SubmitAnswerResponse {
  answer_id: string;
  next_action: 'next_question' | 'follow_up' | 'completed';
  next_question?: Question | null;
  progress: {
    current: number;
    total: number;
  };
  interim_feedback?: string | null;
}

export interface QuestionEvaluation {
  question_id: string;
  question_text: string;
  answer_text: string;
  score: number;
  relevance_score: number;
  clarity_score: number;
  technical_depth_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface ImprovementItem {
  topic: string;
  recommendation: string;
}

export interface EvaluationReport {
  interview_id: string;
  status: string;
  overall_score: number;
  round_scores: Record<string, number>;
  question_evaluations: QuestionEvaluation[];
  overall_strengths: string[];
  critical_weaknesses: string[];
  improvement_plan: ImprovementItem[];
  pdf_report_url?: string;
}

export interface AptitudeMCQ {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: Record<string, string>;
}

export interface AptitudeSubmitPayload {
  test_id?: string;
  answers: Record<string, string>;
  time_spent_seconds: number;
}

export interface AptitudeResultItem {
  question_id: string;
  question: string;
  user_answer?: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface AptitudeSubmitResponse {
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  category_scores: Record<string, number>;
  results: AptitudeResultItem[];
}

export interface MediaConsentPayload {
  interview_id: string;
  has_consent: boolean;
}

export interface MediaConsentResponse {
  interview_id: string;
  has_recording_consent: boolean;
  consent_given_at?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// --- Analytics Types ---
export interface ScoreProgressionPoint {
  session_id: string;
  session_number: number;
  date: string;
  interview_type: string;
  role: string;
  overall_score: number;
  technical_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
}

export interface RoundComparisonItem {
  round: string;
  interview_type: string;
  average_score: number;
  sessions_count: number;
  benchmark: number;
}

export interface CompetencyRadarItem {
  competency: string;
  candidate_score: number;
  benchmark_score: number;
  full_mark: number;
}

export interface AnalyticsSummary {
  total_interviews: number;
  average_score: number;
  highest_score: number;
  completion_rate: number;
  total_practice_minutes: number;
  readiness_status: string;
  readiness_percentage: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  score_progression: ScoreProgressionPoint[];
  round_comparison: RoundComparisonItem[];
  competencies: CompetencyRadarItem[];
  strengths: string[];
  weaknesses: string[];
  recommended_next_action: string;
}

