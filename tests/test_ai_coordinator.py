import pytest
from unittest.mock import MagicMock, patch

from backend.app.ai.schemas import LabeledQuestion, InterviewQuestionSchema
from backend.app.ai.echo_stripper import EchoStripper, strip_ai_echo
from backend.app.ai.fallback_bank import fallback_bank
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    QuotaExceededError,
    InvalidApiKeyError
)
from backend.app.ai.interviewer import LiveInterviewer
from backend.app.ai.coordinator import InterviewCoordinator


# =====================================================================
# 1. ECHO-LOOP PREVENTION TESTS
# =====================================================================

def test_echo_stripper_prefix_removal():
    """Verify EchoStripper cleanly removes role prefixes like 'Interviewer:' and 'AI:'."""
    raw1 = "Interviewer: Tell me about yourself. Candidate: I am a backend software engineer."
    assert strip_ai_echo(raw1) == "I am a backend software engineer."

    raw2 = "AI: What is your primary language? I primarily program in Python and Go."
    assert strip_ai_echo(raw2) == "I primarily program in Python and Go."

    raw3 = "System:   Interviewer AI: How do you handle deadlines? By setting milestones."
    assert strip_ai_echo(raw3) == "By setting milestones."


def test_echo_stripper_question_echo_removal():
    """Verify EchoStripper removes verbatim or STT-corrupted echoes of the current question."""
    question = "What is the difference between mutable and immutable data types in Python?"
    
    # Exact echo at start of candidate speech
    raw_echo = (
        "What is the difference between mutable and immutable data types in Python? "
        "Mutable types like lists can be modified in place, whereas immutable types like tuples cannot."
    )
    cleaned = strip_ai_echo(raw_echo, current_question=question)
    assert cleaned == "Mutable types like lists can be modified in place, whereas immutable types like tuples cannot."

    # Near-match / punctuation-omitted STT echo
    raw_no_punct = (
        "What is the difference between mutable and immutable data types in python "
        "Lists are mutable while strings are immutable."
    )
    cleaned_no_punct = strip_ai_echo(raw_no_punct, current_question=question)
    assert "Lists are mutable while strings are immutable." in cleaned_no_punct
    assert "What is the difference" not in cleaned_no_punct

    # 100% pure echo (candidate speech has nothing except repeated question)
    pure_echo = "What is the difference between mutable and immutable data types in Python?"
    assert strip_ai_echo(pure_echo, current_question=question) == ""


# =====================================================================
# 2. STATE MACHINE DIFFICULTY ADAPTATION & PROGRESSION
# =====================================================================

def test_coordinator_state_machine_difficulty_adaptation():
    """Verify deterministic difficulty adaptation rules: score >= 80 promotes, score < 60 demotes, else stable."""
    coord = InterviewCoordinator()

    # Promotion (score >= 80)
    assert coord.adapt_difficulty("easy", 85.0) == "medium"
    assert coord.adapt_difficulty("easy", 100.0) == "medium"
    assert coord.adapt_difficulty("medium", 85.0) == "hard"
    assert coord.adapt_difficulty("hard", 90.0) == "hard"

    # Demotion (score < 60)
    assert coord.adapt_difficulty("hard", 59.0) == "medium"
    assert coord.adapt_difficulty("hard", 20.0) == "medium"
    assert coord.adapt_difficulty("medium", 55.0) == "easy"
    assert coord.adapt_difficulty("easy", 40.0) == "easy"

    # Stability (60 <= score < 80)
    assert coord.adapt_difficulty("easy", 70.0) == "easy"
    assert coord.adapt_difficulty("medium", 75.0) == "medium"
    assert coord.adapt_difficulty("hard", 68.0) == "hard"


def test_coordinator_question_count_and_termination():
    """Verify interview starts, progresses question by question, and cleanly completes at total_questions."""
    coord = InterviewCoordinator()
    session_id = "session_test_lifecycle_101"

    # Initial question
    q0 = coord.get_initial_question(
        session_id=session_id,
        round_type="hr",
        difficulty="medium",
        total_questions=2
    )
    assert q0 is not None
    assert q0.difficulty == "medium"

    # Turn 1: Substantial answer (no follow-up triggered), high score promotes to hard
    turn1_ans = "At my previous company, our payment service suffered a deadlock during peak checkout traffic. My task was to diagnose the lock hierarchy and restore database velocity. I analyzed pg_stat_activity, redesigned foreign key index locks, and deployed connection pooling. As a result, checkout latency dropped by 80%."
    res1 = coord.process_turn(session_id=session_id, raw_candidate_transcript=turn1_ans, score=90.0)
    assert res1.next_action == "next_question"
    assert res1.turn_index == 1
    assert res1.current_difficulty == "hard"
    assert res1.question is not None

    # Turn 2: Substantial answer on question 2 (reaching total_questions=2)
    turn2_ans = "I strongly disagreed with using MongoDB for our core transactional ledger. I built a prototype comparing ACID transaction benchmarks between Postgres and Mongo, demonstrating that Postgres prevented phantom reads. The team agreed and we adopted PostgreSQL."
    res2 = coord.process_turn(session_id=session_id, raw_candidate_transcript=turn2_ans, score=85.0)
    assert res2.next_action == "completed"
    assert res2.question is None

    session = coord.get_session_state(session_id)
    assert session.is_completed is True


# =====================================================================
# 3. CONVERSATION MEMORY PER SESSION
# =====================================================================

def test_conversation_memory_per_session():
    """Verify distinct sessions maintain independent in-memory histories."""
    coord = InterviewCoordinator()

    coord.get_initial_question("sess_A", round_type="hr", difficulty="easy")
    coord.get_initial_question("sess_B", round_type="technical", domain="Python", difficulty="hard")

    ans_a = "I am a frontend software engineer with five years of experience building modern web applications using React, TypeScript, Next.js, and Tailwind CSS."
    ans_b = "Python uses reference counting as its primary memory management mechanism alongside a generational garbage collector to identify circular references between objects."

    coord.process_turn("sess_A", ans_a, score=75.0)
    coord.process_turn("sess_B", ans_b, score=85.0)

    sess_a = coord.get_session_state("sess_A")
    sess_b = coord.get_session_state("sess_B")

    assert sess_a.round_type == "hr"
    assert sess_b.round_type == "technical"
    # History includes initial question, candidate response, and subsequent question
    assert len(sess_a.history) == 3
    assert len(sess_b.history) == 3
    assert sess_a.history[0].role == "interviewer"
    assert sess_a.history[1].role == "candidate"
    assert sess_a.history[2].role == "interviewer"
    assert "frontend software engineer" in sess_a.history[1].content
    assert "reference counting" in sess_b.history[1].content


# =====================================================================
# 4. FAILURE HANDLING & OFFLINE FALLBACK (LABELED PROVENANCE)
# =====================================================================

def test_fallback_when_api_key_missing_returns_labeled_offline_bank():
    """Verify missing GEMINI_API_KEY cleanly falls back to labeled offline question bank."""
    with patch("backend.app.ai.interviewer.GeminiClient") as mock_client_cls:
        # Simulate missing API key exception during client initialization
        mock_client_cls.side_effect = MissingApiKeyError("No API key configured.")

        interviewer = LiveInterviewer(gemini_client=None)
        q = interviewer.generate_question(round_type="hr", difficulty="medium", index=0)

        assert isinstance(q, LabeledQuestion)
        assert q.source == "offline_bank"
        assert q.is_fallback is True
        assert len(q.question) > 10
        assert q.intent is not None
        assert len(q.expected_points) > 0


def test_fallback_when_quota_exceeded_returns_labeled_offline_bank():
    """Verify quota exhaustion (HTTP 429) triggers labeled offline fallback without crashing."""
    mock_gemini = MagicMock(spec=GeminiClient)
    mock_gemini.is_configured.return_value = True
    mock_gemini.generate_question.side_effect = QuotaExceededError("429 ResourceExhausted: rate limit exceeded")

    interviewer = LiveInterviewer(gemini_client=mock_gemini)
    q = interviewer.generate_question(round_type="technical", difficulty="hard", domain="Python")

    assert isinstance(q, LabeledQuestion)
    assert q.source == "offline_bank"
    assert q.is_fallback is True
    assert q.round_type == "technical"


# =====================================================================
# 5. ADAPTIVE FOLLOW-UP ON BRIEF / EVASIVE ANSWERS
# =====================================================================

def test_adaptive_follow_up_on_brief_or_evasive_candidate_answer():
    """Verify brief (< 20 words) or evasive candidate answers trigger an adaptive follow-up guiding on STAR."""
    coord = InterviewCoordinator()
    session_id = "session_adaptive_follow_up_test"

    init_q = coord.get_initial_question(session_id=session_id, round_type="hr", difficulty="medium")
    assert init_q.is_follow_up is False

    # Evasive / brief response: "I don't know, someone else handled that."
    res_turn = coord.process_turn(session_id=session_id, raw_candidate_transcript="I don't know, someone else handled that.")
    assert res_turn.next_action == "follow_up"
    assert res_turn.question is not None
    assert res_turn.question.is_follow_up is True
    assert "STAR" in res_turn.question.question or "Situation" in res_turn.question.question or "specifically" in res_turn.question.question.lower()

    # Once candidate responds to follow-up, consecutive follow-up cap ensures advance to next question
    res_followup_ans = coord.process_turn(
        session_id=session_id,
        raw_candidate_transcript="When I worked at Acme, our database failed. My task was to restore it, so I deployed read replicas and optimized queries, restoring 99.9% uptime."
    )
    assert res_followup_ans.next_action in ("next_question", "completed")
