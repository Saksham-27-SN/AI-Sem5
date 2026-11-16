import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import User, Profile, InterviewSession, AptitudeQuestion, MediaConsent

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure clean database setup for tests."""
    Base.metadata.create_all(bind=engine)
    yield

def test_health_endpoints():
    """Verify root, health check endpoints, and CORS readiness for frontend localhost:5173."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["status"] == "online"
    assert "version" in data_root

    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    data_health = res_health.json()
    assert data_health["status"] == "healthy"
    assert "timestamp" in data_health

    # Health alias
    res_alias = client.get("/health")
    assert res_alias.status_code == 200
    assert res_alias.json()["status"] == "healthy"

    # CORS verification for localhost:5173
    cors_res = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert cors_res.status_code == 200
    assert cors_res.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert cors_res.headers.get("access-control-allow-credentials") == "true"

    # CORS preflight OPTIONS request
    preflight = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type"
        }
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert preflight.headers.get("access-control-allow-credentials") == "true"

def test_auth_and_profile_flow():
    """Test user registration, login, and profile update."""
    email = "testcandidate_backend@example.com"
    password = "TestPassword123!"
    full_name = "Alex Turner"

    # Register
    res_reg = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    # If user already exists in DB from previous run, login instead
    if res_reg.status_code == 400:
        res_login = client.post("/api/auth/login", json={
            "email": email,
            "password": password
        })
        assert res_login.status_code == 200
        token = res_login.json()["token"]
    else:
        assert res_reg.status_code == 201
        token = res_reg.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Get Current User
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email

    # Get Profile
    res_prof = client.get("/api/profile", headers=headers)
    assert res_prof.status_code == 200

    # Update Profile
    res_up = client.put("/api/profile", headers=headers, json={
        "target_role": "Backend Lead",
        "target_company": "Google",
        "experience_level": "senior",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"]
    })
    assert res_up.status_code == 200
    data_up = res_up.json()
    assert data_up["target_role"] == "Backend Lead"
    assert "Docker" in data_up["skills"]

def test_aptitude_flow():
    """Test aptitude test retrieval and deterministic grading."""
    # Retrieve test questions
    res_test = client.get("/api/aptitude/test?category=all&count=5")
    assert res_test.status_code == 200
    questions = res_test.json()
    assert isinstance(questions, list)
    assert len(questions) > 0

    for q in questions:
        assert "id" in q
        assert "question" in q
        assert "options" in q
        assert "category" in q
        # Verify correct option and explanation are NEVER revealed in test set
        assert "correct_option" not in q
        assert "explanation" not in q

    # Category filtered retrieval
    res_cat = client.get("/api/aptitude/test?category=quantitative&count=3")
    assert res_cat.status_code == 200
    cat_questions = res_cat.json()
    assert len(cat_questions) == 3
    for q in cat_questions:
        assert "quantitative" in q["category"].lower()

    # Retrieve all 15 seeded questions across all categories
    res_all = client.get("/api/aptitude/test?category=all&count=15")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 15

    # Submit answers for deterministic grading
    # apt_q1 correct is "B", apt_q2 correct is "A"
    res_submit = client.post("/api/aptitude/submit", json={
        "test_id": "test_round_1",
        "answers": {
            "apt_q1": "B",
            "apt_q2": "A",
            "apt_q3": "WrongAnswer"
        },
        "time_spent_seconds": 180
    })
    assert res_submit.status_code == 200
    graded = res_submit.json()
    assert "total_questions" in graded
    assert "correct_count" in graded
    assert "score_percentage" in graded
    assert "category_scores" in graded
    assert "results" in graded

    # At least apt_q1 and apt_q2 should be scored correct
    results_map = {r["question_id"]: r for r in graded["results"]}
    if "apt_q1" in results_map:
        assert results_map["apt_q1"]["is_correct"] is True
        assert results_map["apt_q1"]["correct_answer"] == "B"
        assert "explanation" in results_map["apt_q1"]
    if "apt_q3" in results_map:
        assert results_map["apt_q3"]["is_correct"] is False

def test_media_and_consent_flow():
    """Test media recording consent, status checking, and GDPR purging."""
    email = "mediatest_candidate@example.com"
    password = "TestPassword123!"

    # Register/login user
    reg = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Media Tester"
    })
    if reg.status_code == 400:
        token = client.post("/api/auth/login", json={"email": email, "password": password}).json()["token"]
    else:
        token = reg.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Create interview session first
    create_res = client.post("/api/interviews", headers=headers, json={
        "interview_type": "technical",
        "domain": "Software Engineering",
        "target_role": "Backend Developer",
        "difficulty": "medium",
        "total_questions": 3,
        "enable_voice": True,
        "enable_video": True
    })
    assert create_res.status_code == 201
    interview_id = create_res.json()["id"]

    # 1. Post explicit consent
    consent_res = client.post("/api/media/consent", headers=headers, json={
        "interview_id": interview_id,
        "has_consent": True
    })
    assert consent_res.status_code == 200
    consent_data = consent_res.json()
    assert consent_data["has_recording_consent"] is True
    assert consent_data["interview_id"] == interview_id
    assert consent_data["consent_given_at"] is not None

    # 2. Check media status for this interview
    status_res = client.get(f"/api/media/status?interview_id={interview_id}", headers=headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["has_recording_consent"] is True
    assert status_data["interview_id"] == interview_id
    assert "storage_quota_mb" in status_data

    # 3. Check overall media status
    user_status_res = client.get("/api/media/status", headers=headers)
    assert user_status_res.status_code == 200
    assert user_status_res.json()["has_recording_consent"] is True

    # 4. Delete recording for GDPR compliance
    del_res = client.delete(f"/api/media/recordings/{interview_id}", headers=headers)
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["deleted"] is True
    assert del_data["interview_id"] == interview_id

    # 5. Media cleanup service sweep
    clean_res = client.post("/api/media/cleanup", headers=headers)
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["status"] == "success"
    assert "message" in clean_data
    assert "purged_sessions_cleaned" in clean_data
    assert "freed_mb" in clean_data

def test_interview_session_and_evaluation_flow():
    """Test full interview turn execution, state machine, evaluation, and PDF report download."""
    email = "interviewee_backend@example.com"
    password = "TestPassword123!"

    reg = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Jordan Smith"
    })
    if reg.status_code == 400:
        token = client.post("/api/auth/login", json={"email": email, "password": password}).json()["token"]
    else:
        token = reg.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create interview session
    create_res = client.post("/api/interviews", headers=headers, json={
        "interview_type": "hr",
        "domain": "Software Engineering",
        "target_role": "Full Stack Engineer",
        "difficulty": "medium",
        "total_questions": 2,
        "enable_voice": True,
        "enable_video": False
    })
    assert create_res.status_code == 201
    interview = create_res.json()
    interview_id = interview["id"]
    assert interview["status"] == "configured"

    # 2. Start interview session
    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=headers)
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["status"] == "in_progress"
    first_q = start_data["current_question"]
    assert first_q["order_index"] == 1
    assert "question_text" in first_q

    # 3. Retrieve current question
    curr_q_res = client.get(f"/api/interviews/{interview_id}/current-question", headers=headers)
    assert curr_q_res.status_code == 200
    assert curr_q_res.json()["id"] == first_q["id"]

    # 4. Submit answer to question 1
    submit_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=headers, json={
        "question_id": first_q["id"],
        "answer_text": "In my previous experience as a software engineer, I led the migration of a monolithic API into modular FastAPI microservices. I coordinated cross-functional sprints, established comprehensive unit test suites, and optimized PostgreSQL indexes to reduce latency by 45%.",
        "duration_seconds": 55,
        "speech_metrics": {
            "words_per_minute": 135.0,
            "pause_count": 2,
            "filler_words_count": 1
        }
    })
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert "answer_id" in sub_data
    assert sub_data["next_action"] in ("next_question", "follow_up", "completed")

    # 5. End interview session
    end_res = client.post(f"/api/interviews/{interview_id}/end", headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    # 6. Fetch evaluation report
    eval_res = client.get(f"/api/interviews/{interview_id}/evaluation", headers=headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["interview_id"] == interview_id
    assert "overall_score" in eval_data
    assert "round_scores" in eval_data
    assert "question_evaluations" in eval_data
    assert "pdf_report_url" in eval_data

    # 7. Download PDF audit report
    pdf_res = client.get(f"/api/interviews/{interview_id}/report.pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000  # valid non-empty PDF bytes

    # 8. Retrieve full dialogue transcript in JSON and text format
    trans_json_res = client.get(f"/api/interviews/{interview_id}/transcript", headers=headers)
    assert trans_json_res.status_code == 200
    trans_data = trans_json_res.json()
    assert trans_data["interview_id"] == interview_id
    assert "transcript_text" in trans_data
    assert len(trans_data["transcript_text"]) > 10
    assert "dialogue" in trans_data
    assert len(trans_data["dialogue"]) >= 1
    assert "dialogue_json" in trans_data

    # Transcript plain text export
    trans_txt_res = client.get(f"/api/interviews/{interview_id}/transcript?format=text", headers=headers)
    assert trans_txt_res.status_code == 200
    assert "text/plain" in trans_txt_res.headers.get("content-type", "")
    assert len(trans_txt_res.text) > 10

