import json
import pytest
from unittest.mock import MagicMock, patch
import httpx
from google.genai import errors

from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError,
    MalformedOutputError,
    GeminiClientError,
    mask_api_key
)
from backend.app.ai.schemas import InterviewQuestionSchema


# =====================================================================
# 1. API KEY VALIDATION & SECURITY
# =====================================================================

def test_missing_api_key_raises_error():
    """Verify missing, empty, or whitespace GEMINI_API_KEY immediately raises MissingApiKeyError."""
    with pytest.raises(MissingApiKeyError):
        GeminiClient(api_key="")

    with pytest.raises(MissingApiKeyError):
        GeminiClient(api_key="   ")

    with patch("backend.app.ai.gemini_client.settings.GEMINI_API_KEY", ""):
        with pytest.raises(MissingApiKeyError):
            GeminiClient(api_key=None)


def test_api_key_never_logged_or_exposed():
    """Verify secret API keys are never exposed in string representations, error messages, or logs."""
    raw_secret_key = "AIzaSySecretApiKey1234567890abcdef"
    
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        client = GeminiClient(api_key=raw_secret_key, model="gemini-2.5-pro")

        # 1. Repr and str must never expose the raw key
        client_repr = repr(client)
        client_str = str(client)
        assert raw_secret_key not in client_repr
        assert raw_secret_key not in client_str
        assert "api_key_configured=True" in client_repr

        # 2. Masking function removes known secret and URL key parameters
        masked = mask_api_key(f"Error accessing https://generativelanguage.googleapis.com/v1beta?key={raw_secret_key}", raw_secret_key)
        assert raw_secret_key not in masked
        assert "[REDACTED_API_KEY]" in masked or "***" in masked


# =====================================================================
# 2. ERROR MAPPING (INVALID KEY, QUOTA, MALFORMED OUTPUT)
# =====================================================================

def test_invalid_api_key_raises_invalid_api_key_error():
    """Verify HTTP 400 API_KEY_INVALID / 401 / 403 maps to InvalidApiKeyError."""
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        mock_sdk = MagicMock()
        mock_client_cls.return_value = mock_sdk
        client = GeminiClient(api_key="invalid_test_key")

        # Simulate Google API error for invalid API key
        mock_sdk.models.generate_content.side_effect = Exception(
            "400 API_KEY_INVALID: API key not valid. Please pass a valid API key."
        )

        with pytest.raises(InvalidApiKeyError) as exc_info:
            client.generate_question("Generate question")
        assert "invalid" in str(exc_info.value).lower() or "api key" in str(exc_info.value).lower()


def test_quota_exceeded_raises_quota_exceeded_error():
    """Verify HTTP 429 RESOURCE_EXHAUSTED maps to QuotaExceededError."""
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        mock_sdk = MagicMock()
        mock_client_cls.return_value = mock_sdk
        client = GeminiClient(api_key="valid_test_key")

        # Simulate 429 ResourceExhausted
        mock_sdk.models.generate_content.side_effect = Exception(
            "429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'Generate Content API requests per minute'."
        )

        with pytest.raises(QuotaExceededError) as exc_info:
            client.generate_question("Generate question")
        assert "quota" in str(exc_info.value).lower() or "rate limit" in str(exc_info.value).lower()


def test_malformed_output_raises_malformed_output_error():
    """Verify model output failing JSON or schema validation raises MalformedOutputError."""
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        mock_sdk = MagicMock()
        mock_client_cls.return_value = mock_sdk
        client = GeminiClient(api_key="valid_test_key")

        # Case 1: Non-JSON plain conversational text
        mock_resp1 = MagicMock()
        mock_resp1.text = "I'm sorry, as an AI I cannot generate interview questions."
        mock_sdk.models.generate_content.return_value = mock_resp1

        with pytest.raises(MalformedOutputError):
            client.generate_question("Generate question")

        # Case 2: JSON missing required fields (e.g. missing intent and expected_points)
        mock_resp2 = MagicMock()
        mock_resp2.text = json.dumps({"question": "What is Python?"})
        mock_sdk.models.generate_content.return_value = mock_resp2

        with pytest.raises(MalformedOutputError):
            client.generate_question("Generate question")

        # Case 3: Empty text response
        mock_resp3 = MagicMock()
        mock_resp3.text = ""
        mock_sdk.models.generate_content.return_value = mock_resp3

        with pytest.raises(MalformedOutputError):
            client.generate_question("Generate question")


# =====================================================================
# 3. TIMEOUT & RETRY LOGIC (EXACTLY 1 RETRY)
# =====================================================================

def test_transient_error_retry_success():
    """Verify client performs exactly 1 retry on transient network errors and succeeds if retry succeeds."""
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        mock_sdk = MagicMock()
        mock_client_cls.return_value = mock_sdk
        client = GeminiClient(api_key="valid_test_key", max_retries=1)

        valid_json = json.dumps({
            "question": "Explain how Python manages memory.",
            "intent": "Assess reference counting and cyclic GC.",
            "difficulty": "medium",
            "expected_points": ["Reference counting", "Generational GC"]
        })
        success_response = MagicMock()
        success_response.text = valid_json

        # Attempt 1 fails with transient Timeout, Attempt 2 succeeds
        mock_sdk.models.generate_content.side_effect = [
            httpx.ReadTimeout("Connection read timed out after 30.0s"),
            success_response
        ]

        question = client.generate_question("Generate technical question")
        assert isinstance(question, InterviewQuestionSchema)
        assert question.question == "Explain how Python manages memory."
        assert mock_sdk.models.generate_content.call_count == 2


def test_transient_error_retry_exhausted():
    """Verify client stops after exactly 1 retry (2 total attempts) if transient error persists."""
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        mock_sdk = MagicMock()
        mock_client_cls.return_value = mock_sdk
        client = GeminiClient(api_key="valid_test_key", max_retries=1)

        # Both attempts fail with 503 Service Unavailable
        mock_sdk.models.generate_content.side_effect = [
            Exception("503 Service Unavailable: Backend temporarily overloaded"),
            Exception("503 Service Unavailable: Backend temporarily overloaded")
        ]

        with pytest.raises(GeminiClientError):
            client.generate_question("Generate technical question")

        # Must have attempted exactly 2 times (initial + 1 retry)
        assert mock_sdk.models.generate_content.call_count == 2


def test_successful_structured_question_generation():
    """Verify successful generation parses and returns valid InterviewQuestionSchema."""
    with patch("backend.app.ai.gemini_client.genai.Client") as mock_client_cls:
        mock_sdk = MagicMock()
        mock_client_cls.return_value = mock_sdk
        client = GeminiClient(api_key="valid_test_key", model="gemini-2.5-pro")

        raw_json = """```json
        {
          "question": "Describe a scenario where you resolved a team conflict.",
          "intent": "Evaluate interpersonal conflict resolution.",
          "difficulty": "medium",
          "expected_points": ["Respectful active listening", "Consensus building", "Focus on goals"]
        }
        ```"""
        mock_resp = MagicMock()
        mock_resp.text = raw_json
        mock_sdk.models.generate_content.return_value = mock_resp

        q = client.generate_question("Generate HR conflict question")
        assert q.question == "Describe a scenario where you resolved a team conflict."
        assert q.difficulty == "medium"
        assert len(q.expected_points) == 3
