import json
import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

from backend.app.ai.schemas import (
    QuizQuestionSchema,
    LabeledQuizQuestion,
    QuizGradingResult,
    QuizBatchGradingResult
)
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError
)
from backend.app.ai.quiz_generator import (
    QuizGenerator,
    OfflineQuizBank,
    offline_quiz_bank,
    grade_quiz_answer,
    grade_quiz_submission,
    normalize_stem
)


# =====================================================================
# 1. PYDANTIC SCHEMA VALIDATION TESTS
# =====================================================================

def test_quiz_question_schema_valid():
    """Verify QuizQuestionSchema validates correctly with 4 unique options and valid correct_index."""
    valid_data = {
        "stem": "What is the output of bool([]) in Python?",
        "options": ["True", "False", "None", "Error"],
        "correct_index": 1,
        "explanation": "Empty sequences in Python evaluate to False in a boolean context.",
        "topic": "Python",
        "difficulty": "easy"
    }
    schema = QuizQuestionSchema.model_validate(valid_data)
    assert schema.stem == valid_data["stem"]
    assert len(schema.options) == 4
    assert schema.correct_index == 1
    assert schema.difficulty == "easy"


def test_quiz_question_schema_invalid_options_count():
    """Verify options list with != 4 items raises ValidationError."""
    # 3 options (too few)
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({
            "stem": "What is 2 + 2?",
            "options": ["3", "4", "5"],
            "correct_index": 1,
            "explanation": "2 + 2 = 4.",
            "topic": "Math",
            "difficulty": "easy"
        })

    # 5 options (too many)
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({
            "stem": "What is 2 + 2?",
            "options": ["1", "2", "3", "4", "5"],
            "correct_index": 3,
            "explanation": "2 + 2 = 4.",
            "topic": "Math",
            "difficulty": "easy"
        })


def test_quiz_question_schema_duplicate_options():
    """Verify options list with duplicate strings (case-insensitive) raises ValidationError."""
    # Exact duplicate
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({
            "stem": "Select the correct option.",
            "options": ["Option A", "Option B", "Option A", "Option D"],
            "correct_index": 0,
            "explanation": "Explanation.",
            "topic": "General",
            "difficulty": "medium"
        })

    # Case-insensitive duplicate ("Python" and "python")
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({
            "stem": "Which language is dynamically typed?",
            "options": ["Python", "Java", "C++", "python"],
            "correct_index": 0,
            "explanation": "Python is dynamically typed.",
            "topic": "Programming",
            "difficulty": "medium"
        })


def test_quiz_question_schema_correct_index_bounds():
    """Verify correct_index outside 0 <= index < 4 raises ValidationError."""
    base_data = {
        "stem": "Sample question stem for index bounds testing.",
        "options": ["A", "B", "C", "D"],
        "explanation": "Sample explanation.",
        "topic": "Test",
        "difficulty": "medium"
    }

    # Index -1
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({**base_data, "correct_index": -1})

    # Index 4 (out of bounds for 4 elements)
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({**base_data, "correct_index": 4})

    # Index 10
    with pytest.raises(ValidationError):
        QuizQuestionSchema.model_validate({**base_data, "correct_index": 10})


# =====================================================================
# 2. GENERATION, VALIDATION & RETRY LOGIC
# =====================================================================

def test_quiz_generator_duplicate_stem_rejection():
    """Verify QuizGenerator rejects generated questions matching existing session stems."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True

    existing_question = "What is the purpose of the Python GIL?"
    generator = QuizGenerator(gemini_client=mock_client)

    raw_duplicate = {
        "stem": "What is the purpose of the Python GIL?",  # Duplicate stem
        "options": ["Thread safety", "Faster execution", "JIT compilation", "Garbage collection"],
        "correct_index": 0,
        "explanation": "The GIL provides thread safety for CPython memory structures.",
        "topic": "Python",
        "difficulty": "medium"
    }

    with pytest.raises(ValueError) as exc:
        generator._validate_raw_dict(raw_duplicate, {normalize_stem(existing_question)})
    assert "duplicate question stem" in str(exc.value).lower()


def test_quiz_generator_retry_on_failure_success():
    """Verify generator discards invalid first attempt, retries once, and succeeds on second attempt."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()

    # Attempt 1 has duplicate options (invalid)
    invalid_json = json.dumps({
        "stem": "What is a deadlock?",
        "options": ["Mutual exclusion", "Resource holding", "Mutual exclusion", "Circular wait"],
        "correct_index": 0,
        "explanation": "Duplicate options present.",
        "topic": "OS",
        "difficulty": "medium"
    })

    # Attempt 2 has 4 unique options (valid)
    valid_json = json.dumps({
        "stem": "What is a deadlock in OS?",
        "options": ["Mutual exclusion", "Hold and wait", "No preemption", "Circular wait condition"],
        "correct_index": 3,
        "explanation": "A set of blocked processes each holding a resource and waiting for another.",
        "topic": "OS",
        "difficulty": "medium"
    })

    mock_resp1 = MagicMock()
    mock_resp1.text = invalid_json
    mock_resp2 = MagicMock()
    mock_resp2.text = valid_json

    # Mock GeminiClient executing API calls with execute_with_retry
    mock_client._execute_with_retry.side_effect = [mock_resp1, mock_resp2]
    mock_client.clean_json_response.side_effect = [json.loads(invalid_json), json.loads(valid_json)]

    generator = QuizGenerator(gemini_client=mock_client)
    q = generator.generate_quiz_question(topic="OS", difficulty="medium")

    assert isinstance(q, LabeledQuizQuestion)
    assert q.source == "gemini"
    assert q.is_fallback is False
    assert q.stem == "What is a deadlock in OS?"
    assert len(q.options) == 4
    assert mock_client._execute_with_retry.call_count == 2


def test_quiz_generator_retry_exhausted_falls_back_to_offline_bank():
    """Verify that when both generation attempts fail validation, engine cleanly falls back to offline bank."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()

    # Both attempts invalid (duplicate options)
    bad_json = json.dumps({
        "stem": "Bad question?",
        "options": ["Duplicate", "Duplicate", "Unique 1", "Unique 2"],
        "correct_index": 0,
        "explanation": "Bad",
        "topic": "Python",
        "difficulty": "medium"
    })
    mock_resp = MagicMock()
    mock_resp.text = bad_json

    mock_client._execute_with_retry.side_effect = [mock_resp, mock_resp]
    mock_client.clean_json_response.return_value = json.loads(bad_json)

    generator = QuizGenerator(gemini_client=mock_client)
    q = generator.generate_quiz_question(topic="Python", difficulty="medium")

    assert isinstance(q, LabeledQuizQuestion)
    assert q.source == "offline_bank"
    assert q.is_fallback is True
    assert len(q.options) == 4
    assert len(set(q.options)) == 4


# =====================================================================
# 3. OFFLINE FALLBACK ON MISSING / INVALID API KEY
# =====================================================================

def test_quiz_generator_missing_api_key_falls_back_to_offline():
    """Verify missing GEMINI_API_KEY falls back to pre-validated offline bank."""
    generator = QuizGenerator(gemini_client=None)  # No API key configured
    q = generator.generate_quiz_question(topic="Quantitative Aptitude", difficulty="easy")

    assert isinstance(q, LabeledQuizQuestion)
    assert q.source == "offline_bank"
    assert q.is_fallback is True
    assert len(q.options) == 4
    assert 0 <= q.correct_index < 4


def test_quiz_generator_invalid_api_key_falls_back_to_offline():
    """Verify HTTP 400/401/403 invalid API key error triggers labeled offline fallback."""
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured.return_value = True
    mock_client.model = "gemini-2.5-pro"
    mock_client._client = MagicMock()
    mock_client._execute_with_retry.side_effect = InvalidApiKeyError("400 API_KEY_INVALID")

    generator = QuizGenerator(gemini_client=mock_client)
    q = generator.generate_quiz_question(topic="DSA", difficulty="hard")

    assert isinstance(q, LabeledQuizQuestion)
    assert q.source == "offline_bank"
    assert q.is_fallback is True
    assert q.topic == "DSA"


# =====================================================================
# 4. DETERMINISTIC ANSWER KEY SCORING (NO LLM CALLED)
# =====================================================================

def test_deterministic_grading_single_question():
    """Verify single question scoring strictly evaluates candidate answer against correct_index without LLM."""
    q = QuizQuestionSchema(
        stem="What is 10 + 15?",
        options=["20", "25", "30", "35"],
        correct_index=1,
        explanation="10 + 15 = 25.",
        topic="Math",
        difficulty="easy"
    )

    # 1. Correct selection
    res_correct = grade_quiz_answer(q, selected_index=1)
    assert res_correct.is_correct is True
    assert res_correct.score == 100.0
    assert res_correct.correct_index == 1
    assert res_correct.selected_index == 1
    assert "25" in res_correct.explanation

    # 2. Incorrect selection
    res_incorrect = grade_quiz_answer(q, selected_index=0)
    assert res_incorrect.is_correct is False
    assert res_incorrect.score == 0.0
    assert res_incorrect.correct_index == 1
    assert res_incorrect.selected_index == 0


def test_deterministic_grading_batch_submission():
    """Verify batch submission evaluation computes total count, correct count, and percentage deterministically."""
    questions = [
        QuizQuestionSchema(
            stem="What is sample question one?",
            options=["A", "B", "C", "D"],
            correct_index=0,
            explanation="Exp 1",
            topic="Test",
            difficulty="easy"
        ),
        QuizQuestionSchema(
            stem="What is sample question two?",
            options=["A", "B", "C", "D"],
            correct_index=2,
            explanation="Exp 2",
            topic="Test",
            difficulty="medium"
        ),
        QuizQuestionSchema(
            stem="What is sample question three?",
            options=["A", "B", "C", "D"],
            correct_index=3,
            explanation="Exp 3",
            topic="Test",
            difficulty="hard"
        )
    ]

    # Candidate answers: Q1 right (0), Q2 wrong (1), Q3 right (3) -> 2 out of 3 = 66.7%
    batch_res = grade_quiz_submission(questions, [0, 1, 3])
    assert batch_res.total_questions == 3
    assert batch_res.correct_count == 2
    assert batch_res.score_percentage == 66.7
    assert len(batch_res.results) == 3
    assert batch_res.results[0].is_correct is True
    assert batch_res.results[1].is_correct is False
    assert batch_res.results[2].is_correct is True

    # Length mismatch raises ValueError
    with pytest.raises(ValueError):
        grade_quiz_submission(questions, [0, 1])


# =====================================================================
# 5. OFFLINE QUIZ BANK INTEGRITY & BATCH GENERATION
# =====================================================================

def test_offline_quiz_bank_integrity():
    """Verify every pre-curated question in OfflineQuizBank satisfies QuizQuestionSchema with 4 unique options."""
    all_questions = offline_quiz_bank.get_all_questions()
    assert len(all_questions) >= 10

    for q in all_questions:
        assert isinstance(q, LabeledQuizQuestion)
        assert q.source == "offline_bank"
        assert q.is_fallback is True
        assert len(q.options) == 4
        assert len(set(opt.lower() for opt in q.options)) == 4
        assert 0 <= q.correct_index < 4
        assert len(q.stem) >= 10
        assert len(q.explanation) >= 10


def test_generate_quiz_test_batch_no_duplicate_stems():
    """Verify generate_quiz_test returns multiple questions with zero duplicate stems."""
    generator = QuizGenerator(gemini_client=None)  # Using offline bank
    test_batch = generator.generate_quiz_test(topic="Quantitative Aptitude", count=4)

    assert len(test_batch) == 4
    stems = [normalize_stem(q.stem) for q in test_batch]
    assert len(set(stems)) == len(stems)  # All stems are strictly unique
