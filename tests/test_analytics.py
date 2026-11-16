import json
import uuid
from datetime import datetime, timezone
import pytest
from backend.app.models.models import InterviewSession, EvaluationReport, Answer, Question

def test_analytics_unauthenticated_rejected(client):
    """Verify that unauthenticated access to /api/analytics returns 401."""
    res = client.get("/api/analytics")
    assert res.status_code == 401
    assert "detail" in res.json()

def test_analytics_invalid_token_rejected(client):
    """Verify that request with invalid / forged JWT token to /api/analytics returns 401."""
    headers = {"Authorization": "Bearer invalid.forged.jwt.token"}
    res = client.get("/api/analytics", headers=headers)
    assert res.status_code == 401

def test_analytics_empty_state_for_new_user(client, registered_user):
    """Verify default aggregate response when candidate has completed 0 interviews."""
    res = client.get("/api/analytics", headers=registered_user["headers"])
    assert res.status_code == 200
    data = res.json()

    # Legacy flat fields
    assert data["total_interviews_completed"] == 0
    assert data["average_score"] == 0.0
    assert data["readiness_score"] == 0.0
    assert data["score_trends"] == []
    assert data["round_averages"] == {}
    assert data["top_strengths"] == []
    assert data["key_improvement_areas"] == []

    # Rich summary schema
    summary = data.get("summary")
    assert summary is not None
    assert summary["total_interviews"] == 0
    assert summary["average_score"] == 0.0
    assert summary["highest_score"] == 0.0
    assert summary["completion_rate"] == 0.0
    assert summary["total_practice_minutes"] == 0
    assert summary["readiness_status"] == "Awaiting Simulation"
    assert summary["readiness_percentage"] == 0.0

    assert data.get("score_progression") == []
    assert data.get("round_comparison") == []
    assert data.get("competencies") == []
    assert data.get("strengths") == []
    assert data.get("weaknesses") == []
    assert "Launch your first interview" in data.get("recommended_next_action", "")

def test_analytics_in_progress_interviews(client, registered_user, db_session):
    """Verify analytics response when user has created sessions that are not yet completed."""
    user_id = registered_user["user_id"]
    sess = InterviewSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        interview_type="technical",
        domain="System Design",
        target_role="Cloud Architect",
        difficulty="hard",
        status="in_progress",
        current_question_index=1,
        total_questions=5,
        started_at=datetime.now(timezone.utc),
        overall_score=None
    )
    db_session.add(sess)
    db_session.commit()

    res = client.get("/api/analytics", headers=registered_user["headers"])
    assert res.status_code == 200
    data = res.json()

    assert data["total_interviews_completed"] == 0
    assert data["average_score"] == 0.0
    summary = data.get("summary")
    assert summary is not None
    assert summary["total_interviews"] >= 1
    assert summary["completion_rate"] == 0.0
    assert summary["readiness_status"] == "In Progress"
    assert "Complete an ongoing simulation" in data.get("recommended_next_action", "")

def test_analytics_with_completed_interviews(client, registered_user, db_session):
    """Verify aggregate stats and rich progression metrics for candidate with completed interviews."""
    user_id = registered_user["user_id"]

    # 1. Create completed interview 1 (technical)
    int1 = InterviewSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        interview_type="technical",
        domain="Backend Python",
        target_role="Senior Python Engineer",
        difficulty="medium",
        status="completed",
        current_question_index=2,
        total_questions=2,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        overall_score=85.0
    )
    db_session.add(int1)

    eval1 = EvaluationReport(
        id=str(uuid.uuid4()),
        interview_id=int1.id,
        user_id=user_id,
        overall_score=85.0,
        technical_score=90.0,
        communication_score=80.0,
        problem_solving_score=85.0,
        round_breakdown_json=json.dumps({
            "technical_accuracy": 90.0,
            "communication_clarity": 80.0,
            "structure_and_depth": 85.0
        }),
        key_strengths_json=json.dumps([
            "Strong understanding of asyncio event loop",
            "Clear architectural system decomposition"
        ]),
        critical_weaknesses_json=json.dumps([
            "Discuss database contention and indexing trade-offs"
        ]),
        personalized_study_plan_json=json.dumps([
            {"topic": "Database Indexing", "recommendation": "Review B-tree mechanics"}
        ])
    )
    db_session.add(eval1)

    # 2. Create completed interview 2 (hr)
    int2 = InterviewSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        interview_type="hr",
        domain="Behavioral",
        target_role="Senior Python Engineer",
        difficulty="medium",
        status="completed",
        current_question_index=3,
        total_questions=3,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        overall_score=91.0
    )
    db_session.add(int2)

    eval2 = EvaluationReport(
        id=str(uuid.uuid4()),
        interview_id=int2.id,
        user_id=user_id,
        overall_score=91.0,
        technical_score=88.0,
        communication_score=94.0,
        problem_solving_score=90.0,
        round_breakdown_json=json.dumps({
            "technical_accuracy": 88.0,
            "communication_clarity": 94.0,
            "structure_and_depth": 90.0
        }),
        key_strengths_json=json.dumps([
            "Clear architectural system decomposition",
            "Effective STAR structure during conflict resolution"
        ]),
        critical_weaknesses_json=json.dumps([
            "Provide more quantitative revenue impact numbers"
        ]),
        personalized_study_plan_json=json.dumps([
            {"topic": "Outcome Quantification", "recommendation": "Quantify business outcomes"}
        ])
    )
    db_session.add(eval2)
    db_session.commit()

    # 3. Call /api/analytics
    res = client.get("/api/analytics", headers=registered_user["headers"])
    assert res.status_code == 200
    data = res.json()

    # Assert total interviews completed
    assert data["total_interviews_completed"] >= 2

    # Assert average score (85.0 + 91.0) / 2 = 88.0
    assert data["average_score"] == 88.0

    # Assert readiness score is in [0, 100] and reflects performance
    assert 0.0 <= data["readiness_score"] <= 100.0
    assert data["readiness_score"] == 88.0

    # Assert score trends
    assert len(data["score_trends"]) >= 2
    for trend in data["score_trends"]:
        assert "date" in trend
        assert "score" in trend
        assert "interview_type" in trend
        assert trend["score"] in [85.0, 91.0]
        assert trend["interview_type"] in ["technical", "hr"]

    # Assert round averages
    assert "technical" in data["round_averages"]
    assert data["round_averages"]["technical"] == 85.0
    assert "hr" in data["round_averages"]
    assert data["round_averages"]["hr"] == 91.0
    assert "technical_accuracy" in data["round_averages"]

    # Assert top strengths (most common first)
    assert len(data["top_strengths"]) > 0
    assert "Clear architectural system decomposition" in data["top_strengths"]

    # Assert key improvement areas
    assert len(data["key_improvement_areas"]) > 0
    assert any("database" in imp.lower() or "indexing" in imp.lower() or "quant" in imp.lower()
               for imp in data["key_improvement_areas"])

    # Rich summary assertions
    summary = data["summary"]
    assert summary["average_score"] == 88.0
    assert summary["highest_score"] == 91.0
    assert summary["total_practice_minutes"] >= 44
    assert summary["readiness_status"] == "Senior / Interview Ready"
    assert summary["readiness_percentage"] == 88.0

    # Competency radar
    competencies = data.get("competencies", [])
    assert len(competencies) >= 6
    comp_names = [c["competency"] for c in competencies]
    assert "Technical Depth" in comp_names
    assert "Communication Clarity" in comp_names
    assert "STAR Structure" in comp_names
    assert "Problem Solving" in comp_names
    for comp in competencies:
        assert 0.0 <= comp["candidate_score"] <= 100.0
        assert comp["benchmark_score"] > 0

    # Round comparison
    round_cmp = data.get("round_comparison", [])
    assert len(round_cmp) >= 4
    tech_rounds = [r for r in round_cmp if r["interview_type"] == "technical"]
    assert len(tech_rounds) == 1
    assert tech_rounds[0]["sessions_count"] >= 1
    assert tech_rounds[0]["average_score"] == 85.0

def test_analytics_user_isolation(client, registered_user, db_session):
    """Verify candidate analytics are strictly isolated between accounts."""
    # Register another user
    res2 = client.post("/api/auth/register", json={
        "email": f"other_candidate_{uuid.uuid4().hex[:8]}@example.com",
        "password": "OtherPassword123!",
        "full_name": "Other Candidate"
    })
    assert res2.status_code == 201
    other_token = res2.json()["token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other candidate should have 0 completed interviews
    other_analytics = client.get("/api/analytics", headers=other_headers)
    assert other_analytics.status_code == 200
    assert other_analytics.json()["total_interviews_completed"] == 0
    assert other_analytics.json()["average_score"] == 0.0
    assert other_analytics.json()["summary"]["total_interviews"] == 0


def test_data_contract_endpoints_auth_enforcement(client):
    """
    Verify strict token authentication on all audited data contract endpoints:
    - /api/interviews
    - /api/analytics/summary
    - /api/analytics/progression
    - /api/analytics/skills-radar
    Must reject unauthenticated and forged requests with HTTP 401 without 500s.
    """
    contract_endpoints = [
        "/api/interviews",
        "/api/analytics/summary",
        "/api/analytics/progression",
        "/api/analytics/skills-radar",
    ]

    for ep in contract_endpoints:
        # Unauthenticated request
        res = client.get(ep)
        assert res.status_code == 401, f"{ep} did not reject unauthenticated access with 401"
        assert "detail" in res.json()

        # Forged/invalid JWT token
        res_bad = client.get(ep, headers={"Authorization": "Bearer bad.token.here"})
        assert res_bad.status_code == 401, f"{ep} did not reject bad token with 401"


def test_data_contract_empty_state_zero_sessions(client):
    """
    Verify contract endpoints return clean empty lists and zero aggregates for new candidates
    with zero sessions, enabling the frontend to render authentic EmptyState components
    without fabricated numbers or mock strings.
    """
    # 1. Register a pristine new candidate
    new_user_res = client.post("/api/auth/register", json={
        "email": f"pristine_{uuid.uuid4().hex[:8]}@example.com",
        "password": "SecurePassword123!",
        "full_name": "Pristine Candidate"
    })
    assert new_user_res.status_code == 201
    token = new_user_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. History & Dashboard /api/interviews -> clean empty list []
    itw_res = client.get("/api/interviews", headers=headers)
    assert itw_res.status_code == 200
    itw_data = itw_res.json()
    assert isinstance(itw_data, list)
    assert itw_data == []

    # 3. Dashboard /api/analytics/summary -> clean zero KPI aggregates
    summary_res = client.get("/api/analytics/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_interviews"] == 0
    assert summary["average_score"] == 0.0
    assert summary["highest_score"] == 0.0
    assert summary["completion_rate"] == 0.0
    assert summary["total_practice_minutes"] == 0
    assert summary["readiness_status"] == "Awaiting Simulation"
    assert summary["readiness_percentage"] == 0.0

    # 4. Analytics /api/analytics/progression -> clean empty list []
    prog_res = client.get("/api/analytics/progression", headers=headers)
    assert prog_res.status_code == 200
    prog_data = prog_res.json()
    assert isinstance(prog_data, list)
    assert prog_data == []

    # 5. Analytics /api/analytics/skills-radar -> clean empty list [] (no fabricated scores)
    radar_res = client.get("/api/analytics/skills-radar", headers=headers)
    assert radar_res.status_code == 200
    radar_data = radar_res.json()
    assert isinstance(radar_data, list)
    assert radar_data == []

    # Check alias /api/analytics/radar as well
    radar_alias_res = client.get("/api/analytics/radar", headers=headers)
    assert radar_alias_res.status_code == 200
    assert radar_alias_res.json() == []


def test_data_contract_endpoints_populated_sessions(client, registered_user, db_session):
    """
    Verify contract endpoints return accurate schemas and non-empty collections
    when the candidate has completed interview sessions.
    """
    user_id = registered_user["user_id"]
    headers = registered_user["headers"]

    # Seed a completed interview session with evaluation report
    sess = InterviewSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        interview_type="technical",
        domain="System Design",
        target_role="Staff Distributed Systems Engineer",
        difficulty="hard",
        status="completed",
        current_question_index=2,
        total_questions=2,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        overall_score=87.5
    )
    db_session.add(sess)

    eval_rep = EvaluationReport(
        id=str(uuid.uuid4()),
        interview_id=sess.id,
        user_id=user_id,
        overall_score=87.5,
        technical_score=92.0,
        communication_score=84.0,
        problem_solving_score=86.5,
        round_breakdown_json=json.dumps({"technical_depth": 92.0, "communication_clarity": 84.0}),
        key_strengths_json=json.dumps(["Distributed consensus Raft protocol knowledge"]),
        critical_weaknesses_json=json.dumps(["Explain backpressure buffering strategies"]),
        personalized_study_plan_json=json.dumps([{"topic": "Backpressure", "recommendation": "Review reactive streams"}])
    )
    db_session.add(eval_rep)
    db_session.commit()

    # 1. /api/interviews
    itw_res = client.get("/api/interviews", headers=headers)
    assert itw_res.status_code == 200
    interviews = itw_res.json()
    assert isinstance(interviews, list)
    assert len(interviews) >= 1
    session_match = next((s for s in interviews if s["id"] == sess.id), None)
    assert session_match is not None
    assert session_match["user_id"] == user_id
    assert session_match["target_role"] == "Staff Distributed Systems Engineer"
    assert session_match["status"] == "completed"
    assert session_match["overall_score"] == 87.5

    # 2. /api/analytics/summary
    sum_res = client.get("/api/analytics/summary", headers=headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_interviews"] >= 1
    assert summary["average_score"] > 0.0
    assert summary["highest_score"] >= 87.5
    assert summary["completion_rate"] > 0.0
    assert summary["total_practice_minutes"] > 0
    assert "readiness_status" in summary
    assert summary["readiness_percentage"] > 0.0

    # 3. /api/analytics/progression
    prog_res = client.get("/api/analytics/progression", headers=headers)
    assert prog_res.status_code == 200
    progression = prog_res.json()
    assert isinstance(progression, list)
    assert len(progression) >= 1
    pt = next((p for p in progression if p["session_id"] == sess.id), None)
    assert pt is not None
    assert pt["overall_score"] == 87.5
    assert pt["interview_type"] == "technical"
    assert pt["role"] == "Staff Distributed Systems Engineer"
    assert pt["technical_score"] == 92.0
    assert pt["communication_score"] == 84.0

    # 4. /api/analytics/skills-radar
    radar_res = client.get("/api/analytics/skills-radar", headers=headers)
    assert radar_res.status_code == 200
    radar = radar_res.json()
    assert isinstance(radar, list)
    assert len(radar) >= 6
    comp_names = [item["competency"] for item in radar]
    assert "Technical Depth" in comp_names
    assert "Communication Clarity" in comp_names
    for item in radar:
        assert 0.0 <= item["candidate_score"] <= 100.0
        assert item["benchmark_score"] > 0
        assert item["full_mark"] == 100.0

