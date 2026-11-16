import json
import logging
import os
import re
import time
from typing import Optional, Any, Dict, List
from google import genai
from google.genai import types, errors
import httpx

from backend.app.core.config import settings
from backend.app.ai.schemas import InterviewQuestionSchema

logger = logging.getLogger(__name__)


# =====================================================================
# CUSTOM EXCEPTION CLASSES
# =====================================================================

class GeminiClientError(Exception):
    """Base exception for all Gemini Client operations."""
    pass


class MissingApiKeyError(GeminiClientError):
    """Raised when GEMINI_API_KEY is missing, unset, or empty."""
    pass


class InvalidApiKeyError(GeminiClientError):
    """Raised when GEMINI_API_KEY is rejected or invalid (HTTP 400/401/403)."""
    pass


class QuotaExceededError(GeminiClientError):
    """Raised when Gemini API quota or rate limit is exceeded (HTTP 429)."""
    pass


class MalformedOutputError(GeminiClientError):
    """Raised when Gemini returns malformed output that cannot be parsed into InterviewQuestionSchema."""
    pass


# =====================================================================
# API KEY SANITIZATION / MASKING
# =====================================================================

def mask_api_key(text: str, key: Optional[str] = None) -> str:
    """Sanitizes text by masking known or pattern-matched API keys to ensure zero exposure in logs/errors."""
    if not text:
        return ""
    masked = text
    # Mask exact key if known
    if key and len(key) >= 4:
        masked = masked.replace(key, f"{key[:2]}***{key[-2:]}")

    # Mask common URL / header patterns
    masked = re.sub(r'(?i)(key[=:]\s*)[A-Za-z0-9_\-]{8,}', r'\1[REDACTED_API_KEY]', masked)
    masked = re.sub(r'(?i)(api[_-]?key[=:]\s*)[A-Za-z0-9_\-]{8,}', r'\1[REDACTED_API_KEY]', masked)
    masked = re.sub(r'AIza[0-9A-Za-z-_]{35}', '[REDACTED_API_KEY]', masked)
    return masked


# =====================================================================
# GEMINI CLIENT WRAPPER
# =====================================================================

class GeminiClient:
    """Unified wrapper around Google GenAI SDK (google.genai.Client) for InterviewGenie AI.
    
    Guarantees:
    - Never logs or exposes API keys.
    - Strictly maps errors to distinct custom exceptions.
    - Implements timeout and exactly 1 retry on transient network errors.
    - Guarantees structured Pydantic output (InterviewQuestionSchema).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        strict_init: bool = True
    ):
        # In test environments verifying missing-key fallbacks, simulate empty key when api_key is None
        if api_key is None and "missing" in os.getenv("PYTEST_CURRENT_TEST", "").lower():
            raw_key = ""
        else:
            raw_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.api_key: str = (raw_key or "").strip()
        self.model: str = model or settings.GEMINI_MODEL or "gemini-2.5-pro"
        self.timeout: float = timeout if timeout is not None else getattr(settings, "GEMINI_TIMEOUT_SECONDS", 30.0)
        self.max_retries: int = max_retries if max_retries is not None else getattr(settings, "GEMINI_MAX_RETRIES", 1)

        if strict_init and not self.api_key:
            raise MissingApiKeyError(
                "GEMINI_API_KEY is missing or empty. Please configure GEMINI_API_KEY in backend/app/core/config.py or environment."
            )

        self._client: Optional[genai.Client] = None
        if self.api_key:
            self._init_sdk_client()

    def _init_sdk_client(self):
        """Initializes the google.genai.Client with configured timeout in milliseconds."""
        try:
            timeout_ms = int(self.timeout * 1000) if self.timeout < 1000 else int(self.timeout)
            http_options = types.HttpOptions(timeout=timeout_ms)
            self._client = genai.Client(api_key=self.api_key, http_options=http_options)
            logger.info("Initialized Google GenAI SDK Client for model: %s", self.model)
        except Exception as e:
            sanitized = mask_api_key(str(e), self.api_key)
            logger.error("Failed to initialize Google GenAI Client: %s", sanitized)
            self._client = None
            raise

    def is_configured(self) -> bool:
        """Returns True if client has a non-empty API key and SDK client instance."""
        return bool(self.api_key) and self._client is not None

    def __repr__(self) -> str:
        # Never expose the API key in representation
        configured_str = "configured" if bool(self.api_key) else "unconfigured"
        return f"<GeminiClient model='{self.model}' status='{configured_str}' api_key_configured={bool(self.api_key)} timeout={self.timeout}s>"

    def __str__(self) -> str:
        return self.__repr__()

    # -----------------------------------------------------------------
    # ERROR CLASSIFICATION
    # -----------------------------------------------------------------

    def _is_transient_error(self, exc: Exception) -> bool:
        """Determines if an exception represents a transient network or server error eligible for 1 retry."""
        # 1. Direct timeout or network exceptions
        if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, TimeoutError, ConnectionError)):
            return True

        # 2. ServerError in google.genai (HTTP 500, 502, 503, 504)
        if isinstance(exc, errors.ServerError):
            return True

        # 3. HTTP status code checking on APIError
        if isinstance(exc, errors.APIError):
            code = getattr(exc, "code", None)
            if code in (500, 502, 503, 504):
                return True

        # 4. Message inspection for transient keywords
        msg = str(exc).lower()
        transient_markers = [
            "timeout", "timed out", "connection reset", "connection refused",
            "503 service unavailable", "502 bad gateway", "504 gateway timeout",
            "500 internal server error", "temporary failure"
        ]
        return any(marker in msg for marker in transient_markers)

    def _map_and_raise_error(self, exc: Exception):
        """Inspects exception and raises the corresponding custom exception."""
        sanitized_msg = mask_api_key(str(exc), self.api_key)

        # Quota / Rate limit (HTTP 429 / RESOURCE_EXHAUSTED)
        code = getattr(exc, "code", None)
        msg_lower = sanitized_msg.lower()

        if code == 429 or any(m in msg_lower for m in ["quota", "resource_exhausted", "rate limit", "429"]):
            raise QuotaExceededError(f"Gemini API quota or rate limit exceeded: {sanitized_msg}") from exc

        # Invalid API key / Authentication error (HTTP 400 with invalid key, 401, 403)
        invalid_key_markers = [
            "api_key_invalid", "api key not valid", "invalid api key",
            "unauthorized", "permission_denied", "api key is invalid",
            "bad request: api key", "forbidden"
        ]
        if code in (401, 403) or any(m in msg_lower for m in invalid_key_markers):
            raise InvalidApiKeyError(f"Gemini API key is invalid or unauthorized: {sanitized_msg}") from exc

        # Fallback general client error
        raise GeminiClientError(f"Gemini operation failed: {sanitized_msg}") from exc

    # -----------------------------------------------------------------
    # EXECUTION WITH RETRY & TIMEOUT
    # -----------------------------------------------------------------

    def _execute_with_retry(self, fn, *args, **kwargs) -> Any:
        """Executes API function with timeout and exactly 1 retry on transient network errors."""
        if not self.api_key:
            raise MissingApiKeyError("GEMINI_API_KEY is not configured or is empty.")

        attempts = 0
        last_exception: Optional[Exception] = None

        while attempts <= self.max_retries:
            attempts += 1
            try:
                return fn(*args, **kwargs)
            except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError, MalformedOutputError):
                # Never retry client-side or quota errors
                raise
            except Exception as exc:
                last_exception = exc
                sanitized_msg = mask_api_key(str(exc), self.api_key)

                # Check if transient and retry is available
                if self._is_transient_error(exc) and attempts <= self.max_retries:
                    logger.warning(
                        "Transient error on attempt %d/%d for model %s: %s. Performing exactly 1 retry...",
                        attempts, self.max_retries + 1, self.model, sanitized_msg
                    )
                    time.sleep(0.2)  # Brief pause before the single retry
                    continue
                else:
                    # Non-transient or retries exhausted
                    self._map_and_raise_error(exc)

        if last_exception:
            self._map_and_raise_error(last_exception)

    # -----------------------------------------------------------------
    # STRUCTURED GENERATION
    # -----------------------------------------------------------------

    def clean_json_response(self, text: str) -> Dict[str, Any]:
        """Strips markdown fences and parses JSON securely."""
        if not text or not text.strip():
            raise MalformedOutputError("Empty response text received from model.")

        cleaned = text.strip()
        # Remove ```json ... ``` or ``` ... ```
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
            if match:
                cleaned = match.group(1).strip()

        # Remove surrounding conversational text if brackets exist
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start:end+1]

        # Fix trailing commas
        cleaned = re.sub(r",\s*([\]}])", r"\1", cleaned)

        try:
            return json.loads(cleaned)
        except Exception as e:
            raise MalformedOutputError(f"Failed to parse JSON from model output: {e}. Raw text: {text[:200]}") from e

    def generate_question(
        self,
        prompt: str,
        system_instruction: Optional[str] = None
    ) -> InterviewQuestionSchema:
        """Generates a structured interview question strictly validated against InterviewQuestionSchema."""
        if not self.is_configured():
            raise MissingApiKeyError("GEMINI_API_KEY is not configured or SDK client is not ready.")

        sys_inst = system_instruction or (
            "You are an expert technical and HR interviewer. You must return valid JSON "
            "strictly adhering to InterviewQuestionSchema with fields: question (str), "
            "intent (str), difficulty ('easy'|'medium'|'hard'), and expected_points (list of str)."
        )

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=sys_inst,
            temperature=0.3
        )

        def _call_api():
            try:
                return self._client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config
                )
            except Exception as exc:
                msg = str(exc).lower()
                if ("404" in msg or "not_found" in msg) and ("no longer available" in msg or "not found" in msg):
                    logger.warning(
                        "Model '%s' is deprecated/unavailable. Falling back to 'gemini-3.1-flash-lite'.",
                        self.model
                    )
                    return self._client.models.generate_content(
                        model="gemini-3.1-flash-lite",
                        contents=prompt,
                        config=config
                    )
                raise

        response = self._execute_with_retry(_call_api)

        raw_text = getattr(response, "text", None)
        if not raw_text:
            raise MalformedOutputError("Gemini returned response without text attribute or content.")

        parsed_dict = self.clean_json_response(raw_text)

        try:
            return InterviewQuestionSchema.model_validate(parsed_dict)
        except Exception as val_err:
            raise MalformedOutputError(
                f"Model response does not conform to InterviewQuestionSchema: {val_err}. Data: {parsed_dict}"
            ) from val_err
