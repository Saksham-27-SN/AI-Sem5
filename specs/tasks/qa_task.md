# QA & SECURITY ENGINEER TASK SPECIFICATION
Agent Name: `qa` (Pane `w2:p6`, Tab 3)
Owned Files: `tests/*`, `pytest.ini`

## Objectives:
1. Build comprehensive automated pytest suites in `tests/`:
   - `test_auth.py`: User registration, duplicate email rejection, login token generation, authenticated /me access.
   - `test_interviews.py`: Session creation, state transition from configured -> in_progress -> completed, question progression, answer submission, score computation, PDF report generation.
   - `test_ai_coordinator.py`: Unit tests for HR, Technical, Aptitude, Resume, and Coordinator agents; validation of adaptive difficulty adjustment.
   - `test_aptitude.py`: MCQ retrieval, deterministic scoring, category accuracy calculations.
   - `test_security.py`: Protection against SQL injection, unauthorized access without JWT token, malicious file extension rejection.
2. Execute the test suite with `pytest -v`.
3. Produce a verifiable QA test report with 100% pass rate.
4. Report audit results to Master Orchestrator.
