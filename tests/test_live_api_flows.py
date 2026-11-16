# tests/test_live_api_flows.py
"""Pytest suite for Live API verification against Gemini API and offline fallbacks."""

import os
from dotenv import load_dotenv

# Ensure backend/.env is explicitly loaded with override=True
backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
load_dotenv(backend_env, override=True)

import pytest
from backend.app.core.config import settings

# Sync settings with loaded environment key
if not settings.GEMINI_API_KEY and os.environ.get("GEMINI_API_KEY"):
    settings.GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

from backend.app.ai.gemini_client import GeminiClient, InvalidApiKeyError
from backend.app.ai.interviewer import LiveInterviewer
from backend.app.ai.coordinator import InterviewCoordinator
from backend.app.ai.quiz_generator import QuizGenerator, grade_quiz_answer
from backend.app.ai.resume_analyzer import ResumeAnalyzer
from backend.app.ai.evaluator import AnswerEvaluator


@pytest.fixture
def interviewer():
    return LiveInterviewer()


def test_flow_1_live_hr_question_and_follow_up(interviewer):
    """Flow 1: Live HR interview question and contextual follow-up."""
    q = interviewer.generate_question(round_type="hr", difficulty="medium")
    assert q.source == "gemini"
    assert not q.is_fallback
    assert len(q.question) > 20

    candidate_answer = (
        "I led the migration of a legacy monolithic service to Kubernetes using ArgoCD for GitOps deployments. "
        "We containerized services and eliminated production downtime."
    )
    fu = interviewer.generate_follow_up(
        round_type="hr",
        candidate_transcript=candidate_answer,
        parent_question=q.question,
        difficulty="medium"
    )
    assert fu.source == "gemini"
    assert fu.is_follow_up is True
    assert not fu.is_fallback


def test_flow_2_coordinator_difficulty_adaptation(interviewer):
    """Flow 2: Coordinator state machine demotes difficulty upon weak scores (< 60)."""
    coordinator = InterviewCoordinator(interviewer=interviewer)
    session_id = "test_coord_pyt_123"
    
    coordinator.get_initial_question(
        session_id=session_id,
        round_type="technical",
        difficulty="hard"
    )
    session = coordinator.get_session_state(session_id)
    assert session.current_difficulty == "hard"

    # Substantive weak answer advances question and demotes hard -> medium
    weak_ans = (
        "In my design, I would just store all request timestamps in a single centralized MySQL table "
        "and run a SELECT COUNT query on every single incoming request without using any in-memory caching or redis."
    )
    coordinator.process_turn(session_id=session_id, raw_candidate_transcript=weak_ans, score=45.0)
    assert session.current_difficulty == "medium"

    # Second weak answer demotes medium -> easy
    weak_ans_2 = (
        "For load balancing across clusters, I would simply use round-robin DNS without health checks or failover "
        "and have clients retry indefinitely until a healthy server eventually responds."
    )
    coordinator.process_turn(session_id=session_id, raw_candidate_transcript=weak_ans_2, score=50.0)
    assert session.current_difficulty == "easy"

    # Pure state machine checks
    assert coordinator.adapt_difficulty("hard", 45.0) == "medium"
    assert coordinator.adapt_difficulty("medium", 45.0) == "easy"
    assert coordinator.adapt_difficulty("easy", 85.0) == "medium"
    assert coordinator.adapt_difficulty("medium", 70.0) == "medium"


def test_flow_3_quiz_generation_and_grading():
    """Flow 3: Live quiz MCQ generation and deterministic answer key grading."""
    generator = QuizGenerator()
    q = generator.generate_quiz_question(topic="Quantitative Aptitude", difficulty="medium")
    assert q.source == "gemini"
    assert not q.is_fallback
    assert len(q.options) == 4
    assert len(set(q.options)) == 4
    assert 0 <= q.correct_index < 4

    # Deterministic grading
    res_correct = grade_quiz_answer(q, q.correct_index)
    assert res_correct.is_correct is True
    assert res_correct.score == 100.0

    res_wrong = grade_quiz_answer(q, (q.correct_index + 1) % 4)
    assert res_wrong.is_correct is False
    assert res_wrong.score == 0.0


def test_flow_4_resume_analysis_and_grounding():
    """Flow 4: Resume parsing and grounded project question generation."""
    analyzer = ResumeAnalyzer()
    resume_text = """
    Elena Rostova - Principal Distributed Systems Architect
    Skills: Go, Rust, Apache Kafka, Kubernetes, PostgreSQL, Raft Consensus
    Projects:
    - Project ChronoSync: Designed fault-tolerant distributed ledger replication using Raft in Go across 3 regions.
    """
    profile = analyzer.analyze_resume(resume_text)
    assert len(profile.skills) >= 2
    assert len(profile.projects) >= 1

    questions = analyzer.generate_resume_questions(parsed_profile=profile, raw_text=resume_text, count=1)
    assert len(questions) >= 1
    assert questions[0].source == "gemini"
    assert not questions[0].is_fallback
    assert questions[0].referenced_item is not None


def test_flow_5_rubric_evaluation_and_aggregation():
    """Flow 5: Rubric criteria evaluation with 1-sentence justifications and double-run equality."""
    evaluator = AnswerEvaluator()
    question = "How do you handle schema evolution in Apache Kafka?"
    answer = (
        "We enforce Avro schema evolution using Confluent Schema Registry with BACKWARD_TRANSITIVE compatibility. "
        "Every change must define default values for new fields, preventing consumer breaks."
    )
    res = evaluator.evaluate_answer(round_type="technical", question=question, answer=answer)
    assert len(res.criteria) >= 3
    for c in res.criteria:
        assert 0.0 <= c.score <= 100.0
        assert len(c.justification) > 10

    # Double run aggregation equality check
    fixed_evals = {"technical": [res]}
    rep_1 = evaluator.aggregate_interview_report(fixed_evals)
    rep_2 = evaluator.aggregate_interview_report(fixed_evals)
    assert rep_1.overall_score == rep_2.overall_score
    assert rep_1.model_dump() == rep_2.model_dump()


def test_flow_6_failure_path_fallback():
    """Flow 6: Invalid API key causes InvalidApiKeyError and seamlessly activates offline bank."""
    bad_client = GeminiClient(api_key="AIzaSyDummyInvalidKeyForFailurePathVerification", strict_init=True)
    interviewer = LiveInterviewer(gemini_client=bad_client)

    fallback_q = interviewer.generate_question(round_type="hr", difficulty="medium")
    assert fallback_q.source == "offline_bank"
    assert fallback_q.is_fallback is True
    assert len(fallback_q.question) > 20
