# InterviewGenie AI — Component Contracts & UI Data Specifications
Version: 1.0.0  
Status: Authoritative Reference  
Purpose: High-density, reduced context-footprint specification of frontend data contracts, TypeScript domain models, and UI component prop contracts.

---

## 1. Architectural Principles & Reduced Context Footprint

This document establishes single-source-of-truth contracts for the InterviewGenie AI frontend system:
1. **Zero Guesswork Typing**: All component interfaces strictly bind to backend schemas defined in `frontend/src/types/index.ts`.
2. **Context-Free Component Consumption**: Downstream agents and engineers can consume, mock, or test any component without loading hundreds of source lines.
3. **Strict Separation of Concerns**:
   - **Primitives (`ui/`)**: Pure presentation, uncoupled from domain state, accept explicit props and emit events.
   - **Composites (`components/`)**: Orchestrate hardware, audio-video, diagnostic flows, and toast alerts.
   - **Pages (`pages/`)**: Ingest domain models, trigger service endpoints, manage loading/error lifecycles.

---

## 2. Core Domain Data Contracts (`frontend/src/types/index.ts`)

### 2.1 Authentication & User Session
```typescript
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
```

### 2.2 Candidate Profile & Resume Ingestion
```typescript
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
```

### 2.3 Interview Session Orchestration & Configuration
```typescript
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
```

### 2.4 Live Interview Q&A Flow & Speech Metrics
```typescript
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
```

### 2.5 Evaluation, Scoring & Rubric Reports
```typescript
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
```

### 2.6 Aptitude & MCQ Testing Module
```typescript
export interface AptitudeMCQ {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: Record<string, string>; // e.g. { 'A': 'Option 1', 'B': 'Option 2' }
}

export interface AptitudeSubmitPayload {
  test_id?: string;
  answers: Record<string, string>; // { question_id: selected_option_key }
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
```

### 2.7 Hardware & Media Consent
```typescript
export interface MediaConsentPayload {
  interview_id: string;
  has_consent: boolean;
}

export interface MediaConsentResponse {
  interview_id: string;
  has_recording_consent: boolean;
  consent_given_at?: string;
}
```

### 2.8 Feedback, Notifications & Toasts
```typescript
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
```

### 2.9 Analytics, Progression & Benchmarks
```typescript
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
```

---

## 3. UI Primitive Component Contracts (`frontend/src/components/ui/`)

### 3.1 Badge (`Badge.tsx`)
Displays status tags, round categories, or difficulty tiers.
```typescript
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'gray';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
}
```
- **Default values**: `variant = 'blue'`, `size = 'md'`, `dot = false`.
- **Accessibility**: Standard `<span>` with optional indicator dot.

### 3.2 Button (`Button.tsx`)
Primary interactive control with loading spinners, gradient styling, and icons.
```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}
```
- **Default values**: `variant = 'primary'`, `size = 'md'`, `isLoading = false`.
- **Accessibility**: `disabled` automatically applied when `isLoading` is true; maintains focus ring via `focus-visible`.

### 3.3 Card (`Card.tsx`)
Surface container supporting glow effects, borders, and keyboard interaction.
```typescript
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```
- **Default values**: `variant = 'default'`, `padding = 'md'`.
- **Behavior**: If `variant === 'interactive'`, auto-assigns `tabIndex={0}` if not explicitly provided.

### 3.4 Container (`Container.tsx`)
Responsive viewport wrapper enforcing horizontal paddings and maximum boundary constraints.
```typescript
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}
```
- **Default values**: `size = 'lg'`.
- **Breakpoints**: `sm` (max-w-3xl), `md` (max-w-5xl), `lg` (max-w-7xl), `xl` (max-w-[1400px]), `full` (w-full).

### 3.5 EmptyState (`EmptyState.tsx`)
Fallback presentation for empty lists, search results, or newly initialized views.
```typescript
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
  className?: string;
}
```
- **Usage**: Used in `DashboardPage`, `HistoryPage`, and `AnalyticsPage` when data arrays are empty.

### 3.6 ErrorState (`ErrorState.tsx`)
Accessible error boundary card with retry hooks and rose warning aura.
```typescript
export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}
```
- **Default values**: `title = 'Something went wrong'`, `retryLabel = 'Try Again'`.
- **Accessibility**: Emits `role="alert"`.

### 3.7 Input (`Input.tsx`)
Form control with built-in label, validation error feedback, and left/right glyph slots.
```typescript
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```
- **Accessibility**: Binds `aria-invalid={!!error}` and associates `aria-describedby` dynamically with error/helper element IDs.

### 3.8 Select (`Select.tsx`)
Custom dropdown selection adhering to dark-theme glass aesthetics.
```typescript
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
}
```
- **Accessibility**: Generates linked IDs (`select-{label}`, `{id}-error`, `{id}-helper`), binds `aria-invalid`.

### 3.9 LoadingSkeleton (`LoadingSkeleton.tsx`)
Skeleton shimmer placeholders for asynchronous loading states.
```typescript
export interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'avatar' | 'text';
  count?: number;
  rows?: number;
  columns?: number;
  className?: string;
}
```
- **Default values**: `variant = 'card'`, `count = 3`, `rows = 5`, `columns = 4`.
- **Accessibility**: Sets `aria-busy="true"`.

### 3.10 Modal (`Modal.tsx`)
Accessible dialog wrapper with backdrop blurring, escape dismissal, and scroll lock.
```typescript
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  className?: string;
}
```
- **Default values**: `size = 'md'`, `closeOnBackdrop = true`.
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, binds `aria-labelledby` and `aria-describedby`, captures `Escape` key and manages `document.body.style.overflow`.

### 3.11 SectionHeader (`SectionHeader.tsx`)
Standardized headers with optional category badge, subhead, and action toolbar.
```typescript
export interface SectionHeaderProps {
  badge?: string;
  badgeColor?: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'gray';
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
}
```
- **Default values**: `align = 'center'`, `badgeColor = 'blue'`.

### 3.12 Table System (`Table.tsx`)
Modular compound table components with sticky headers and responsive horizontal scroll.
```typescript
export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}
export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isClickable?: boolean;
}
export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}
```

### 3.13 Tabs System (`Tabs.tsx`)
Controlled tab switching system supporting keyboard arrow navigation and composite subcomponents.
```typescript
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  items?: TabItem[];
  className?: string;
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabTriggerProps {
  value: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}
```
- **Accessibility**: Emits `role="tablist"`, `role="tab"`, `role="tabpanel"`, binds `aria-selected`, `aria-controls`, and manages arrow key indexing.

### 3.14 Toast (`Toast.tsx`)
Notification card component for feedback alerts.
```typescript
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  type?: ToastVariant;
  title: string;
  message?: string;
  onDismiss?: (id?: string) => void;
  className?: string;
}
```

---

## 4. Layout & Composite Component Contracts

### 4.1 HardwareDiagnostics (`HardwareDiagnostics.tsx`)
Interactive AV calibration suite validating camera stream, microphone gain, and speaker audio.
```typescript
export interface HardwareDiagnosticsProps {
  onCalibrationComplete?: (isReady: boolean) => void;
  className?: string;
}
```
- **Internal Hook Bindings**: Consumes `useCamera` and `useVoice` from `services/media`.
- **States Managed**: Camera stream toggle, audio device selectors, mic gain meter, and test audio chime.

### 4.2 ToastContainer (`ToastContainer.tsx`)
Global notification portal mounted in `RootLayout`.
```typescript
export const ToastContainer: React.FC;
```
- **Contract**: Subscribes to `useToast().toasts` and renders an animated stack at viewport bottom-right (`fixed bottom-5 right-5 z-50`).

### 4.3 Navigation & Shell Components
```typescript
// Navbar.tsx — Global header
export const Navbar: React.FC;
// Footer.tsx — Global footer with legal links
export const Footer: React.FC;
// RootLayout.tsx — Base router layout wrapping Navbar, Outlet, ToastContainer, Footer
export const RootLayout: React.FC;
```

---

## 5. Application Context & State Contracts

### 5.1 AuthContext (`frontend/src/context/AuthContext.tsx`)
Manages authentication state, user metadata, and persistent tokens.
```typescript
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  loginDemo: () => void;
}
```

### 5.2 ToastContext (`frontend/src/context/ToastContext.tsx`)
Pub-sub dispatcher for ephemeral banners and notifications.
```typescript
export interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}
```

---

## 6. Page-Level Data Ingestion & Emission Contracts

| Page Component | Route | Primary Data Inputs (Ingested) | Output Actions / Payloads Emitted |
| :--- | :--- | :--- | :--- |
| `DashboardPage` | `/dashboard` | `User`, `Profile`, `InterviewSession[]`, `AnalyticsSummary` | Navigates to `/setup`, `/interview/:id`, or `/results/:id` |
| `InterviewSetupPage` | `/setup` | `Profile` (skills, target_role), `InterviewType` selection | `InterviewCreatePayload` -> creates `InterviewSession` |
| `LiveInterviewRoomPage` | `/interview/:id` | `InterviewSession`, `Question`, Media consent | `SubmitAnswerPayload` -> `SubmitAnswerResponse` |
| `TechnicalRoomPage` | `/technical/:id` | `InterviewSession`, Coding problem statement, Editor state | Code execution payload, test case validation events |
| `AptitudeRoomPage` | `/aptitude/:id` | `AptitudeMCQ[]` | `AptitudeSubmitPayload` -> `AptitudeSubmitResponse` |
| `ResultsPage` | `/results/:id` | `EvaluationReport`, `InterviewSession` | Downloads PDF report, navigates to `/dashboard` or `/analytics` |
| `AnalyticsPage` | `/analytics` | `AnalyticsResponse` (progression, round metrics, competencies) | Filter changes by `interview_type`, date range selection |
| `ResumeAnalysisPage` | `/resume` | Current `Profile`, extracted skills | Multipart PDF upload -> `ResumeUploadResponse` |
| `ProfilePage` | `/profile` | `Profile`, `User` | `ProfileUpdatePayload` -> updates user profile |
| `HistoryPage` | `/history` | `InterviewSession[]` | Re-open past session results `/results/:id` |
| `AuthPage` | `/login`, `/register` | Form input credentials | `AuthResponse` (`User` + JWT token) |

---

## 7. Mocking Guide for Testing & Fast-Path Development

To test components in isolation without backend dependencies, use these canonical contract mocks:

```typescript
// Canonical User Mock
export const mockUser: User = {
  id: 'usr_test_01',
  email: 'alex.developer@example.com',
  full_name: 'Alex Developer',
  created_at: '2026-01-15T08:00:00Z',
};

// Canonical Interview Session Mock
export const mockSession: InterviewSession = {
  id: 'sess_12345678',
  user_id: 'usr_test_01',
  interview_type: 'technical',
  domain: 'Software Engineering',
  target_role: 'Full Stack Engineer',
  difficulty: 'medium',
  status: 'in_progress',
  current_question_index: 2,
  total_questions: 5,
  enable_voice: true,
  enable_video: true,
  created_at: '2026-11-16T12:00:00Z',
};

// Canonical Question Mock
export const mockQuestion: Question = {
  id: 'q_backend_02',
  order_index: 2,
  round_type: 'technical',
  category: 'System Design',
  difficulty: 'medium',
  question_text: 'How would you design a rate limiter for an API with 100,000 requests per minute?',
  is_follow_up: false,
  parent_question_id: null,
};

// Canonical Evaluation Report Mock
export const mockEvaluationReport: EvaluationReport = {
  interview_id: 'sess_12345678',
  status: 'completed',
  overall_score: 84.5,
  round_scores: {
    system_design: 86.0,
    technical_accuracy: 88.0,
    communication_clarity: 80.0,
  },
  question_evaluations: [
    {
      question_id: 'q_backend_02',
      question_text: 'How would you design a rate limiter...',
      answer_text: 'I would use a token bucket algorithm stored in Redis...',
      score: 88.0,
      relevance_score: 90.0,
      clarity_score: 85.0,
      technical_depth_score: 89.0,
      feedback: 'Excellent explanation of sliding window vs token bucket tradeoffs.',
      strengths: ['Clear Redis key schema', 'Handled race conditions with Lua scripts'],
      improvements: ['Could address multi-region replication latency'],
    },
  ],
  overall_strengths: ['System architecture', 'Practical algorithmic choices'],
  critical_weaknesses: ['Did not mention edge caching / Cloudflare rate limits'],
  improvement_plan: [
    {
      topic: 'Edge Compute Rate Limiting',
      recommendation: 'Review Cloudflare Workers and Envoy rate limit filter configurations.',
    },
  ],
  pdf_report_url: '/api/interviews/sess_12345678/report.pdf',
};
```
