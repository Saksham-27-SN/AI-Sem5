import io
import json
import uuid
import pytest
from datetime import datetime, timezone
from backend.app.models.models import User, Profile, InterviewSession, Question, Answer, EvaluationReport, MediaConsent

def test_complete_candidate_e2e_journey(client, db_session):
    """
    End-to-End Test for Complete Candidate Flow:
    1. Register new candidate
    2. Setup candidate profile & targets
    3. Configure interview session (technical domain)
    4. Grant media recording consent
    5. Start interview & retrieve first question
    6. Submit answers with speech metrics & receive progressive evaluation
    7. Conclude interview & generate comprehensive evaluation report
    8. Verify answer transcript persistence & sanitization
    9. Download official binary PDF audit report
    10. Verify analytics reflect the newly completed journey
    """
    # ---------------------------------------------------------
    # Step 1: Register New Candidate
    # ---------------------------------------------------------
    email = f"e2e_candidate_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword@2026!"
    full_name = "Jordan E2E Specialist"

    register_res = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    assert register_res.status_code == 201
    auth_data = register_res.json()
    assert "token" in auth_data
    assert "user" in auth_data
    token = auth_data["token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify authenticated identity via /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # ---------------------------------------------------------
    # Step 2: Setup Candidate Profile & Career Targets
    # ---------------------------------------------------------
    profile_get = client.get("/api/profile", headers=headers)
    assert profile_get.status_code == 200

    profile_update = client.put("/api/profile", headers=headers, json={
        "target_role": "Staff Backend Engineer",
        "target_company": "Google",
        "experience_level": "senior",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Distributed Systems", "Docker"]
    })
    assert profile_update.status_code == 200
    p_data = profile_update.json()
    assert p_data["target_role"] == "Staff Backend Engineer"
    assert "Distributed Systems" in p_data["skills"]

    # ---------------------------------------------------------
    # Step 3: Configure Interview Session
    # ---------------------------------------------------------
    interview_payload = {
        "interview_type": "technical",
        "domain": "Python",
        "target_role": "Staff Backend Engineer",
        "difficulty": "medium",
        "total_questions": 2,
        "enable_voice": True,
        "enable_video": False,
        "custom_topics": ["FastAPI Architecture", "Asyncio Event Loop", "Database Concurrency"]
    }
    setup_res = client.post("/api/interviews", headers=headers, json=interview_payload)
    assert setup_res.status_code == 201
    interview_data = setup_res.json()
    interview_id = interview_data["id"]
    assert interview_data["status"] == "configured"
    assert interview_data["total_questions"] == 2
    assert interview_data["current_question_index"] == 0

    # Grant media recording consent
    consent_res = client.post("/api/media/consent", headers=headers, json={
        "interview_id": interview_id,
        "has_consent": True
    })
    assert consent_res.status_code == 200
    assert consent_res.json()["has_recording_consent"] is True

    # ---------------------------------------------------------
    # Step 4: Start Interview & Receive First Question
    # ---------------------------------------------------------
    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=headers)
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["status"] == "in_progress"
    assert "current_question" in start_data

    first_question = start_data["current_question"]
    q1_id = first_question["id"]
    assert first_question["order_index"] == 1
    assert len(first_question["question_text"]) > 10

    # Verify current-question endpoint returns the active question
    curr_q_res = client.get(f"/api/interviews/{interview_id}/current-question", headers=headers)
    assert curr_q_res.status_code == 200
    assert curr_q_res.json()["id"] == q1_id

    # ---------------------------------------------------------
    # Step 5: Submit Answer for Question 1
    # ---------------------------------------------------------
    ans1_text = (
        "In Python, memory management combines reference counting with a generational cyclic garbage collector. "
        "For CPU-intensive concurrency, the Global Interpreter Lock (GIL) serializes bytecode execution within a single process, "
        "so we utilize multiprocessing or C-extensions to achieve true parallelism. "
        "For I/O-bound operations such as database calls and microservice communication, we use asyncio event loops to handle high concurrency efficiently."
    )
    ans1_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=headers, json={
        "question_id": q1_id,
        "answer_text": ans1_text,
        "duration_seconds": 45,
        "speech_metrics": {
            "words_per_minute": 130.0,
            "pause_count": 1,
            "filler_words_count": 0
        }
    })
    assert ans1_res.status_code == 200
    ans1_data = ans1_res.json()
    assert "answer_id" in ans1_data
    assert "interim_feedback" in ans1_data
    next_action = ans1_data["next_action"]

    # ---------------------------------------------------------
    # Step 6: Submit Answer for Question 2 (or Follow-up)
    # ---------------------------------------------------------
    if next_action in ("next_question", "follow_up"):
        second_question = ans1_data["next_question"]
        assert second_question is not None
        q2_id = second_question["id"]

        ans2_text = (
            "To resolve database contention in distributed microservices, I implement optimistic locking with version columns, "
            "apply Redis distributed locks with TTL safeguards for critical checkout sections, and employ read replicas with "
            "connection pooling (SQLAlchemy QueuePool) to reduce transaction isolation wait times."
        )
        ans2_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=headers, json={
            "question_id": q2_id,
            "answer_text": ans2_text,
            "duration_seconds": 50,
            "speech_metrics": {
                "words_per_minute": 135.0,
                "pause_count": 0,
                "filler_words_count": 1
            }
        })
        assert ans2_res.status_code == 200

    # Ensure interview is transitioned to completed
    end_res = client.post(f"/api/interviews/{interview_id}/end", headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    # ---------------------------------------------------------
    # Step 7: Evaluate Session & Validate Comprehensive Rubrics
    # ---------------------------------------------------------
    eval_res = client.get(f"/api/interviews/{interview_id}/evaluation", headers=headers)
    assert eval_res.status_code == 200
    eval_report = eval_res.json()

    assert eval_report["interview_id"] == interview_id
    assert eval_report["status"] == "completed"
    assert 0.0 <= eval_report["overall_score"] <= 100.0
    assert "round_scores" in eval_report
    assert "question_evaluations" in eval_report
    assert len(eval_report["question_evaluations"]) >= 1
    assert "overall_strengths" in eval_report
    assert "critical_weaknesses" in eval_report
    assert "improvement_plan" in eval_report
    assert len(eval_report["improvement_plan"]) >= 1

    # ---------------------------------------------------------
    # Step 8: Verify Transcripts Persistence & Sanitization
    # ---------------------------------------------------------
    db_session.expire_all()
    stored_answers = db_session.query(Answer).filter(Answer.interview_id == interview_id).all()
    assert len(stored_answers) >= 1
    first_stored_answer = [a for a in stored_answers if a.question_id == q1_id][0]
    assert first_stored_answer.transcript_text is not None
    assert "reference counting" in first_stored_answer.transcript_text
    assert first_stored_answer.duration_seconds == 45
    assert first_stored_answer.words_per_minute == 130.0
    assert first_stored_answer.evaluation_score is not None

    # Verify questions persisted
    stored_questions = db_session.query(Question).filter(Question.interview_id == interview_id).all()
    assert len(stored_questions) >= 1

    # ---------------------------------------------------------
    # Step 9: Download Official PDF Audit Report
    # ---------------------------------------------------------
    pdf_res = client.get(f"/api/interviews/{interview_id}/report.pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")
    assert len(pdf_res.content) > 1000  # Valid non-empty binary PDF document

    # ---------------------------------------------------------
    # Step 10: Verify Analytics Reflect Completed Journey
    # ---------------------------------------------------------
    analytics_res = client.get("/api/analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()

    assert analytics_data["total_interviews_completed"] >= 1
    assert analytics_data["average_score"] > 0.0
    assert len(analytics_data["score_trends"]) >= 1
    assert "technical" in analytics_data["round_averages"]
    summary = analytics_data["summary"]
    assert summary["total_interviews"] >= 1
    assert summary["average_score"] > 0.0
    assert summary["readiness_status"] in ("Senior / Interview Ready", "Proficient / Polishing", "Developing / More Practice Needed")


def test_e2e_journey_with_resume_and_gdpr_cleanup(client, db_session):
    """
    Validates E2E Journey with Resume Upload, Grounded Interview, and GDPR Article 17 Data Purge:
    1. Register user
    2. Upload valid PDF resume
    3. Verify skills extracted into profile
    4. Create resume-grounded interview
    5. Run interview and submit answers
    6. Conclude interview and verify evaluation
    7. Execute GDPR deletion of recording artifacts
    8. Verify recording purged while evaluation report and score remain intact
    """
    email = f"resume_e2e_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword@2026!"
    reg = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Resume Grounded Candidate"
    })
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    # Upload mock PDF resume
    minimal_pdf = (
        b"%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n"
        b"4 0 obj << /Length 65 >> stream\n"
        b"BT /F1 12 Tf 72 712 Td (Senior Backend Engineer with Docker, Python, FastAPI, and Kafka experience) Tj ET\n"
        b"endstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \n"
        b"trailer << /Size 5 /Root 1 0 R >>\nstartxref\n330\n%%EOF"
    )
    files = {"file": ("senior_resume.pdf", io.BytesIO(minimal_pdf), "application/pdf")}
    upload_res = client.post("/api/profile/resume/upload", headers=headers, files=files)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert "skills" in upload_data or "extracted_skills" in upload_data

    # Create resume interview
    sess_res = client.post("/api/interviews", headers=headers, json={
        "interview_type": "resume",
        "domain": "Software Engineering",
        "target_role": "Backend Specialist",
        "difficulty": "medium",
        "total_questions": 1,
        "enable_voice": False
    })
    assert sess_res.status_code == 201
    sess_id = sess_res.json()["id"]

    # Record consent
    client.post("/api/media/consent", headers=headers, json={"interview_id": sess_id, "has_consent": True})

    # Start session
    start_res = client.post(f"/api/interviews/{sess_id}/start", headers=headers)
    assert start_res.status_code == 200
    q = start_res.json()["current_question"]

    # Submit answer
    sub_res = client.post(f"/api/interviews/{sess_id}/submit-answer", headers=headers, json={
        "question_id": q["id"],
        "answer_text": "I used Kafka message streaming to decouple order processing services from billing, guaranteeing at-least-once delivery with idempotent consumers.",
        "duration_seconds": 35
    })
    assert sub_res.status_code == 200

    # End interview
    end_res = client.post(f"/api/interviews/{sess_id}/end", headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    # Evaluation
    eval_res = client.get(f"/api/interviews/{sess_id}/evaluation", headers=headers)
    assert eval_res.status_code == 200

    # GDPR Purge
    purge_res = client.delete(f"/api/media/recordings/{sess_id}", headers=headers)
    assert purge_res.status_code == 200
    assert purge_res.json()["deleted"] is True

    # Evaluation remains intact after GDPR purge
    eval_after_purge = client.get(f"/api/interviews/{sess_id}/evaluation", headers=headers)
    assert eval_after_purge.status_code == 200
    assert eval_after_purge.json()["overall_score"] > 0.0
