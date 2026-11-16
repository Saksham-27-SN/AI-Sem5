import logging
from typing import Optional, List, Dict, Any
from backend.app.ai.schemas import InterviewQuestionSchema, LabeledQuestion, ConversationTurn
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError,
    MalformedOutputError,
    GeminiClientError
)
from backend.app.ai.fallback_bank import fallback_bank

logger = logging.getLogger(__name__)


class LiveInterviewer:
    """Live HR & Technical Interview engine.
    
    Generates tailored questions and follow-ups via Gemini Pro when online,
    or returns distinctly labeled offline fallback questions with source='offline_bank'
    and is_fallback=True upon any API key error or quota exhaustion.
    """

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        if gemini_client is not None:
            self.client = gemini_client
        else:
            try:
                self.client = GeminiClient(strict_init=True)
            except MissingApiKeyError:
                logger.info("GEMINI_API_KEY not configured. LiveInterviewer operating in offline fallback bank mode.")
                self.client = None
            except Exception as e:
                logger.warning("Could not initialize GeminiClient (%s). Operating in offline fallback bank mode.", e)
                self.client = None

    def generate_question(
        self,
        round_type: str = "hr",
        difficulty: str = "medium",
        domain: str = "General",
        index: int = 0,
        history: Optional[List[ConversationTurn]] = None
    ) -> LabeledQuestion:
        """Generates the next interview question for the specified round and difficulty."""
        clean_round = (round_type or "hr").strip().lower()
        clean_diff = (difficulty or "medium").strip().lower()

        # If client is not available, immediately serve from labeled fallback bank
        if self.client is None or not self.client.is_configured():
            return fallback_bank.get_fallback_question(
                round_type=clean_round,
                difficulty=clean_diff,
                domain=domain,
                index=index
            )

        # Build prompt for Gemini
        history_summary = ""
        if history:
            prior_questions = [t.content for t in history if t.role == "interviewer"][-3:]
            if prior_questions:
                history_summary = f"Prior questions asked in this session (avoid repeating topics):\n" + "\n".join(f"- {q}" for q in prior_questions)

        if clean_round == "hr":
            prompt = f"""Generate a high-caliber behavioral HR interview question.
Target difficulty: '{clean_diff}'
Focus: Behavioral competencies, collaboration, leadership, problem ownership, handling adversity, or structured STAR storytelling.
{history_summary}

STRICT SAFETY DIRECTIVE:
You must NEVER evaluate, judge, score, infer, or comment upon candidate physical appearance, facial expressions, attire, background environment, gender, race, age, accent, or emotional state.
Focus 100% on verbal clarity, structured storytelling, and professional competencies.

Return valid JSON adhering to InterviewQuestionSchema:
{{
  "question": "question text",
  "intent": "competency or intent being assessed",
  "difficulty": "{clean_diff}",
  "expected_points": ["point 1", "point 2", "point 3"]
}}"""
        else:
            prompt = f"""Generate a high-caliber technical interview question for domain '{domain}'.
Target difficulty: '{clean_diff}'
Focus: Architectural depth, foundational computer science, trade-offs, scalability, or clean code implementation.
{history_summary}

STRICT SAFETY DIRECTIVE:
You must NEVER evaluate, judge, score, infer, or comment upon candidate physical appearance, attire, facial expressions, or emotional state.
Focus 100% on technical accuracy, algorithmic correctness, and engineering trade-offs.

Return valid JSON adhering to InterviewQuestionSchema:
{{
  "question": "question text",
  "intent": "technical competency or concept being tested",
  "difficulty": "{clean_diff}",
  "expected_points": ["criterion 1", "criterion 2", "criterion 3"]
}}"""

        try:
            schema: InterviewQuestionSchema = self.client.generate_question(prompt)
            return LabeledQuestion(
                question=schema.question,
                intent=schema.intent,
                difficulty=schema.difficulty,
                expected_points=schema.expected_points,
                source="gemini",
                is_fallback=False,
                round_type=clean_round,
                category=domain if clean_round == "technical" else "Behavioral & STAR",
                is_follow_up=False,
                parent_question=None
            )
        except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError) as auth_err:
            logger.warning(
                "Gemini authorization or quota issue encountered (%s). Seamlessly serving labeled offline fallback.",
                type(auth_err).__name__
            )
            return fallback_bank.get_fallback_question(
                round_type=clean_round,
                difficulty=clean_diff,
                domain=domain,
                index=index
            )
        except (MalformedOutputError, GeminiClientError, Exception) as gen_err:
            logger.warning(
                "Gemini generation failed (%s). Seamlessly serving labeled offline fallback.",
                type(gen_err).__name__
            )
            return fallback_bank.get_fallback_question(
                round_type=clean_round,
                difficulty=clean_diff,
                domain=domain,
                index=index
            )

    def generate_follow_up(
        self,
        round_type: str = "hr",
        candidate_transcript: str = "",
        parent_question: Optional[str] = None,
        difficulty: str = "medium",
        history: Optional[List[ConversationTurn]] = None
    ) -> LabeledQuestion:
        """Generates an adaptive follow-up question building from candidate transcript and prior history."""
        clean_round = (round_type or "hr").strip().lower()
        clean_diff = (difficulty or "medium").strip().lower()

        if self.client is None or not self.client.is_configured():
            return fallback_bank.get_fallback_follow_up(
                round_type=clean_round,
                candidate_transcript=candidate_transcript,
                parent_question=parent_question,
                difficulty=clean_diff
            )

        history_context = ""
        if history:
            recent_turns = history[-4:]
            history_context = "Recent conversation turns:\n" + "\n".join(
                f"{t.role.capitalize()}: {t.content}" for t in recent_turns
            )

        prompt = f"""Generate an adaptive interview follow-up question.
Round type: '{clean_round}'
Current question asked: '{parent_question or ""}'
Candidate transcript (echo-stripped): '{candidate_transcript}'
{history_context}

Follow-up Guidelines:
1. If candidate's response was brief, evasive, or missing structure, guide them on STAR methodology (Situation, Task, Action, Result) for HR rounds.
2. If technical, probe into specific engineering trade-offs, edge cases, failure modes, and retrospective alternatives.
3. Strictly zero evaluation of physical appearance, attire, facial expressions, or emotional state.

Return valid JSON adhering to InterviewQuestionSchema:
{{
  "question": "follow-up question text",
  "intent": "probe for STAR structure or technical edge cases",
  "difficulty": "{clean_diff}",
  "expected_points": ["point 1", "point 2"]
}}"""

        try:
            schema: InterviewQuestionSchema = self.client.generate_question(prompt)
            return LabeledQuestion(
                question=schema.question,
                intent=schema.intent,
                difficulty=schema.difficulty,
                expected_points=schema.expected_points,
                source="gemini",
                is_fallback=False,
                round_type=clean_round,
                category="Adaptive Follow-up",
                is_follow_up=True,
                parent_question=parent_question
            )
        except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError, MalformedOutputError, GeminiClientError, Exception) as err:
            logger.warning(
                "Gemini follow-up generation failed (%s). Serving labeled offline follow-up.",
                type(err).__name__
            )
            return fallback_bank.get_fallback_follow_up(
                round_type=clean_round,
                candidate_transcript=candidate_transcript,
                parent_question=parent_question,
                difficulty=clean_diff
            )
