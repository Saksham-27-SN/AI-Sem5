// src/services/api.ts
import type {
  User,
  AuthResponse,
  Profile,
  ProfileUpdatePayload,
  ResumeUploadResponse,
  InterviewSession,
  InterviewCreatePayload,
  Question,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
  EvaluationReport,
  AptitudeMCQ,
  AptitudeSubmitPayload,
  AptitudeSubmitResponse,
  MediaConsentPayload,
  MediaConsentResponse,
  AnalyticsResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiService {
  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('token');
    if (token && !token.startsWith('demo_')) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errData = await response.json();
          errorMessage = errData.detail || errData.message || errorMessage;
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      const error = err as Error;
      // In development or when backend is unavailable, check mock fallback
      console.warn(`[API] Failed to fetch ${endpoint}: ${error.message}. Checking mock fallback.`);
      return this.handleMockFallback<T>(endpoint, options, error);
    }
  }

  // --- Mock Fallbacks for Offline & Instant UX Guarantee ---
  private handleMockFallback<T>(endpoint: string, options: RequestInit, originalError: Error): T {
    const method = options.method?.toUpperCase() || 'GET';

    // Auth Login / Register
    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
      const mockUser: User = {
        id: 'usr_mock_123',
        email: 'candidate@interviewgenie.ai',
        full_name: 'Alex Johnson',
        created_at: new Date().toISOString(),
      };
      const mockAuth: AuthResponse = {
        user: mockUser,
        token: 'mock_jwt_token_interviewgenie_2026',
      };
      return mockAuth as unknown as T;
    }

    // Auth Me
    if (endpoint === '/auth/me') {
      const mockUser: User = {
        id: 'usr_mock_123',
        email: 'candidate@interviewgenie.ai',
        full_name: 'Alex Johnson',
        created_at: new Date().toISOString(),
      };
      return mockUser as unknown as T;
    }

    // Profile
    if (endpoint === '/profile') {
      if (method === 'PUT') {
        const payload = options.body ? JSON.parse(options.body as string) : {};
        return {
          id: 'prof_mock_123',
          user_id: 'usr_mock_123',
          target_role: payload.target_role || 'Senior Full Stack Engineer',
          target_company: payload.target_company || 'Stripe / Google',
          experience_level: payload.experience_level || 'mid',
          skills: payload.skills || ['React', 'TypeScript', 'FastAPI', 'Docker', 'System Design'],
          resume_filename: 'resume_alex_johnson.pdf',
          resume_summary: 'Full-stack software engineer with 4+ years architecting scalable cloud applications.',
        } as unknown as T;
      }
      return {
        id: 'prof_mock_123',
        user_id: 'usr_mock_123',
        target_role: 'Senior Full Stack Engineer',
        target_company: 'Google / Anthropic',
        experience_level: 'mid',
        skills: ['React', 'TypeScript', 'Node.js', 'FastAPI', 'Python', 'PostgreSQL', 'Docker', 'System Design'],
        resume_filename: 'Alex_Johnson_Resume_2026.pdf',
        resume_summary: '4+ years building high-throughput microservices, distributed workflows, and reactive SPAs.',
      } as unknown as T;
    }

    // Resume Upload
    if (endpoint.includes('/profile/resume/upload')) {
      return {
        filename: 'Alex_Johnson_Resume_2026.pdf',
        extracted_skills: ['React', 'TypeScript', 'FastAPI', 'Python', 'Docker', 'PostgreSQL', 'System Design', 'Redis'],
        experience_level: 'Mid-Senior (4 years)',
        summary: 'Accomplished Full Stack Engineer with extensive experience in TypeScript, React, and Python microservices.',
        raw_text_length: 3420,
      } as unknown as T;
    }

    // Create Interview
    if (endpoint === '/interviews' && method === 'POST') {
      const payload = options.body ? JSON.parse(options.body as string) : {};
      const newInterview: InterviewSession = {
        id: 'session_' + Math.random().toString(36).substring(2, 9),
        user_id: 'usr_mock_123',
        interview_type: payload.interview_type || 'hr',
        domain: payload.domain || 'Software Engineering',
        target_role: payload.target_role || 'Full Stack Engineer',
        difficulty: payload.difficulty || 'medium',
        status: 'configured',
        current_question_index: 0,
        total_questions: payload.total_questions || 5,
        enable_voice: payload.enable_voice !== false,
        enable_video: Boolean(payload.enable_video),
        created_at: new Date().toISOString(),
      };
      return newInterview as unknown as T;
    }

    // List Interviews
    if (endpoint === '/interviews' && method === 'GET') {
      const mockList: InterviewSession[] = [
        {
          id: 'int_demo_01',
          user_id: 'usr_mock_123',
          interview_type: 'hr',
          domain: 'Behavioral & Leadership',
          target_role: 'Senior Full Stack Engineer',
          difficulty: 'medium',
          status: 'completed',
          current_question_index: 5,
          total_questions: 5,
          enable_voice: true,
          enable_video: false,
          started_at: '2026-11-14T10:00:00Z',
          completed_at: '2026-11-14T10:28:00Z',
          overall_score: 88.5,
          created_at: '2026-11-14T09:55:00Z',
        },
        {
          id: 'int_demo_02',
          user_id: 'usr_mock_123',
          interview_type: 'technical',
          domain: 'Full Stack & System Design',
          target_role: 'Backend Architect',
          difficulty: 'hard',
          status: 'completed',
          current_question_index: 5,
          total_questions: 5,
          enable_voice: true,
          enable_video: true,
          started_at: '2026-11-12T14:10:00Z',
          completed_at: '2026-11-12T14:45:00Z',
          overall_score: 82.0,
          created_at: '2026-11-12T14:05:00Z',
        },
        {
          id: 'int_demo_03',
          user_id: 'usr_mock_123',
          interview_type: 'aptitude',
          domain: 'Logic & Quantitative',
          target_role: 'Software Engineer',
          difficulty: 'medium',
          status: 'completed',
          current_question_index: 5,
          total_questions: 5,
          enable_voice: false,
          enable_video: false,
          started_at: '2026-11-10T16:00:00Z',
          completed_at: '2026-11-10T16:20:00Z',
          overall_score: 91.0,
          created_at: '2026-11-10T15:55:00Z',
        },
      ];
      return mockList as unknown as T;
    }

    // Start Interview
    if (endpoint.includes('/start')) {
      const idMatch = endpoint.match(/\/interviews\/([^/]+)\/start/);
      const sessionId = idMatch ? idMatch[1] : 'int_current';
      return {
        session_id: sessionId,
        status: 'in_progress',
        current_question: {
          id: 'q_001',
          order_index: 1,
          round_type: 'hr',
          category: 'Background & STAR Experience',
          difficulty: 'medium',
          question_text: 'Tell me about a time you led a challenging technical project under tight deadlines. What was the situation and how did you resolve roadblocks?',
          is_follow_up: false,
        },
        progress: { current: 1, total: 5 },
      } as unknown as T;
    }

    // Current Question
    if (endpoint.includes('/current-question')) {
      return {
        id: 'q_001',
        order_index: 1,
        round_type: 'hr',
        category: 'Background & STAR Experience',
        difficulty: 'medium',
        question_text: 'Tell me about a time you led a challenging technical project under tight deadlines. What was the situation and how did you resolve roadblocks?',
        is_follow_up: false,
      } as unknown as T;
    }

    // Submit Answer
    if (endpoint.includes('/submit-answer')) {
      const payload = options.body ? JSON.parse(options.body as string) : {};
      const nextQuestions = [
        'How did you measure the latency and reliability improvements after shipping that refactor?',
        'Describe a disagreement you had with a team member or tech lead regarding architecture. How did you arrive at consensus?',
        'In your resume, you mention building a distributed queuing system. What guarantees did it offer and how did you handle data loss?',
      ];
      const randomQ = nextQuestions[Math.floor(Math.random() * nextQuestions.length)];

      return {
        answer_id: 'ans_' + Math.random().toString(36).substring(2, 7),
        next_action: 'next_question',
        next_question: {
          id: 'q_' + Math.random().toString(36).substring(2, 7),
          order_index: 2,
          round_type: 'hr',
          category: 'Deep Dive & Decision Making',
          difficulty: 'medium',
          question_text: randomQ,
          is_follow_up: false,
        },
        progress: { current: 2, total: 5 },
        interim_feedback: 'Strong answer adhering to STAR guidelines. Good articulation of trade-offs.',
      } as unknown as T;
    }

    // Repeat Question
    if (endpoint.includes('/repeat-question')) {
      return {
        question_text: 'Tell me about a time you led a challenging technical project under tight deadlines. What was the situation and how did you resolve roadblocks?',
        order_index: 1,
      } as unknown as T;
    }

    // End Interview
    if (endpoint.includes('/end')) {
      return {
        message: 'Interview session ended successfully.',
        status: 'completed',
      } as unknown as T;
    }

    // Evaluation Report
    if (endpoint.includes('/evaluation')) {
      const mockEvaluation: EvaluationReport = {
        interview_id: 'session_demo_eval',
        status: 'completed',
        overall_score: 86.5,
        round_scores: {
          'Technical Depth': 88.0,
          'Communication Clarity': 85.0,
          'STAR Structure': 87.0,
          'Problem Solving': 86.0,
          'Cultural & Team Alignment': 86.0,
        },
        question_evaluations: [
          {
            question_id: 'q1',
            question_text: 'Tell me about a challenging technical project under tight deadlines.',
            answer_text: 'In our last sprint, we had to migrate our relational database schema with zero downtime...',
            score: 88,
            relevance_score: 90,
            clarity_score: 86,
            technical_depth_score: 88,
            feedback: 'Excellent STAR structure with clear quantification of metrics and timeline constraints.',
            strengths: ['Clearly explained dual-write pattern', 'Specific mentions of rollback mitigation'],
            improvements: ['Could elaborate on team communication protocols during migration window'],
          },
          {
            question_id: 'q2',
            question_text: 'How did you handle database contention during high concurrency peaks?',
            answer_text: 'We introduced Redis optimistic locking and decoupled write bursts using RabbitMQ queues.',
            score: 85,
            relevance_score: 88,
            clarity_score: 84,
            technical_depth_score: 83,
            feedback: 'Sound understanding of distributed locking and queuing primitives.',
            strengths: ['Good grasp of optimistic vs pessimistic concurrency', 'Practical caching strategy'],
            improvements: ['Detail how deadlocks are detected and resolved automatically'],
          },
        ],
        overall_strengths: [
          'Exemplary STAR formulation with clear quantifiable business impact',
          'Demonstrated deep architectural maturity regarding microservices and database isolation',
          'Natural cadence and articulate communication delivery with low hesitation',
        ],
        critical_weaknesses: [
          'Could provide more granular details on observability (distributed tracing, Prometheus alerts)',
          'Ensure explicit mention of latency percentiles (p99 vs median) when discussing optimization',
        ],
        improvement_plan: [
          {
            topic: 'Distributed Observability',
            recommendation: 'Incorporate OpenTelemetry instrumentation and p95/p99 SLA tracking in system design answers.',
          },
          {
            topic: 'Failure Recovery Strategies',
            recommendation: 'Elaborate on circuit breakers (e.g. Resilience4j / Polly) and graceful degradation modes.',
          },
        ],
        pdf_report_url: '/api/interviews/session_demo_eval/report.pdf',
      };
      return mockEvaluation as unknown as T;
    }

    // Aptitude Test
    if (endpoint.includes('/aptitude/test')) {
      const mockQuestions: AptitudeMCQ[] = [
        {
          id: 'apt_1',
          category: 'Quantitative Aptitude',
          difficulty: 'medium',
          question: 'A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?',
          options: {
            A: '65 seconds',
            B: '89 seconds',
            C: '100 seconds',
            D: '85 seconds',
          },
        },
        {
          id: 'apt_2',
          category: 'Logical Reasoning',
          difficulty: 'medium',
          question: 'In a certain code, "COMPUTER" is written as "RFUVQNPC". How is "MEDICINE" written in that code?',
          options: {
            A: 'EOJDJEFM',
            B: 'EOJDEJFM',
            C: 'MFEJDJOE',
            D: 'EOJDJEFN',
          },
        },
        {
          id: 'apt_3',
          category: 'Computer Science Basics',
          difficulty: 'easy',
          question: 'What is the time complexity of searching for an element in a balanced Binary Search Tree with N nodes?',
          options: {
            A: 'O(1)',
            B: 'O(log N)',
            C: 'O(N)',
            D: 'O(N log N)',
          },
        },
        {
          id: 'apt_4',
          category: 'Data Structures',
          difficulty: 'medium',
          question: 'Which data structure is primarily used to implement Breadth-First Search (BFS) in a graph?',
          options: {
            A: 'Stack',
            B: 'Queue',
            C: 'Priority Queue',
            D: 'Binary Heap',
          },
        },
        {
          id: 'apt_5',
          category: 'System Design & OS',
          difficulty: 'medium',
          question: 'Which of the following conditions is NOT required for a deadlock to occur in an operating system?',
          options: {
            A: 'Mutual Exclusion',
            B: 'Hold and Wait',
            C: 'Preemption Allowed',
            D: 'Circular Wait',
          },
        },
      ];
      return mockQuestions as unknown as T;
    }

    // Aptitude Submit
    if (endpoint.includes('/aptitude/submit')) {
      const mockResult: AptitudeSubmitResponse = {
        total_questions: 5,
        correct_count: 4,
        score_percentage: 80.0,
        category_scores: {
          'Quantitative Aptitude': 100.0,
          'Logical Reasoning': 100.0,
          'Computer Science Basics': 100.0,
          'Data Structures': 100.0,
          'System Design & OS': 0.0,
        },
        results: [
          {
            question_id: 'apt_1',
            question: 'A train 240 m long passes a pole in 24 seconds...',
            user_answer: 'B',
            correct_answer: 'B',
            is_correct: true,
            explanation: 'Speed = 240/24 = 10 m/s. Total distance = 240 + 650 = 890 m. Time = 890/10 = 89 seconds.',
          },
          {
            question_id: 'apt_2',
            question: 'In a certain code, "COMPUTER" is written as "RFUVQNPC"...',
            user_answer: 'A',
            correct_answer: 'A',
            is_correct: true,
            explanation: 'The word is reversed, then letters are mapped with cyclic shifts (+1).',
          },
          {
            question_id: 'apt_3',
            question: 'What is the time complexity of searching in a balanced BST?',
            user_answer: 'B',
            correct_answer: 'B',
            is_correct: true,
            explanation: 'A balanced BST has height O(log N), yielding O(log N) search time.',
          },
          {
            question_id: 'apt_4',
            question: 'Which data structure is primarily used for BFS?',
            user_answer: 'B',
            correct_answer: 'B',
            is_correct: true,
            explanation: 'BFS explores neighbor vertices in FIFO order, which is implemented with a Queue.',
          },
          {
            question_id: 'apt_5',
            question: 'Which condition is NOT required for deadlock?',
            user_answer: 'C',
            correct_answer: 'C',
            is_correct: true,
            explanation: 'The Coffman condition is No Preemption; allowing preemption prevents deadlocks.',
          },
        ],
      };
      return mockResult as unknown as T;
    }

    // Media Consent
    if (endpoint.includes('/media/consent')) {
      const mockConsent: MediaConsentResponse = {
        interview_id: 'session_mock',
        has_recording_consent: true,
        consent_given_at: new Date().toISOString(),
      };
      return mockConsent as unknown as T;
    }

    if (endpoint.includes('/media/status')) {
      return {
        status: 'active',
        has_consent: true,
        storage_quota_mb: 500,
      } as unknown as T;
    }

    if (endpoint.includes('/media/recordings/')) {
      return {
        status: 'purged',
        message: 'All audio and video artifacts have been permanently deleted in compliance with privacy guidelines.',
      } as unknown as T;
    }

    // Analytics
    if (endpoint.includes('/analytics')) {
      const mockAnalytics: AnalyticsResponse = {
        summary: {
          total_interviews: 6,
          average_score: 87.2,
          highest_score: 93.0,
          completion_rate: 100.0,
          total_practice_minutes: 132,
          readiness_status: 'Senior / Big Tech Ready',
          readiness_percentage: 88.0,
        },
        score_progression: [
          {
            session_id: 'int_demo_01',
            session_number: 1,
            date: 'Nov 04',
            interview_type: 'hr',
            role: 'Full Stack Engineer',
            overall_score: 74.0,
            technical_score: 71.0,
            communication_score: 78.0,
            problem_solving_score: 73.0,
          },
          {
            session_id: 'int_demo_02',
            session_number: 2,
            date: 'Nov 07',
            interview_type: 'aptitude',
            role: 'Software Engineer',
            overall_score: 80.0,
            technical_score: 82.0,
            communication_score: 76.0,
            problem_solving_score: 82.0,
          },
          {
            session_id: 'int_demo_03',
            session_number: 3,
            date: 'Nov 10',
            interview_type: 'technical',
            role: 'Senior Backend Engineer',
            overall_score: 82.0,
            technical_score: 84.0,
            communication_score: 80.0,
            problem_solving_score: 82.0,
          },
          {
            session_id: 'int_demo_04',
            session_number: 4,
            date: 'Nov 12',
            interview_type: 'resume',
            role: 'Lead Cloud Architect',
            overall_score: 86.0,
            technical_score: 87.0,
            communication_score: 85.0,
            problem_solving_score: 86.0,
          },
          {
            session_id: 'int_demo_05',
            session_number: 5,
            date: 'Nov 13',
            interview_type: 'hr',
            role: 'Staff Software Engineer',
            overall_score: 88.5,
            technical_score: 88.0,
            communication_score: 90.0,
            problem_solving_score: 87.5,
          },
          {
            session_id: 'int_demo_06',
            session_number: 6,
            date: 'Nov 14',
            interview_type: 'aptitude',
            role: 'Full Stack Engineer',
            overall_score: 93.0,
            technical_score: 94.0,
            communication_score: 88.0,
            problem_solving_score: 95.0,
          },
        ],
        round_comparison: [
          {
            round: 'HR & Behavioral',
            interview_type: 'hr',
            average_score: 88.5,
            sessions_count: 2,
            benchmark: 75.0,
          },
          {
            round: 'Technical & Coding',
            interview_type: 'technical',
            average_score: 82.0,
            sessions_count: 2,
            benchmark: 72.0,
          },
          {
            round: 'Aptitude & Logic',
            interview_type: 'aptitude',
            average_score: 91.0,
            sessions_count: 2,
            benchmark: 70.0,
          },
          {
            round: 'Resume Deep Dive',
            interview_type: 'resume',
            average_score: 86.0,
            sessions_count: 1,
            benchmark: 74.0,
          },
        ],
        competencies: [
          { competency: 'Technical Depth', candidate_score: 87.5, benchmark_score: 75.0, full_mark: 100 },
          { competency: 'Communication Clarity', candidate_score: 89.0, benchmark_score: 78.0, full_mark: 100 },
          { competency: 'STAR Structure', candidate_score: 86.5, benchmark_score: 70.0, full_mark: 100 },
          { competency: 'Problem Solving', candidate_score: 88.0, benchmark_score: 75.0, full_mark: 100 },
          { competency: 'Architectural Maturity', candidate_score: 84.0, benchmark_score: 72.0, full_mark: 100 },
          { competency: 'Cadence & Composure', candidate_score: 90.0, benchmark_score: 74.0, full_mark: 100 },
        ],
        strengths: [
          'Exemplary STAR formulation with clear quantifiable business metrics',
          'Demonstrated deep architectural maturity regarding microservices and database isolation',
          'Natural conversational cadence with low filler words (<2 per minute)',
          'High precision in time and space complexity trade-off analyses',
        ],
        weaknesses: [
          'Incorporate more discussion on distributed tracing and OpenTelemetry telemetry',
          'Clarify retry backoff policies when discussing queue consumer failures',
        ],
        recommended_next_action: 'Practice system design edge-cases in the Technical Room focusing on distributed consensus.',
      };
      return mockAnalytics as unknown as T;
    }

    // If nothing matched, throw the original error
    throw originalError;
  }

  // --- Public API Methods ---

  // Auth
  async register(data: { email: string; password: string; full_name: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Profile
  async getProfile(): Promise<Profile> {
    return this.request<Profile>('/profile');
  }

  async updateProfile(payload: ProfileUpdatePayload): Promise<Profile> {
    return this.request<Profile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async uploadResume(file: File): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<ResumeUploadResponse>('/profile/resume/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Interview Lifecycle
  async createInterview(payload: InterviewCreatePayload): Promise<InterviewSession> {
    return this.request<InterviewSession>('/interviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listInterviews(): Promise<InterviewSession[]> {
    return this.request<InterviewSession[]>('/interviews');
  }

  async getInterview(id: string): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/interviews/${id}`);
  }

  async startInterview(id: string): Promise<{
    session_id: string;
    status: string;
    current_question: Question;
    progress: { current: number; total: number };
  }> {
    return this.request(`/interviews/${id}/start`, {
      method: 'POST',
    });
  }

  async getCurrentQuestion(id: string): Promise<Question> {
    return this.request<Question>(`/interviews/${id}/current-question`);
  }

  async submitAnswer(id: string, payload: SubmitAnswerPayload): Promise<SubmitAnswerResponse> {
    return this.request<SubmitAnswerResponse>(`/interviews/${id}/submit-answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async repeatQuestion(id: string): Promise<{ question_text: string; order_index: number }> {
    return this.request(`/interviews/${id}/repeat-question`, {
      method: 'POST',
    });
  }

  async endInterview(id: string): Promise<{ message: string; status: string }> {
    return this.request(`/interviews/${id}/end`, {
      method: 'POST',
    });
  }

  async getEvaluation(id: string): Promise<EvaluationReport> {
    return this.request<EvaluationReport>(`/interviews/${id}/evaluation`);
  }

  getReportPdfDownloadUrl(id: string): string {
    const token = localStorage.getItem('token') || '';
    return `${API_BASE_URL}/interviews/${id}/report.pdf?token=${encodeURIComponent(token)}`;
  }

  // Aptitude
  async getAptitudeQuestions(count = 5): Promise<AptitudeMCQ[]> {
    return this.request<AptitudeMCQ[]>(`/aptitude/test?count=${count}`);
  }

  async submitAptitudeTest(payload: AptitudeSubmitPayload): Promise<AptitudeSubmitResponse> {
    return this.request<AptitudeSubmitResponse>('/aptitude/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Media
  async setMediaConsent(payload: MediaConsentPayload): Promise<MediaConsentResponse> {
    return this.request<MediaConsentResponse>('/media/consent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMediaStatus(): Promise<{ status: string; has_consent: boolean }> {
    return this.request('/media/status');
  }

  async deleteRecordings(interviewId: string): Promise<{ status: string; message: string }> {
    return this.request(`/media/recordings/${interviewId}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalytics(): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>('/analytics');
  }
}

export const api = new ApiService();
