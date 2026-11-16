import pytest
import json
from unittest.mock import MagicMock, patch

from ai_engine.base import BaseAgent
from ai_engine.gemini_client import GeminiClient, gemini_client
from ai_engine.hr_agent import HRAgent
from ai_engine.technical_agent import TechnicalAgent
from ai_engine.aptitude_agent import AptitudeAgent
from ai_engine.resume_agent import ResumeAgent
from ai_engine.evaluation_agent import EvaluationAgent
from ai_engine.coordinator_agent import CoordinatorAgent, coordinator_agent


# =====================================================================
# 1. BASE AGENT & JSON PARSING VALIDATION
# =====================================================================

def test_base_agent_clean_json_response_variations():
    """Verify BaseAgent cleanly extracts JSON across markdown fences, trailing commas, and text wrappers."""
    agent = BaseAgent(name="TestAgent", role="Tester")

    # 1. Plain clean JSON
    plain_json = '{"key": "value", "score": 90.5}'
    res = agent.clean_json_response(plain_json)
    assert res == {"key": "value", "score": 90.5}

    # 2. Markdown fenced with ```json
    fenced_json = "```json\n{\n  \"status\": \"ok\",\n  \"count\": 3\n}\n```"
    res = agent.clean_json_response(fenced_json)
    assert res == {"status": "ok", "count": 3}

    # 3. Markdown fenced without language tag
    fenced_no_tag = "```\n{\n  \"nested\": {\"field\": true}\n}\n```"
    res = agent.clean_json_response(fenced_no_tag)
    assert res == {"nested": {"field": True}}

    # 4. JSON with trailing commas (common LLM defect)
    trailing_comma_json = '{"items": [1, 2, 3,], "status": "done",}'
    res = agent.clean_json_response(trailing_comma_json)
    assert res == {"items": [1, 2, 3], "status": "done"}

    # 5. Surrounding conversational text
    wrapped_json = "Here is the response requested:\n{\"result\": \"success\", \"code\": 200}\nHope this helps!"
    res = agent.clean_json_response(wrapped_json)
    assert res == {"result": "success", "code": 200}

    # 6. Completely malformed text fallback
    malformed = "Sorry, I could not generate valid JSON."
    res = agent.clean_json_response(malformed)
    assert res.get("parse_error") is True
    assert "raw_content" in res

    # 7. Empty or None input
    assert agent.clean_json_response("").get("parse_error") is True


def test_base_agent_safe_float():
    """Verify safe_float handles floats, ints, strings, None, and invalid types."""
    assert BaseAgent.safe_float(85.5) == 85.5
    assert BaseAgent.safe_float(90) == 90.0
    assert BaseAgent.safe_float("78.2") == 78.2
    assert BaseAgent.safe_float(None, default=70.0) == 70.0
    assert BaseAgent.safe_float("invalid_str", default=50.0) == 50.0
    assert BaseAgent.safe_float({}, default=0.0) == 0.0


# =====================================================================
# 2. GEMINI CLIENT & OFFLINE DETERMINISTIC FALLBACKS
# =====================================================================

def test_gemini_client_offline_fallback_structured_json():
    """Verify GeminiClient returns structured JSON for question generation across all technical domains."""
    client = GeminiClient(api_key="")
    assert not client.is_live()

    domains = ["python", "java", "dsa", "dbms", "os", "network", "web dev", "ai", "resume", "hr"]
    for dom in domains:
        prompt = f"Generate a high-caliber technical interview question for domain '{dom}', index 1, difficulty 'hard'."
        raw_res = client.generate_content("You are an interviewer.", prompt)
        parsed = json.loads(raw_res)
        assert "question_text" in parsed and len(parsed["question_text"]) > 10
        assert "category" in parsed
        assert "difficulty" in parsed and parsed["difficulty"] == "hard"
        assert "expected_criteria" in parsed and isinstance(parsed["expected_criteria"], list)


def test_gemini_client_code_assessment_fallback():
    """Verify GeminiClient provides deterministic code assessment fallback."""
    client = GeminiClient(api_key="")
    prompt = "Assess candidate code implementation for Two Sum in Python:\ndef two_sum(): pass"
    raw_res = client.generate_content("System prompt", prompt)
    parsed = json.loads(raw_res)
    for field in ["correctness_score", "time_complexity", "space_complexity", "code_quality_score", "overall_score", "feedback", "strengths"]:
        assert field in parsed


def test_gemini_client_answer_evaluation_fallback_quality_sensitive():
    """Verify GeminiClient answer evaluation fallback handles high-quality vs low-quality answers."""
    client = GeminiClient(api_key="")

    # High quality answer
    high_q_prompt = (
        "Evaluate technical answer.\n"
        "Question: Explain B+ Tree indexing.\n"
        "Candidate Answer: B+ trees store all records in leaf nodes linked sequentially, maintaining high fan-out and shallow depth to minimize disk block I/O operations."
    )
    raw_high = client.generate_content("System", high_q_prompt)
    parsed_high = json.loads(raw_high)
    assert parsed_high["score"] >= 80.0

    # Low quality answer ("I don't know")
    low_q_prompt = (
        "Evaluate technical answer.\n"
        "Question: Explain B+ Tree indexing.\n"
        "Candidate Answer: I do not know."
    )
    raw_low = client.generate_content("System", low_q_prompt)
    parsed_low = json.loads(raw_low)
    assert parsed_low["score"] <= 40.0


def test_gemini_client_rate_limit_resilience():
    """Verify that when live Gemini client encounters 429 rate limit or network exception, it seamlessly falls back."""
    mock_live = GeminiClient(api_key="test_api_key_simulated")
    # Simulate a live client where both API calling conventions raise 429 ResourceExhausted
    mock_inner_client = MagicMock()
    mock_inner_client.models.generate_content.side_effect = Exception("429 ResourceExhausted: Quota exceeded for model gemini-1.5-pro")
    mock_inner_client.generate_content.side_effect = Exception("429 ResourceExhausted: Quota exceeded for model gemini-1.5-pro")
    mock_live._client = mock_inner_client

    assert mock_live.is_live()

    prompt = "Generate a question for domain 'python', difficulty 'medium'."
    raw_res = mock_live.generate_content("System", prompt)
    parsed = json.loads(raw_res)
    assert "question_text" in parsed
    assert "difficulty" in parsed and parsed["difficulty"] == "medium"
    assert "Python" in parsed["category"]


# =====================================================================
# 3. HR AGENT (STAR METHODOLOGY & BEHAVIORAL EVALUATION)
# =====================================================================

def test_hr_agent_star_methodology_scoring():
    """Verify STAR analysis detects complete components and missing pillars."""
    agent = HRAgent()

    # Complete STAR response
    star_full = (
        "When I was at Acme Corp, our production checkout database crashed during peak Black Friday traffic. "
        "My responsibility was to lead incident response and restore transaction processing. "
        "I investigated connection pool exhaustion, redesigned index locks, and deployed read replicas. "
        "As a result, checkout uptime was restored to 99.99% within 15 minutes, preventing revenue loss."
    )
    analysis = agent.assess_star_methodology(star_full)
    assert analysis["has_situation"] is True
    assert analysis["has_task"] is True
    assert analysis["has_action"] is True
    assert analysis["has_result"] is True
    assert analysis["star_score"] == 100.0
    assert len(analysis["missing_components"]) == 0

    # Weak response missing action and result
    star_weak = "I don't know."
    weak_analysis = agent.assess_star_methodology(star_weak)
    assert weak_analysis["has_action"] is False
    assert weak_analysis["has_result"] is False
    assert weak_analysis["star_score"] < 100.0


def test_hr_agent_evaluation_and_follow_up():
    """Verify HRAgent evaluation combines STAR and rubric scores, and triggers follow-up on brevity."""
    agent = HRAgent()

    # Evaluation with weak answer produces low score
    eval_weak = agent.evaluate_answer(
        question="Describe a conflict with a team member.",
        answer="I do not know.",
        expected_criteria=["Collaboration", "Resolution"]
    )
    assert eval_weak["score"] < 50.0
    assert isinstance(eval_weak["improvements"], list)

    # Follow-up on brief response (< 25 words)
    follow_up = agent.should_ask_follow_up(answer="I handled it well.", question="How did you resolve it?")
    assert follow_up["needs_follow_up"] is True
    assert follow_up["follow_up_question"] is not None


# =====================================================================
# 4. TECHNICAL AGENT (ALL DOMAINS, CODE ASSESSMENT & NORMALIZATION)
# =====================================================================

@pytest.mark.parametrize("domain", [
    "Python", "Java", "DSA", "DBMS", "OS", "Networks", "Web Dev", "AI/ML"
])
def test_technical_agent_all_domains_and_difficulties(domain):
    """Verify TechnicalAgent delivers questions across all 8 domains at all difficulty tiers."""
    agent = TechnicalAgent()

    for diff in ["easy", "medium", "hard"]:
        q = agent.get_question(domain=domain, index=0, difficulty=diff)
        assert isinstance(q, dict)
        assert "question_text" in q and len(q["question_text"]) > 10
        assert "category" in q
        assert q["difficulty"] == diff
        assert "expected_criteria" in q and len(q["expected_criteria"]) > 0


def test_technical_agent_domain_alias_normalization():
    """Verify TechnicalAgent normalizes domain aliases correctly."""
    agent = TechnicalAgent()
    assert agent._normalize_domain("operating systems") == "OS"
    assert agent._normalize_domain("database") == "DBMS"
    assert agent._normalize_domain("computer networks") == "Networks"
    assert agent._normalize_domain("frontend") == "Web Dev"
    assert agent._normalize_domain("artificial intelligence") == "AI/ML"
    assert agent._normalize_domain("unknown_specialty") == "DSA"


def test_technical_agent_assess_code_empty_and_valid():
    """Verify assess_code returns 0.0 scores for empty submission and structured evaluation for valid code."""
    agent = TechnicalAgent()

    # Empty code submission
    empty_eval = agent.assess_code(code="", language="python", problem_description="Solve two sum")
    assert empty_eval["correctness_score"] == 0.0
    assert empty_eval["overall_score"] == 0.0
    assert len(empty_eval["strengths"]) == 0

    # Valid Python code submission
    valid_code = "def two_sum(nums, t):\n    s = set()\n    for n in nums:\n        if t - n in s: return True\n        s.add(n)\n    return False"
    valid_eval = agent.assess_code(code=valid_code, language="python", problem_description="Two sum existence check")
    assert valid_eval["correctness_score"] >= 70.0
    assert valid_eval["time_complexity"] != "N/A"


# =====================================================================
# 5. APTITUDE AGENT (ZERO-LEAK MCQ GENERATION & DETERMINISTIC GRADING)
# =====================================================================

def test_aptitude_agent_zero_leak_and_single_question():
    """Verify AptitudeAgent never leaks answer keys in questions and supports single-question retrieval."""
    agent = AptitudeAgent()

    # Check question retrieval across categories and difficulties
    questions = agent.get_test_questions(count=15, category="all")
    assert len(questions) > 0
    for q in questions:
        assert "correct_option" not in q
        assert "explanation" not in q
        assert "options" in q
        for opt in ["A", "B", "C", "D"]:
            assert opt in q["options"]

    # Test get_question for coordinator turns
    single_q = agent.get_question(index=1, difficulty="easy")
    assert "question_text" in single_q
    assert "options" in single_q
    assert "correct_option" not in single_q


def test_aptitude_agent_grade_single_answer():
    """Verify deterministic grading for single questions in coordinator turns."""
    agent = AptitudeAgent()

    # Correct answer for apt_q1 (Train problem, answer is B)
    res_correct = agent.grade_single_answer("apt_q1", "B")
    assert res_correct["score"] == 100.0
    assert "Correct!" in res_correct["feedback"]

    # Incorrect answer for apt_q1
    res_incorrect = agent.grade_single_answer("apt_q1", "A")
    assert res_incorrect["score"] == 0.0
    assert "Incorrect" in res_incorrect["feedback"]


# =====================================================================
# 6. RESUME AGENT (EXTRACTION & GROUNDED QUESTION GENERATION)
# =====================================================================

def test_resume_agent_extraction_and_grounding():
    """Verify ResumeAgent extracts skills, experience, and generates grounded questions."""
    agent = ResumeAgent()

    sample_resume = """
    Alex Mercer - Principal Architect
    Summary: 8+ years experience architecting cloud services with Python, Go, Docker, Kubernetes, Kafka, and PostgreSQL.
    Projects:
    - Built a high-throughput financial trade matching engine in Go handling 1M TPS.
    - Designed distributed database sharding using PostgreSQL and Redis caching.
    Education:
    Master of Science in Computer Science
    """
    profile = agent.extract_profile_from_text(sample_resume)
    assert profile["experience_level"] == "lead/principal"
    assert profile["years_of_experience"] == 8
    assert "Go" in profile["skills"]
    assert "PostgreSQL" in profile["skills"]
    assert len(profile["projects"]) >= 2

    # Grounded question generation
    grounded_q = agent.generate_grounded_question(
        resume_summary=profile["summary"],
        skills=profile["skills"],
        index=0,
        projects=profile["projects"],
        difficulty="hard"
    )
    assert "question_text" in grounded_q
    assert grounded_q["difficulty"] == "hard"
    assert "expected_criteria" in grounded_q


# =====================================================================
# 7. COORDINATOR AGENT (STATE MACHINE & MULTI-AGENT ORCHESTRATION)
# =====================================================================

def test_coordinator_agent_state_machine_difficulty_adaptation():
    """Verify coordinator adapt_difficulty transitions across all score ranges and boundaries."""
    coord = CoordinatorAgent()

    # Promotions: score >= 85.0
    assert coord.adapt_difficulty("easy", 85.0) == "medium"
    assert coord.adapt_difficulty("easy", 100.0) == "medium"
    assert coord.adapt_difficulty("medium", 85.0) == "hard"
    assert coord.adapt_difficulty("hard", 95.0) == "hard"

    # Demotions: score < 60.0
    assert coord.adapt_difficulty("hard", 59.9) == "medium"
    assert coord.adapt_difficulty("hard", 0.0) == "medium"
    assert coord.adapt_difficulty("medium", 59.9) == "easy"
    assert coord.adapt_difficulty("easy", 40.0) == "easy"

    # Stability: 60.0 <= score < 85.0
    assert coord.adapt_difficulty("easy", 60.0) == "easy"
    assert coord.adapt_difficulty("easy", 84.9) == "easy"
    assert coord.adapt_difficulty("medium", 70.0) == "medium"
    assert coord.adapt_difficulty("hard", 80.0) == "hard"

    # Unknown difficulty default
    assert coord.adapt_difficulty("unknown", 85.0) == "hard"


def test_coordinator_agent_multi_turn_lifecycle():
    """Verify coordinator handles turn processing, follow-ups, and completion cleanly."""
    coord = CoordinatorAgent()

    # 1. Initial Question
    init_q = coord.get_initial_question(interview_type="technical", domain="Python", difficulty="medium")
    assert "question_text" in init_q
    assert init_q["difficulty"] == "medium"

    # 2. Turn 1 (question 1 of 2) with high score promotes difficulty to hard
    turn1 = coord.process_turn(
        interview_type="technical",
        domain="Python",
        current_question_index=1,
        total_questions=2,
        current_question=init_q,
        answer_text="Python handles memory via reference counting and a generational cyclic garbage collector for cyclic references."
    )
    assert turn1["next_action"] in ("next_question", "follow_up")
    assert turn1["current_difficulty"] in ("medium", "hard")

    # 3. Turn 2 (question 2 of 2) reaching total_questions completes the interview
    turn_final = coord.process_turn(
        interview_type="technical",
        domain="Python",
        current_question_index=2,
        total_questions=2,
        current_question=init_q,
        answer_text="Comprehensive final answer detailing concurrency models."
    )
    assert turn_final["next_action"] == "completed"
    assert turn_final["next_question"] is None


def test_coordinator_agent_aptitude_turn():
    """Verify coordinator supports aptitude turns with deterministic single-answer grading."""
    coord = CoordinatorAgent()

    apt_q = coord.get_initial_question(interview_type="aptitude", domain="General Aptitude", difficulty="medium")
    assert "options" in apt_q

    # Submit correct answer "B" on turn 1 of 2
    turn = coord.process_turn(
        interview_type="aptitude",
        domain="General Aptitude",
        current_question_index=1,
        total_questions=2,
        current_question=apt_q,
        answer_text="B"
    )
    assert turn["evaluation"]["score"] == 100.0
    assert turn["next_action"] == "next_question"
    assert turn["current_difficulty"] == "hard"  # Promoted from medium on score 100


# =====================================================================
# 8. EVALUATION AGENT (RUBRIC AGGREGATION & DETERMINISTIC STUDY PLAN)
# =====================================================================

def test_evaluation_agent_deterministic_rubric_aggregation():
    """Verify EvaluationAgent aggregates scores with exact rubric weights."""
    agent = EvaluationAgent()

    question_evals = [
        {
            "score": 80.0,
            "technical_depth_score": 90.0,
            "relevance_score": 85.0,
            "clarity_score": 75.0,
            "strengths": ["Clear explanation"],
            "improvements": ["Elaborate on edge cases"]
        },
        {
            "score": 90.0,
            "technical_depth_score": 90.0,
            "relevance_score": 95.0,
            "clarity_score": 85.0,
            "strengths": ["Strong systems depth"],
            "improvements": ["Highlight quantitative metrics"]
        }
    ]

    report = agent.aggregate_evaluation(question_evals)
    # Expected weighted score:
    # avg_depth = 90.0 * 0.35 = 31.5
    # avg_relevance = 90.0 * 0.25 = 22.5
    # avg_clarity = 80.0 * 0.25 = 20.0
    # avg_score = 85.0 * 0.15 = 12.75
    # Expected sum = 86.75 -> 86.8
    assert report["overall_score"] == 86.8
    assert report["round_scores"]["technical_accuracy"] == 90.0
    assert report["round_scores"]["relevance"] == 90.0
    assert report["round_scores"]["communication_clarity"] == 80.0
    assert report["round_scores"]["structure_and_depth"] == 85.0
    assert len(report["overall_strengths"]) == 2
    assert len(report["critical_weaknesses"]) == 2
    assert len(report["improvement_plan"]) > 0


def test_evaluation_agent_empty_and_null_evaluations():
    """Verify EvaluationAgent safely handles empty list or None values without crashing."""
    agent = EvaluationAgent()

    # Empty list
    empty_report = agent.aggregate_evaluation([])
    assert empty_report["overall_score"] == 0.0
    assert empty_report["round_scores"]["technical_accuracy"] == 0.0

    # Evaluations with None fields
    null_evals = [
        {"score": None, "relevance_score": None, "clarity_score": None, "technical_depth_score": None}
    ]
    report = agent.aggregate_evaluation(null_evals)
    assert report["overall_score"] > 0.0


# =====================================================================
# 9. PROMPT SAFETY & ADAPTIVE STAR FOLLOW-UP VERIFICATION
# =====================================================================

def test_prompt_safety_zero_physical_or_emotion_evaluation():
    """Verify strictly zero evaluation of physical appearance or emotion across all agent prompts and client fallbacks."""
    # 1. Agent system prompts contain strict prohibitions
    agents = [HRAgent, TechnicalAgent, ResumeAgent, EvaluationAgent]
    for agent_cls in agents:
        system_prompt = agent_cls.SYSTEM_PROMPT.lower()
        assert "physical appearance" in system_prompt or "appearance" in system_prompt
        assert "emotion" in system_prompt or "emotional state" in system_prompt

    # 2. GeminiClient rejects physical appearance and emotion evaluation requests deterministically
    client = GeminiClient(api_key="")
    
    appearance_prompt = "Evaluate and score candidate physical appearance, attire, and professional looks."
    res_appearance = json.loads(client.generate_content("HR Evaluator", appearance_prompt))
    assert res_appearance.get("safety_violation") is True
    assert res_appearance.get("score") == 0.0
    assert "strictly declined" in res_appearance.get("feedback", "").lower()

    emotion_prompt = "Assess candidate facial expression, eye contact, and emotional state during response."
    res_emotion = json.loads(client.generate_content("HR Evaluator", emotion_prompt))
    assert res_emotion.get("safety_violation") is True
    assert res_emotion.get("score") == 0.0
    assert "prohibited" in res_emotion.get("feedback", "").lower()


def test_hr_agent_adaptive_follow_up_guides_star_on_short_and_evasive_answers():
    """Verify adaptive follow-ups handle short and evasive answers by guiding candidate on STAR structure."""
    agent = HRAgent()

    # Case A: Short answer (< 25 words)
    short_ans = "I fixed the issue quickly."
    res_short = agent.should_ask_follow_up(answer=short_ans, question="How did you resolve the outage?")
    assert res_short["needs_follow_up"] is True
    assert "STAR structure" in res_short["follow_up_question"]
    assert "Situation" in res_short["follow_up_question"]
    assert "Task" in res_short["follow_up_question"]
    assert "Action" in res_short["follow_up_question"]
    assert "Result" in res_short["follow_up_question"]

    # Case B: Evasive answer ("I don't know, someone else handled it.")
    evasive_ans1 = "I don't know, someone else handled it."
    res_evasive1 = agent.should_ask_follow_up(answer=evasive_ans1, question="Tell me about a time you resolved a conflict.")
    assert res_evasive1["needs_follow_up"] is True
    assert "STAR structure" in res_evasive1["follow_up_question"]

    # Case C: Evasive answer ("cannot recall, skip.")
    evasive_ans2 = "I cannot recall any instance of that, please skip to the next question."
    res_evasive2 = agent.should_ask_follow_up(answer=evasive_ans2, question="Describe a critical mistake you made.")
    assert res_evasive2["needs_follow_up"] is True
    assert "STAR structure" in res_evasive2["follow_up_question"]

    # Case D: Missing personal Action in partial response (< 60 words)
    missing_action = "When I was at Acme Corp, our production server failed and the team had a critical goal to restore transactions."
    res_action = agent.should_ask_follow_up(answer=missing_action, question="How did you resolve the server failure?")
    assert res_action["needs_follow_up"] is True
    assert "Action" in res_action["follow_up_question"]
    assert "STAR" in res_action["follow_up_question"]

    # Case E: Missing Result in partial response (< 60 words)
    missing_result = "When I was at Acme Corp, our server crashed. My task was to restore it, so I deployed read replicas and optimized database queries."
    res_result = agent.should_ask_follow_up(answer=missing_result, question="How did you resolve the server failure?")
    assert res_result["needs_follow_up"] is True
    assert "Result" in res_result["follow_up_question"]
    assert "STAR" in res_result["follow_up_question"]


def test_gemini_client_follow_up_fallback_guides_star():
    """Verify GeminiClient deterministic fallback generates STAR-guided follow-up for brief or evasive answers."""
    client = GeminiClient(api_key="")
    
    prompt = "Generate follow_up for candidate answer: 'no idea, someone else on the team took care of it.'"
    raw = client.generate_content("HR Agent", prompt)
    parsed = json.loads(raw)
    assert parsed.get("needs_follow_up") is True
    assert "STAR structure" in parsed.get("follow_up_question", "")
    assert "Situation" in parsed.get("follow_up_question", "")
    assert "Result" in parsed.get("follow_up_question", "")

