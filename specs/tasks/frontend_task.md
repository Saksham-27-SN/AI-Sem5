# FRONTEND ENGINEER TASK SPECIFICATION
Agent Name: `frontend` (Pane `w2:p2`, Tab 2)
Owned Files: `frontend/src/*`, `frontend/index.html`

## Objectives:
1. Build out the complete React + TypeScript application adhering to the dark-first SaaS aesthetic (deep navy `#0B0F19`, charcoal `#111827`, electric blue `#3B82F6`):
   - Shell: Navbar with branding, navigation links, and auth state; Sidebar for interview modules; Toast system for notifications.
   - Pages:
     1. `LandingPage`: Professional hero section, feature cards, multi-agent showcase, live demo CTA.
     2. `AuthPage`: Polished Sign In and Sign Up tabs with JWT token persistence.
     3. `Dashboard`: Readiness score, past interviews overview, quick-start shortcuts.
     4. `InterviewSetup`: Mode selector (HR, Technical, Aptitude, Resume), difficulty, domain, voice/video toggles.
     5. `LiveInterviewRoom`: Video preview, animated AI interviewer avatar, speaking/listening indicators, active question card with repeat button, live transcript with manual edit/confirm, turn controls.
     6. `TechnicalRoom`: Split screen with problem description, code answer editor, and audio feedback.
     7. `AptitudeRoom`: Timed MCQ interface, question navigation palette, instant deterministic score breakdown.
     8. `ResumeAnalysisPage`: Drag & drop PDF resume upload, parsed skills chips, tailored question preview.
     9. `ResultsPage`: Comprehensive evaluation report, radar/bar chart of round scores, STAR breakdown, actionable tips, PDF download link.
     10. `HistoryPage`: Interactive list of past simulations with scores and links to reports.
     11. `ProfilePage`: Career targets, skills inventory, and privacy/consent management.
2. Ensure full integration with the backend API via `src/services/api.ts`.
3. Verify that `npm run build` compiles with 0 TypeScript/Vite errors.
4. Report deliverables and build status to Master Orchestrator.
