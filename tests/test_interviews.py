import os
import uuid
import pytest
from backend.app.models.models import InterviewSession, Question, Answer, EvaluationReport

def test_interview_session_creation(client, registered_user, db_session):
    """Verify interview session creation in configured state."""
    payload = {
        "interview_type": "technical",
        "domain": "Python",
        "target_role": "Senior Backend Engineer",
        "difficulty": "medium",
        "total_questions": 3,
        "enable_voice": True,
        "enable_video": False,
        "custom_topics": ["FastAPI", "Concurrency", "Database Optimization"]
    }

    response = client.post("/api/interviews", headers=registered_user["headers"], json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["interview_type"] == "technical"
    assert data["domain"] == "Python"
    assert data["target_role"] == "Senior Backend Engineer"
    assert data["difficulty"] == "medium"
    assert data["status"] == "configured"
    assert data["current_question_index"] == 0
    assert data["total_questions"] == 3
    assert data["user_id"] == registered_user["user_id"]
    assert "id" in data

    # Verify DB persistence
    db_session.expire_all()
    session = db_session.query(InterviewSession).filter(InterviewSession.id == data["id"]).first()
    assert session is not None
    assert session.status == "configured"

def test_interview_state_transition_and_lifecycle(client, registered_user, db_session):
    """Verify full state machine: configured -> in_progress -> completed."""
    # 1. Create session with 2 questions
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "technical",
        "domain": "Python",
        "target_role": "Python Developer",
        "difficulty": "medium",
        "total_questions": 2,
        "enable_voice": False,
        "enable_video": False
    })
    assert create_res.status_code == 201
    interview_id = create_res.json()["id"]

    # 2. Start session: configured -> in_progress
    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=registered_user["headers"])
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["status"] == "in_progress"
    assert start_data["session_id"] == interview_id
    assert "current_question" in start_data
    q1 = start_data["current_question"]
    assert q1["order_index"] == 1
    assert len(q1["question_text"]) > 10
    assert start_data["progress"] == {"current": 1, "total": 2}

    # Verify DB state
    db_session.expire_all()
    session = db_session.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    assert session.status == "in_progress"
    assert session.started_at is not None

    # 3. Retrieve current question
    current_q_res = client.get(f"/api/interviews/{interview_id}/current-question", headers=registered_user["headers"])
    assert current_q_res.status_code == 200
    assert current_q_res.json()["id"] == q1["id"]

    # 4. Repeat question endpoint
    repeat_res = client.post(f"/api/interviews/{interview_id}/repeat-question", headers=registered_user["headers"])
    assert repeat_res.status_code == 200
    assert repeat_res.json()["question_text"] == q1["question_text"]
    assert repeat_res.json()["order_index"] == 1

    # 5. Submit answer for Question 1
    ans1_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q1["id"],
        "answer_text": "The Python GIL coordinates thread execution in CPython to prevent race conditions during reference counting. For CPU-bound concurrency, we use multiprocessing, and for I/O bound tasks, we utilize asyncio.",
        "duration_seconds": 40,
        "speech_metrics": {
            "words_per_minute": 125.0,
            "filler_word_count": 1,
            "pause_count": 0
        }
    })
    assert ans1_res.status_code == 200
    ans1_data = ans1_res.json()
    assert "answer_id" in ans1_data
    assert "interim_feedback" in ans1_data

    # Check whether next action is next_question, follow_up, or completed
    next_action = ans1_data["next_action"]
    assert next_action in ("next_question", "follow_up", "completed")

    # Progressively answer all subsequent turns (including follow-ups) until session completes
    curr_action = ans1_data["next_action"]
    curr_next_q = ans1_data.get("next_question")
    while curr_action in ("next_question", "follow_up") and curr_next_q:
        assert "id" in curr_next_q
        assert len(curr_next_q["question_text"]) > 5
        ans_step = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
            "question_id": curr_next_q["id"],
            "answer_text": "Python dictionaries use hash tables with open addressing and perturbation to resolve hash collisions in O(1) amortized lookup time.",
            "duration_seconds": 35
        })
        assert ans_step.status_code == 200
        step_data = ans_step.json()
        curr_action = step_data.get("next_action")
        curr_next_q = step_data.get("next_question")

    # Verify session transitioned to completed
    db_session.expire_all()
    completed_session = db_session.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    assert completed_session.status == "completed"
    assert completed_session.completed_at is not None
    assert completed_session.overall_score is not None
    assert completed_session.overall_score > 0.0

def test_end_interview_early(client, registered_user, db_session):
    """Verify candidate can conclude session early with score computed on completed questions."""
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "hr",
        "domain": "Leadership",
        "target_role": "Engineering Manager",
        "difficulty": "medium",
        "total_questions": 5
    })
    interview_id = create_res.json()["id"]

    # Start session
    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=registered_user["headers"])
    q1_id = start_res.json()["current_question"]["id"]

    # Submit 1 answer
    client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q1_id,
        "answer_text": "I lead cross-functional engineering teams by establishing clear roadmaps, fostering transparent retrospectives, and unblocking engineers through continuous mentorship.",
        "duration_seconds": 50
    })

    # End interview early
    end_res = client.post(f"/api/interviews/{interview_id}/end", headers=registered_user["headers"])
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    db_session.expire_all()
    session = db_session.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    assert session.status == "completed"
    assert session.completed_at is not None
    assert session.overall_score is not None

def test_evaluation_report_and_pdf_generation(client, registered_user, db_session):
    """Verify aggregated rubric evaluation report and PDF binary download."""
    # 1. Create and complete an interview
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "technical",
        "domain": "DSA",
        "target_role": "Algorithms Specialist",
        "difficulty": "hard",
        "total_questions": 1
    })
    interview_id = create_res.json()["id"]

    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=registered_user["headers"])
    q_id = start_res.json()["current_question"]["id"]

    client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q_id,
        "answer_text": "To find top 100 IP addresses in real time from streaming logs, we use a Min-Heap of size 100 combined with a Count-Min Sketch or sliding window hash map, providing O(log K) insertion.",
        "duration_seconds": 60
    })

    # 2. Get evaluation report
    eval_res = client.get(f"/api/interviews/{interview_id}/evaluation", headers=registered_user["headers"])
    assert eval_res.status_code == 200
    report = eval_res.json()

    assert report["interview_id"] == interview_id
    assert report["overall_score"] > 0.0
    assert "technical_accuracy" in report["round_scores"]
    assert "communication_clarity" in report["round_scores"]
    assert "structure_and_depth" in report["round_scores"]
    assert "relevance" in report["round_scores"]
    assert len(report["question_evaluations"]) >= 1
    assert len(report["overall_strengths"]) > 0
    assert len(report["critical_weaknesses"]) > 0
    assert len(report["improvement_plan"]) > 0
    assert report["pdf_report_url"] == f"/api/interviews/{interview_id}/report.pdf"

    # Verify report in database
    db_session.expire_all()
    db_report = db_session.query(EvaluationReport).filter(EvaluationReport.interview_id == interview_id).first()
    assert db_report is not None
    assert db_report.overall_score == report["overall_score"]

    # 3. Download PDF report
    pdf_res = client.get(f"/api/interviews/{interview_id}/report.pdf", headers=registered_user["headers"])
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")
    assert len(pdf_res.content) > 1000

def test_list_interviews(client, registered_user):
    """Verify retrieving list of interview sessions for current user."""
    # Create two interviews
    client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "hr", "domain": "General", "target_role": "Role A", "total_questions": 2
    })
    client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "technical", "domain": "Python", "target_role": "Role B", "total_questions": 2
    })

    res = client.get("/api/interviews", headers=registered_user["headers"])
    assert res.status_code == 200
    interviews = res.json()
    assert isinstance(interviews, list)
    assert len(interviews) >= 2
    # Verify user ownership
    for itw in interviews:
        assert itw["user_id"] == registered_user["user_id"]

def test_cross_tenant_interview_isolation(client, registered_user):
    """Verify that User B cannot access or modify User A's interview session."""
    # User A creates interview
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "technical", "domain": "Python", "target_role": "Lead", "total_questions": 3
    })
    user_a_interview_id = create_res.json()["id"]

    # Register User B
    user_b_res = client.post("/api/auth/register", json={
        "email": f"user_b_{uuid.uuid4().hex[:8]}@example.com",
        "password": "PasswordB123!",
        "full_name": "User B"
    })
    token_b = user_b_res.json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B attempts to access User A's session
    assert client.get(f"/api/interviews/{user_a_interview_id}", headers=headers_b).status_code == 404
    assert client.post(f"/api/interviews/{user_a_interview_id}/start", headers=headers_b).status_code == 404
    assert client.get(f"/api/interviews/{user_a_interview_id}/current-question", headers=headers_b).status_code == 404
    assert client.post(f"/api/interviews/{user_a_interview_id}/end", headers=headers_b).status_code == 404
    assert client.get(f"/api/interviews/{user_a_interview_id}/transcript", headers=headers_b).status_code == 404

def test_interview_transcript_endpoint_json_and_text(client, registered_user, db_session):
    """Verify GET /api/interviews/{interview_id}/transcript returns full dialogue transcript in JSON and text formats."""
    # 1. Create and setup an interview
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "technical",
        "domain": "Python",
        "target_role": "Backend Engineer",
        "difficulty": "medium",
        "total_questions": 2,
        "enable_voice": False
    })
    assert create_res.status_code == 201
    interview_id = create_res.json()["id"]

    # 2. Start session
    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=registered_user["headers"])
    assert start_res.status_code == 200
    q1 = start_res.json()["current_question"]

    # 3. Submit Answer 1
    ans1_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q1["id"],
        "answer_text": "Python handles memory through reference counting and generational cyclic garbage collection.",
        "duration_seconds": 32
    })
    assert ans1_res.status_code == 200

    # 4. Fetch Transcript in JSON format (default)
    trans_res = client.get(f"/api/interviews/{interview_id}/transcript", headers=registered_user["headers"])
    assert trans_res.status_code == 200
    data = trans_res.json()

    assert data["interview_id"] == interview_id
    assert data["target_role"] == "Backend Engineer"
    assert data["domain"] == "Python"
    assert data["interview_type"] == "technical"
    assert "transcript_text" in data
    assert len(data["transcript_text"]) > 20
    assert q1["question_text"] in data["transcript_text"]
    assert "reference counting" in data["transcript_text"]
    assert "dialogue" in data
    assert len(data["dialogue"]) >= 1
    assert data["dialogue"][0]["question_text"] == q1["question_text"]
    assert data["dialogue"][0]["answer_text"] is not None
    assert "dialogue_json" in data
    assert len(data["dialogue_json"]) >= 2

    # 5. Fetch Transcript in Plain Text format (?format=text)
    txt_res = client.get(f"/api/interviews/{interview_id}/transcript?format=text", headers=registered_user["headers"])
    assert txt_res.status_code == 200
    assert "text/plain" in txt_res.headers.get("content-type", "")
    txt_content = txt_res.text
    assert "Interview Dialogue Transcript" in txt_content
    assert q1["question_text"] in txt_content
    assert "reference counting" in txt_content
    assert "AI (Question 1" in txt_content
    assert "Candidate:" in txt_content

    # 6. Unauthenticated access is rejected
    assert client.get(f"/api/interviews/{interview_id}/transcript").status_code == 401
