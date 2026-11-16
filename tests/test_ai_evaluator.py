import json
import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

from backend.app.ai.schemas import (
    CriterionEvaluationSchema,
    AnswerEvaluationSchema,
    EvaluationReportSchema
)
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    QuotaExceededError
)
from backend.app.ai.evaluator import (
    AnswerEvaluator,
    DeterministicEvaluator,
    compute_round_score,
    compute_overall_score,
    determine_tier
)


# =====================================================================
# 1. SCHEMA VALIDATION TESTS
# =====================================================================

def test_criterion_evaluation_schema_valid_and_bounds():
    """Verify CriterionEvaluationSchema validates fields, clamps bounds, and enforces max_score."""
    # 1. Valid criterion
    crit = CriterionEvaluationSchema(
        criterion_name="Technical Accuracy",
        score=88.5,
        max_score=100.0,
        justification="Candidate articulated the reference counting mechanics accurately."
    )
    assert crit.criterion_name == "Technical Accuracy"
    assert crit.score == 88.5
    assert crit.max_score == 100.0

    # 2. Clamping out-of-bound scores
    crit_high = CriterionEvaluationSchema(
        criterion_name="Depth",
        score=125.0,  # Clamped to 100.0
        justification="Exceptional depth demonstrated."
    )
    assert crit_high.score == 100.0

    crit_low = CriterionEvaluationSchema(
        criterion_name="Depth",
        score=-15.0,  # Clamped to 0.0
        justification="No depth demonstrated."
    )
    assert crit_low.score == 0.0


def test_per_criterion_one_sentence_justification_enforcement():
    """Verify validator normalizes justifications to exactly one concise sentence ending in punctuation."""
    # Case A: Multi-sentence string normalized to first concise sentence
    multi_sentence = "Candidate clearly explained the database index. They also talked about B+ trees at length."
    crit_multi = CriterionEvaluationSchema(
        criterion_name="Clarity",
        score=75.0,
        justification=multi_sentence
    )
    assert crit_multi.justification == "Candidate clearly explained the database index."
    assert not crit_multi.justification.endswith("at length.")

    # Case B: Sentence missing trailing period gets auto-formatted
    no_period = "Strong grasp of algorithmic complexity"
    crit_no_period = CriterionEvaluationSchema(
        criterion_name="Algorithm",
        score=90.0,
        justification=no_period
    )
    assert crit_no_period.justification == "Strong grasp of algorithmic complexity."


# =====================================================================
# 2. DOUBLE-RUN DETERMINISM TEST (EXACT EQUALITY)
# =====================================================================

def test_double_run_determinism():
    """Verify aggregation on fixed input executed twice yields bit-for-bit exact equality."""
    evaluator = AnswerEvaluator(gemini_client=None)

    eval_tech = AnswerEvaluationSchema(
        criteria=[
            CriterionEvaluationSchema(criterion_name="Technical Accuracy", score=85.0, justification="Accurate."),
            CriterionEvaluationSchema(criterion_name="Architectural Depth", score=80.0, justification="Solid depth."),
            CriterionEvaluationSchema(criterion_name="Communication Clarity", score=90.0, justification="Clear."),
            CriterionEvaluationSchema(criterion_name="Trade-offs & Edge Cases", score=75.0, justification="Covered trade-offs.")
        ],
        strengths=["Strong architectural vision"],
        improvements=["Consider tail latency"],
        computed_score=82.5
    )

    eval_hr = AnswerEvaluationSchema(
        criteria=[
            CriterionEvaluationSchema(criterion_name="Situation & Context", score=80.0, justification="Good context."),
            CriterionEvaluationSchema(criterion_name="Task & Ownership", score=85.0, justification="Clear task."),
            CriterionEvaluationSchema(criterion_name="Action & Execution", score=90.0, justification="High action."),
            CriterionEvaluationSchema(criterion_name="Result & Impact", score=85.0, justification="Solid result.")
        ],
        strengths=["Clear STAR storytelling"],
        improvements=["Quantify revenue impact"],
        computed_score=85.0
    )

    round_evals = {
        "technical": [eval_tech],
        "hr": [eval_hr]
    }

    # Run 1
    report_1 = evaluator.aggregate_interview_report(round_evals)

    # Run 2
    report_2 = evaluator.aggregate_interview_report(round_evals)

    # Assert exact equality across runs
    assert report_1.overall_score == report_2.overall_score
    assert report_1.round_scores == report_2.round_scores
    assert report_1.tier == report_2.tier
    assert report_1.feedback_summary == report_2.feedback_summary
    assert report_1.improvement_plan == report_2.improvement_plan
    assert report_1.model_dump() == report_2.model_dump()


# =====================================================================
# 3. CRITICAL RULE: GEMINI CANNOT OVERRIDE DETERMINISTIC SCORING
# =====================================================================

def test_gemini_cannot_override_deterministic_scoring():
    """Verify that even if LLM hallucinated a final score, Python code strictly recalculates from rubric weights."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()

    # Model returns criteria with scores 60.0 and 80.0, but tries to output hallucinated score 99.0
    model_json = {
        "criteria": [
            {
                "criterion_name": "Technical Accuracy",
                "score": 60.0,
                "max_score": 100.0,
                "justification": "Understood the basics."
            },
            {
                "criterion_name": "Architectural Depth",
                "score": 80.0,
                "max_score": 100.0,
                "justification": "Good depth on system design."
            }
        ],
        "strengths": ["Basic knowledge"],
        "improvements": ["Elaborate on details"],
        "computed_score": 99.0,  # Hallucinated attempt to override
        "overall_score": 99.0
    }

    mock_resp = MagicMock()
    mock_resp.text = json.dumps(model_json)
    mock_client._execute_with_retry.return_value = mock_resp
    mock_client.clean_json_response.return_value = model_json

    evaluator = AnswerEvaluator(gemini_client=mock_client)
    # Equal weights: (60.0 + 80.0) / 2 = 70.0
    eval_result = evaluator.evaluate_answer(
        question="Explain indexing",
        answer="Indexes speed up search using B+ trees.",
        round_type="technical",
        rubric_weights={"Technical Accuracy": 0.5, "Architectural Depth": 0.5}
    )

    # CRITICAL RULE: Python deterministic code MUST compute 70.0 and reject 99.0
    assert eval_result.computed_score == 70.0
    assert eval_result.computed_score != 99.0
    assert eval_result.source == "gemini"
    assert eval_result.is_fallback is False


# =====================================================================
# 4. OFFLINE FALLBACK ON MISSING KEY & QUOTA LIMITS
# =====================================================================

def test_offline_fallback_on_missing_key():
    """Verify missing GEMINI_API_KEY triggers deterministic heuristic evaluation labeled offline_bank."""
    evaluator = AnswerEvaluator(gemini_client=None)

    # 1. Technical round evaluation fallback
    res_tech = evaluator.evaluate_answer(
        question="Explain how Python memory management works.",
        answer="Python uses reference counting and a cyclic garbage collector to reclaim unreachable objects.",
        round_type="technical",
        expected_criteria=["Reference counting", "Generational cyclic GC"]
    )
    assert isinstance(res_tech, AnswerEvaluationSchema)
    assert res_tech.source == "offline_bank"
    assert res_tech.is_fallback is True
    assert res_tech.computed_score is not None
    assert len(res_tech.criteria) == 4
    for c in res_tech.criteria:
        assert len(c.justification) > 5

    # 2. HR round evaluation fallback
    res_hr = evaluator.evaluate_answer(
        question="Describe a difficult production issue you resolved.",
        answer="When I was at Acme, our database crashed. My task was to restore uptime. I optimized connection pools and deployed read replicas, achieving 99.99% availability.",
        round_type="hr"
    )
    assert isinstance(res_hr, AnswerEvaluationSchema)
    assert res_hr.source == "offline_bank"
    assert res_hr.is_fallback is True
    assert res_hr.computed_score > 70.0
    assert len(res_hr.criteria) == 4


def test_offline_fallback_on_quota_exceeded():
    """Verify HTTP 429 QuotaExceededError triggers labeled offline evaluation."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()
    mock_client._execute_with_retry.side_effect = QuotaExceededError("429 ResourceExhausted: rate limit exceeded")

    evaluator = AnswerEvaluator(gemini_client=mock_client)
    res = evaluator.evaluate_answer(
        question="What are B+ trees?",
        answer="B+ trees are self-balancing search trees with sequentially linked leaf nodes.",
        round_type="technical"
    )

    assert res.source == "offline_bank"
    assert res.is_fallback is True
    assert res.computed_score is not None


# =====================================================================
# 5. TIER CLASSIFICATION BOUNDARIES
# =====================================================================

def test_determine_tier_boundaries():
    """Verify tier classification strictly matches specified score boundaries."""
    assert determine_tier(85.0) == "Strong Hire"
    assert determine_tier(95.0) == "Strong Hire"
    assert determine_tier(84.9) == "Hire"
    assert determine_tier(70.0) == "Hire"
    assert determine_tier(69.9) == "Borderline"
    assert determine_tier(55.0) == "Borderline"
    assert determine_tier(54.9) == "Needs Improvement"
    assert determine_tier(30.0) == "Needs Improvement"
