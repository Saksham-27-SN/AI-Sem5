# BACKEND ENGINEER TASK SPECIFICATION
Agent Name: `backend` (Pane `w2:p4`, Tab 2)
Owned Files: `backend/*`, `requirements.txt`

## Objectives:
1. Complete `backend/app/routers/aptitude.py`:
   - Endpoint `GET /api/aptitude/test?count=5` -> returns MCQs from AptitudeAgent without exposing correct options.
   - Endpoint `POST /api/aptitude/submit` -> accepts candidate answers, evaluates with deterministic scoring, returns percentage, category breakdowns, explanations.
2. Complete `backend/app/routers/media.py`:
   - Endpoint `POST /api/media/consent` -> logs consent with timestamp.
   - Endpoint `GET /api/media/status` -> returns status.
   - Endpoint `DELETE /api/media/recordings/{interview_id}` -> GDPR compliant deletion.
3. Complete `backend/app/main.py`:
   - FastAPI application instance with CORS middleware (allow all / 5173).
   - Initialize tables with `Base.metadata.create_all(bind=engine)`.
   - Include routers: `auth`, `profile`, `interviews`, `aptitude`, `media`.
   - Seed sample aptitude questions if empty on startup.
   - Provide `GET /` and `GET /api/health` endpoints returning healthy status.
4. Verify backend runs cleanly with:
   `python -c "from backend.app.main import app; print('Backend loaded successfully')"`
5. Report completion to Master Orchestrator.
