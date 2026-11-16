import json
import logging
import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

from backend.app.ai.schemas import (
    ResumeAnalysisSchema,
    ResumeQuestionSchema,
    LabeledResumeQuestion,
    ProjectItemSchema
)
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError
)
from backend.app.ai.resume_analyzer import (
    ResumeAnalyzer,
    DeterministicResumeParser
)


SAMPLE_RESUME_TEXT = """
Jane Doe
Senior Distributed Systems Engineer
Contact: jane.doe@example.com

Summary:
Results-driven engineer with 7+ years of experience architecting resilient distributed backends using Python, Go, PostgreSQL, Docker, Kubernetes, and Kafka.

Key Projects:
- StreamVault: High-throughput event streaming engine in Go and Kafka handling 500,000 events/sec with sub-10ms p99 latency.
- LedgerGuard: ACID-compliant distributed transaction ledger built using Python, FastAPI, and PostgreSQL with dual-write replication.

Work Experience:
- Staff Infrastructure Engineer at CloudScale Networks (2021 - Present): Led multi-region Kubernetes cluster migrations and zero-downtime database failover automation.
- Senior Backend Developer at DataWave Systems (2018 - 2021): Optimized microservices architecture and designed Redis caching layer reducing database CPU load by 45%.

Education:
- Master of Science in Computer Science, Stanford University
- Bachelor of Technology in Computer Engineering, MIT
"""


# =====================================================================
# 1. SCHEMA VALIDATION TESTS
# =====================================================================

def test_resume_schemas_validation():
    """Verify ResumeAnalysisSchema and ResumeQuestionSchema validate structured data properly."""
    # 1. Project item
    proj = ProjectItemSchema(
        name="StreamVault",
        tech_stack=["Go", "Kafka"],
        description="Event streaming pipeline."
    )
    assert proj.name == "StreamVault"
    assert len(proj.tech_stack) == 2

    # 2. Resume profile
    profile = ResumeAnalysisSchema(
        skills=["Python", "Go", "PostgreSQL"],
        projects=[proj.model_dump()],
        experience=["Staff Engineer at CloudScale Networks"],
        education=["MS in Computer Science"],
        gaps=["Lack of front-end metrics"]
    )
    assert "Python" in profile.skills
    assert len(profile.projects) == 1
    assert profile.projects[0]["name"] == "StreamVault"

    # 3. Grounded resume question
    q = ResumeQuestionSchema(
        question="In your project StreamVault, how did you tune Kafka partition concurrency?",
        referenced_item="StreamVault",
        intent="Assess Kafka clustering depth and message ordering guarantees.",
        difficulty="hard"
    )
    assert q.referenced_item == "StreamVault"
    assert q.difficulty == "hard"

    # 4. Invalid question (too short)
    with pytest.raises(ValidationError):
        ResumeQuestionSchema(
            question="Short?",
            referenced_item="StreamVault",
            intent="Intent",
            difficulty="easy"
        )


# =====================================================================
# 2. GROUNDING VALIDATION (ACCEPT GROUNDED, REJECT HALLUCINATIONS)
# =====================================================================

def test_grounding_validation_accepts_valid_and_rejects_hallucinations():
    """Verify grounding validation passes questions grounded in candidate's resume and rejects hallucinations."""
    profile = DeterministicResumeParser.parse_profile(SAMPLE_RESUME_TEXT)
    anchors, norm_raw = ResumeAnalyzer.extract_grounding_anchors(profile, SAMPLE_RESUME_TEXT)

    # 1. Grounded in Project ("StreamVault")
    q_grounded_proj = ResumeQuestionSchema(
        question="How did you architect StreamVault to sustain 500k events/sec?",
        referenced_item="StreamVault",
        intent="Assess distributed streaming scalability",
        difficulty="hard"
    )
    assert ResumeAnalyzer.is_grounded(q_grounded_proj, anchors, norm_raw) is True

    # 2. Grounded in Company/Experience ("CloudScale Networks")
    q_grounded_exp = ResumeQuestionSchema(
        question="At CloudScale Networks, what steps did you take for multi-region failover?",
        referenced_item="CloudScale Networks",
        intent="Evaluate disaster recovery architecture",
        difficulty="hard"
    )
    assert ResumeAnalyzer.is_grounded(q_grounded_exp, anchors, norm_raw) is True

    # 3. Hallucinated Project ("QuantumCrypt") - NOT in resume
    q_hallucinated_proj = ResumeQuestionSchema(
        question="Tell me about your work on the QuantumCrypt encryption system.",
        referenced_item="QuantumCrypt",
        intent="Test cryptography",
        difficulty="hard"
    )
    assert ResumeAnalyzer.is_grounded(q_hallucinated_proj, anchors, norm_raw) is False

    # 4. Hallucinated Employer ("Google Brain") - NOT in resume
    q_hallucinated_company = ResumeQuestionSchema(
        question="What was your role at Google Brain when designing neural networks?",
        referenced_item="Google Brain",
        intent="Evaluate ML research",
        difficulty="hard"
    )
    assert ResumeAnalyzer.is_grounded(q_hallucinated_company, anchors, norm_raw) is False


def test_generate_resume_questions_filters_out_hallucinations():
    """Verify generate_resume_questions filters out ungrounded questions and substitutes grounded fallbacks."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()

    profile = DeterministicResumeParser.parse_profile(SAMPLE_RESUME_TEXT)

    # Simulate model returning 1 grounded question and 1 hallucinated question
    mock_response_json = {
        "questions": [
            {
                "question": "In your project StreamVault, how did you maintain sub-10ms p99 latency?",
                "referenced_item": "StreamVault",  # Grounded!
                "intent": "Latency optimization",
                "difficulty": "hard"
            },
            {
                "question": "Tell me about your autonomous rocket navigation project at NASA.",
                "referenced_item": "NASA Rocket Project",  # Hallucinated!
                "intent": "Aerospace guidance",
                "difficulty": "hard"
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.text = json.dumps(mock_response_json)
    mock_client._execute_with_retry.return_value = mock_resp
    mock_client.clean_json_response.return_value = mock_response_json

    analyzer = ResumeAnalyzer(gemini_client=mock_client)
    questions = analyzer.generate_resume_questions(profile, SAMPLE_RESUME_TEXT, count=2)

    assert len(questions) == 2
    # First question is the verified grounded Gemini question
    assert questions[0].referenced_item == "StreamVault"
    assert questions[0].source == "gemini"
    assert questions[0].is_fallback is False

    # Second question must NOT be the NASA hallucination; it should be a verified grounded replacement
    assert "NASA" not in questions[1].referenced_item
    assert any(term in questions[1].referenced_item.lower() for term in ["ledgerguard", "cloudscale", "datawave", "streamvault"])


# =====================================================================
# 3. ZERO RAW RESUME TEXT LOGGING (PRIVACY RULE)
# =====================================================================

def test_zero_raw_text_logging(caplog):
    """Verify raw resume text and PII are NEVER output into system logs during parsing or question generation."""
    sensitive_resume = (
        "CONFIDENTIAL_CANDIDATE_NAME_9988\n"
        "SECRET_PERSONAL_ADDRESS_4433\n"
        "Projects:\n"
        "- SecretProjectAlpha: Built classified authentication server in Python."
    )

    with caplog.at_level(logging.DEBUG):
        analyzer = ResumeAnalyzer(gemini_client=None)  # Offline deterministic mode
        profile = analyzer.analyze_resume(sensitive_resume)
        analyzer.generate_resume_questions(profile, sensitive_resume, count=2)

    # Combine all log records into a single string
    all_logs = " ".join(record.message for record in caplog.records)

    # Assert confidential phrases never appear in logs
    assert "CONFIDENTIAL_CANDIDATE_NAME_9988" not in all_logs
    assert "SECRET_PERSONAL_ADDRESS_4433" not in all_logs
    assert "SecretProjectAlpha" not in all_logs


# =====================================================================
# 4. OFFLINE FALLBACK ON MISSING OR INVALID KEY
# =====================================================================

def test_offline_fallback_on_missing_key():
    """Verify missing GEMINI_API_KEY triggers deterministic parser and returns labeled questions."""
    analyzer = ResumeAnalyzer(gemini_client=None)  # Missing key
    profile = analyzer.analyze_resume(SAMPLE_RESUME_TEXT)

    # 1. Profile extracted deterministically
    assert "Python" in profile.skills
    assert "Go" in profile.skills
    assert "PostgreSQL" in profile.skills
    assert len(profile.projects) >= 2
    assert any("StreamVault" in p.get("name", "") for p in profile.projects)
    assert len(profile.experience) >= 2

    # 2. Grounded questions generated with offline labeling
    questions = analyzer.generate_resume_questions(profile, SAMPLE_RESUME_TEXT, count=3)
    assert len(questions) == 3

    for q in questions:
        assert isinstance(q, LabeledResumeQuestion)
        assert q.source == "offline_bank"
        assert q.is_fallback is True
        assert len(q.question) >= 15
        assert q.referenced_item is not None


def test_offline_fallback_on_quota_exceeded():
    """Verify QuotaExceededError (HTTP 429) triggers labeled offline fallback."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()
    mock_client._execute_with_retry.side_effect = QuotaExceededError("429 ResourceExhausted: rate limit exceeded")

    analyzer = ResumeAnalyzer(gemini_client=mock_client)
    profile = analyzer.analyze_resume(SAMPLE_RESUME_TEXT)
    assert "Go" in profile.skills
    assert len(profile.projects) >= 1

    questions = analyzer.generate_resume_questions(profile, SAMPLE_RESUME_TEXT, count=2)
    assert len(questions) == 2
    for q in questions:
        assert q.source == "offline_bank"
        assert q.is_fallback is True
