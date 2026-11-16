"""Live Interview AI Engine Package (Task 1).

Provides:
- GeminiClient: Unified Google GenAI SDK wrapper with timeout, single retry, and strict error mapping.
- InterviewQuestionSchema & LabeledQuestion: Pydantic schemas for questions and offline labeling.
- EchoStripper: STT echo-loop prevention stripping AI speech from candidate transcripts.
- OfflineFallbackBank: Offline question bank tagged with source='offline_bank' and is_fallback=True.
- LiveInterviewer: Online/offline question generator.
- InterviewCoordinator: Deterministic state machine controlling rounds, counts, and difficulty.
"""

from backend.app.ai.schemas import (
    InterviewQuestionSchema,
    LabeledQuestion,
    ConversationTurn,
    SessionState,
    CoordinatorTurnResult,
    QuizQuestionSchema,
    LabeledQuizQuestion,
    QuizGradingResult,
    QuizBatchGradingResult,
    ResumeAnalysisSchema,
    ResumeQuestionSchema,
    LabeledResumeQuestion,
    ProjectItemSchema,
    CriterionEvaluationSchema,
    AnswerEvaluationSchema,
    EvaluationReportSchema
)
from backend.app.ai.gemini_client import (
    GeminiClient,
    GeminiClientError,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError,
    MalformedOutputError,
    mask_api_key
)
from backend.app.ai.echo_stripper import EchoStripper, strip_ai_echo
from backend.app.ai.fallback_bank import OfflineFallbackBank, fallback_bank
from backend.app.ai.interviewer import LiveInterviewer
from backend.app.ai.coordinator import InterviewCoordinator, coordinator
from backend.app.ai.quiz_generator import (
    QuizGenerator,
    quiz_generator,
    OfflineQuizBank,
    offline_quiz_bank,
    grade_quiz_answer,
    grade_quiz_submission,
    normalize_stem
)
from backend.app.ai.resume_analyzer import (
    ResumeAnalyzer,
    resume_analyzer,
    DeterministicResumeParser
)
from backend.app.ai.evaluator import (
    AnswerEvaluator,
    evaluator,
    DeterministicEvaluator,
    compute_round_score,
    compute_overall_score,
    determine_tier
)

__all__ = [
    "InterviewQuestionSchema",
    "LabeledQuestion",
    "ConversationTurn",
    "SessionState",
    "CoordinatorTurnResult",
    "QuizQuestionSchema",
    "LabeledQuizQuestion",
    "QuizGradingResult",
    "QuizBatchGradingResult",
    "ResumeAnalysisSchema",
    "ResumeQuestionSchema",
    "LabeledResumeQuestion",
    "ProjectItemSchema",
    "CriterionEvaluationSchema",
    "AnswerEvaluationSchema",
    "EvaluationReportSchema",
    "GeminiClient",
    "GeminiClientError",
    "MissingApiKeyError",
    "InvalidApiKeyError",
    "QuotaExceededError",
    "MalformedOutputError",
    "mask_api_key",
    "EchoStripper",
    "strip_ai_echo",
    "OfflineFallbackBank",
    "fallback_bank",
    "LiveInterviewer",
    "InterviewCoordinator",
    "coordinator",
    "QuizGenerator",
    "quiz_generator",
    "OfflineQuizBank",
    "offline_quiz_bank",
    "grade_quiz_answer",
    "grade_quiz_submission",
    "normalize_stem",
    "ResumeAnalyzer",
    "resume_analyzer",
    "DeterministicResumeParser",
    "AnswerEvaluator",
    "evaluator",
    "DeterministicEvaluator",
    "compute_round_score",
    "compute_overall_score",
    "determine_tier",
]
