# Repository Map — InterviewGenie AI

> Compact repository index for AI agents. Strictly minimizes context window load.

## 1. Verified Exclusions
Excluded from context scanning and token indexing:
- `node_modules/` (Frontend npm dependencies)
- `.venv/` (Python virtual environment)
- `dist/` (Frontend build bundle)
- `reports/` (Generated PDF/docx candidate scorecards)
- `recordings/` (Candidate audio/video interview recordings)
- `uploads/` (Candidate uploaded resume PDFs)
- `.git/` (Git repository version database)

## 2. Multi-Agent Roster & Ownership
Source: `specs/INTER_AGENT_PROTOCOL.md` and `specs/tasks/`

| Agent Role | Module Scope | Branch | Herdr Pane | Core Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Master Orchestrator** | `specs/`, integration | `develop`, `main` | `w2:p1` | Governance, API contracts, releases |
| **Frontend Engineer** | `frontend/` | `feature/frontend-foundation` | `w2:p2` | React 18, TypeScript, Tailwind UI |
| **Backend Engineer** | `backend/` | `feature/backend-api` | `w2:p4` | FastAPI, SQLAlchemy ORM, SQLite DB |
| **AI Engineer** | `ai_engine/` | `feature/ai-engine` | `w2:p5` | Multi-agent prompts, Gemini, eval |
| **Voice & Media Engineer** | `media_services/`, media UI | `feature/media-services` | `w2:p3` | Audio recording, Web Speech, consent |
| **QA & Security Engineer** | `tests/`, security | `feature/qa-automation` | `w2:p6` | Automated pytest suites, E2E journeys |
| **Research & Doc Engineer**| `docs/`, `README.md` | `feature/academic-research` | `w2:p7` | Documentation, repo map, contracts |

## 3. API Route Map (`/api` Prefix)
Complete contracts: `docs/contracts/api_contracts.md`

| Method | Route Endpoint | Router Module | Handler | Response Model |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | `auth.py` | `register` | `AuthResponse` (201) |
| `POST` | `/api/auth/login` | `auth.py` | `login` | `AuthResponse` (200) |
| `GET` | `/api/auth/me` | `auth.py` | `get_current_user` | `UserResponse` (200) |
| `GET` | `/api/profile` | `profile.py` | `get_profile` | `ProfileResponse` (200) |
| `PUT` | `/api/profile` | `profile.py` | `update_profile` | `ProfileResponse` (200) |
| `POST` | `/api/profile/resume/upload` | `profile.py` | `upload_resume` | `ResumeAnalysisResponse` (200) |
| `POST` | `/api/interviews` | `interviews.py` | `create_interview` | `InterviewResponse` (201) |
| `GET` | `/api/interviews` | `interviews.py` | `list_interviews` | `List[InterviewResponse]` (200) |
| `GET` | `/api/interviews/{id}` | `interviews.py` | `get_interview` | `InterviewResponse` (200) |
| `POST` | `/api/interviews/{id}/start` | `interviews.py` | `start_interview` | `dict` (status, current_q) |
| `GET` | `/api/interviews/{id}/current-question` | `interviews.py` | `get_current_question` | `QuestionResponse` (200) |
| `POST` | `/api/interviews/{id}/submit-answer` | `interviews.py` | `submit_answer` | `SubmitAnswerResponse` (200) |
| `POST` | `/api/interviews/{id}/repeat-question` | `interviews.py` | `repeat_question` | `dict` (question, index) |
| `POST` | `/api/interviews/{id}/end` | `interviews.py` | `end_interview` | `dict` (status: completed) |
| `GET` | `/api/interviews/{id}/evaluation` | `interviews.py` | `get_evaluation_report`| `EvaluationReportResponse` (200)|
| `GET` | `/api/interviews/{id}/transcript` | `interviews.py` | `get_interview_transcript`| `InterviewTranscriptResponse` (200)|
| `GET` | `/api/interviews/{id}/report.pdf` | `interviews.py` | `download_pdf_report` | `FileResponse` (`application/pdf`) |
| `GET` | `/api/aptitude/test` | `aptitude.py` | `get_aptitude_test` | `List[AptitudeMCQ]` (200) |
| `POST` | `/api/aptitude/submit` | `aptitude.py` | `submit_aptitude_test` | `AptitudeSubmitResponse` (200) |
| `POST` | `/api/media/consent` | `media.py` | `set_media_consent` | `MediaConsentResponse` (200) |
| `GET` | `/api/media/status` | `media.py` | `get_media_status` | `dict` (status, has_consent) |
| `DELETE`| `/api/media/recordings/{id}` | `media.py` | `delete_interview_recordings`| `dict` (status, message) |
| `POST` | `/api/media/cleanup` | `media.py` | `cleanup_purged_media` | `MediaCleanupResponse` (200) |
| `GET` | `/api/analytics` | `analytics.py` | `get_analytics` | `AnalyticsResponse` (200) |
| `GET` | `/api/analytics/summary` | `analytics.py` | `get_analytics_summary`| `AnalyticsSummary` (200) |
| `GET` | `/api/analytics/progression` | `analytics.py` | `get_analytics_progression`| `List[ScoreProgressionPoint]` |
| `GET` | `/api/analytics/skills-radar` | `analytics.py` | `get_analytics_skills_radar`| `List[CompetencyRadarItem]` |
| `GET` | `/api/health`, `/health`, `/` | `main.py` | `api_health`, `root` | System status payload (200) |

## 4. File Paths, Core Models & Key Exports

### Backend Architecture (`backend/app/`)
- `main.py`: FastAPI root app, CORS middleware, lifespan events, router registration, health endpoints.
- `core/config.py`: `Settings` (pydantic), database URLs, JWT keys, Gemini config.
- `core/database.py`: SQLAlchemy `engine`, declarative `Base`, `SessionLocal`, `get_db` dependency.
- `core/security.py`: `verify_password()`, `get_password_hash()`, `create_access_token()`, `get_current_user()`.
- `models/models.py`: SQLAlchemy ORM: `User`, `Profile`, `InterviewSession`, `Question`, `Answer`, `EvaluationReport`, `AptitudeQuestion`, `MediaConsent`.
- `schemas/schemas.py`: Pydantic models: `UserRegister`, `UserLogin`, `AuthResponse`, `ProfileResponse`, `InterviewCreate`, `InterviewResponse`, `SubmitAnswerRequest`, `SubmitAnswerResponse`, `EvaluationReportResponse`, `AptitudeMCQ`, `AptitudeSubmitRequest`, `AptitudeSubmitResponse`, `MediaConsentResponse`, `AnalyticsResponse`.
- `services/resume_service.py`: `ResumeService` (PDF extraction, skill parsing, candidate profiling).
- `services/pdf_report_service.py`: `PDFReportService` (ReportLab formatted candidate diagnostic scorecard).
- `services/media_cleanup_service.py`: `MediaCleanupService` (retention policy enforcement and cleanup).
- `ai/coordinator.py`: `InterviewCoordinator` state machine managing question cycles and agent handoffs.
- `ai/evaluator.py`: `DeterministicEvaluator` (scoring algorithms, rubric matrices, study plans).
- `ai/quiz_generator.py`: `QuizGenerator` & `OfflineQuizBank` (deterministic MCQ questions and grading).
- `ai/resume_analyzer.py`: `ResumeAnalyzer` (resume parsing and customized question generation).
- `ai/echo_stripper.py`: `EchoStripper` (`strip_ai_echo()` for clean student speech capture).
- `ai/fallback_bank.py`: `OfflineFallbackBank` providing reliable fallback questions across all domains.
- `ai/gemini_client.py`: Resilient Gemini API client with retry and error-handling mechanisms.

### AI Multi-Agent Engine (`ai_engine/`)
- `base.py`: `BaseAgent` abstract foundation with prompt construction and execution hooks.
- `coordinator_agent.py`: `CoordinatorAgent` orchestrating round-robin and adaptive interview flow.
- `hr_agent.py`: `HRAgent` executing behavioral and STAR methodology question generation.
- `technical_agent.py`: `TechnicalAgent` assessing coding, architecture, DSA, systems, and theory.
- `aptitude_agent.py`: `AptitudeAgent` generating and validating quantitative, logical, and verbal MCQs.
- `resume_agent.py`: `ResumeAgent` deep-diving into candidates resume skills, experience, and projects.
- `evaluation_agent.py`: `EvaluationAgent` scoring responses on relevance, clarity, and technical depth.
- `gemini_client.py`: Multi-agent Gemini LLM integration with rate-limiting and token governance.

### Media & Voice Services (`media_services/`, `frontend/src/services/media/`)
- `media_services/audio_processor.py`: `AudioProcessor` (audio normalization, noise-reduction).
- `media_services/recording_manager.py`: `RecordingManager` (recording lifecycle, consent verification).
- `media_services/storage.py`: `MediaStorageService` (secure local disk persistence and purge utilities).
- `frontend/src/services/media/voiceService.ts`: `voiceService` (SpeechRecognition, SpeechSynthesis TTS, turn-lock).
- `frontend/src/services/media/cameraService.ts`: `cameraService` (WebRTC camera stream capture and diagnostic preview).
- `frontend/src/services/media/recordingService.ts`: `recordingService` (MediaRecorder wrapper, blob serialization).
- `frontend/src/services/media/audioUtils.ts`: Decibel level calculation, visualizer stream analysis.
- `frontend/src/services/media/useMedia.ts`: Unified React hook managing mic, camera, and speech status.

### Frontend Web Application (`frontend/src/`)
- `main.tsx` & `App.tsx`: React DOM root, React Router routes, global Context providers.
- `services/api.ts`: Typed client `ApiService` consuming backend endpoints with JWT interceptors.
- `types/index.ts`: Shared TypeScript interfaces matching backend Pydantic schemas.
- `context/AuthContext.tsx`: `AuthProvider`, `useAuth` hook (login, register, token persistence, user state).
- `context/ToastContext.tsx`: `ToastProvider`, `useToast` hook (toast notification queue).
- `layouts/RootLayout.tsx`: Common shell integrating `Navbar`, `Footer`, `HardwareDiagnostics`, and `ToastContainer`.
- `components/Navbar.tsx`: Header navigation, brand badge, auth state switches, mobile menu.
- `components/Footer.tsx`: Footer with platform credits, links to terms, privacy, and docs.
- `components/HardwareDiagnostics.tsx`: Hardware check modal for microphone, camera, and speakers.
- `components/ToastContainer.tsx`: Fixed floating container for reactive notifications.
- `components/ui/index.ts`: UI component library exports:
  `Button`, `Input`, `Select`, `Card`, `Tabs`, `Badge`, `Table`, `Modal`, `Toast`, `EmptyState`, `LoadingSkeleton`, `ErrorState`, `Container`, `SectionHeader`.
- `pages/`: Page routes:
  - `LandingPage.tsx`: Hero section, feature grids, architecture overview, CTA buttons.
  - `AuthPage.tsx`: Candidate login and registration tabs with form validation.
  - `DashboardPage.tsx`: Action hub displaying interview options, statistics, and recent activity.
  - `InterviewSetupPage.tsx`: Configuration for interview type, domain, role, difficulty, questions count.
  - `LiveInterviewRoomPage.tsx`: Conversational voice interview room with AI speech, STT, and turn lock.
  - `TechnicalRoomPage.tsx`: Technical coding interview workspace with prompt, code editor, and tests.
  - `AptitudeRoomPage.tsx`: Timed MCQ assessment room with progress tracker and instant submission.
  - `ResumeAnalysisPage.tsx`: PDF resume dropzone, parsed skill extraction, and tailored questions.
  - `ResultsPage.tsx`: Comprehensive diagnostic scorecard, round charts, and PDF download trigger.
  - `AnalyticsPage.tsx`: Historical score progression charts and radar competency analysis.
  - `HistoryPage.tsx`: Paginated table of past interview sessions with status and report links.
  - `ProfilePage.tsx`: User profile management, target role configuration, and skill tags.
  - `PrivacyPage.tsx` & `TermsPage.tsx`: Responsible AI, data retention policy, and consent disclosure.
  - `NotFoundPage.tsx`: 404 handler with return home navigation.

### Automated Tests (`tests/`)
- `conftest.py`: Shared pytest fixtures, in-memory SQLite database, mock auth tokens, test client.
- `test_auth.py`: Registration, duplicate user rejection, login authentication, protected `/me` endpoint.
- `test_interviews.py`: Session creation, state progression, answer submission, PDF report generation.
- `test_ai_coordinator.py`: Coordinator flow, turn handling, adaptive difficulty transitions.
- `test_ai_evaluator.py`: Deterministic scoring rules, tier determinations, rubric computation.
- `test_ai_engine.py`: Multi-agent individual agent prompts and fallback behaviors.
- `test_quiz_generator.py`: Aptitude question generation, validation, and deterministic grading.
- `test_resume_analyzer.py`: Resume text extraction, skill tagging, and project-based question generation.
- `test_resume_service.py`: Multipart PDF resume upload, parsing, and error boundaries.
- `test_media_services.py`: Consent verification, audio storage, recording manager, privacy deletion.
- `test_analytics.py`: Score progression calculations, radar competency aggregations, summary statistics.
- `test_security_sanitization.py`: Input sanitization, SQL injection prevention, prompt injection mitigation.
- `test_e2e_journey.py` & `test_live_api_flows.py`: Full end-to-end integration journeys.

### Specifications & Scripts (`specs/`, `scripts/`)
- `specs/API_CONTRACTS.md`: Low-level network interface specifications and payloads.
- `specs/DATABASE_SCHEMA.md`: Relational schema, ER diagram, foreign keys, and indexes.
- `specs/INTER_AGENT_PROTOCOL.md`: Team roles, branch governance, and collaboration protocol.
- `specs/TASK_BOARD.json`: Centralized task tracking state machine across engineering agents.
- `scripts/validate_domains.py`: Pre-commit validator ensuring all technical domains are seeded and valid.
- `scripts/generate_pdf_report.py`: CLI script generating standalone candidate PDF report card.
- `scripts/generate_docx_report.py`: Comprehensive documentation generator for academic deliverables.
- `scripts/generate_pptx_deck.py`: Presentation slide deck generator for project demonstration.
- `scripts/audit_*.js`: Playwright and API audit verification scripts.
