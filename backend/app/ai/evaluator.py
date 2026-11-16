import re
import json
import logging
from typing import List, Dict, Any, Optional, Union
from google.genai import types

from backend.app.ai.schemas import (
    CriterionEvaluationSchema,
    AnswerEvaluationSchema,
    EvaluationReportSchema
)
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError,
    MalformedOutputError,
    GeminiClientError
)

logger = logging.getLogger(__name__)


# =====================================================================
# DEFAULT RUBRIC WEIGHTS
# =====================================================================

DEFAULT_CRITERIA_WEIGHTS: Dict[str, Dict[str, float]] = {
    "technical": {
        "technical accuracy": 0.35,
        "architectural depth": 0.25,
        "communication clarity": 0.20,
        "trade-offs & edge cases": 0.20
    },
    "hr": {
        "situation & context": 0.20,
        "task & ownership": 0.25,
        "action & execution": 0.35,
        "result & impact": 0.20
    }
}

DEFAULT_ROUND_WEIGHTS: Dict[str, float] = {
    "technical": 0.40,
    "hr": 0.30,
    "system_design": 0.20,
    "aptitude": 0.10
}


# =====================================================================
# DETERMINISTIC PYTHON AGGREGATION FUNCTIONS (CRITICAL RULE)
# =====================================================================

def compute_round_score(
    criteria: List[CriterionEvaluationSchema],
    weights: Optional[Dict[str, float]] = None
) -> float:
    """Deterministically computes the weighted aggregate score for a set of criteria.
    
    CRITICAL RULE:
    - Gemini provides per-criterion scores.
    - Python code strictly computes the weighted average.
    - Gemini NEVER calculates or overrides this score.
    """
    if not criteria:
        return 0.0

    if not weights:
        # Unweighted arithmetic mean
        total = sum(float(c.score) for c in criteria)
        return round(total / len(criteria), 1)

    # Normalize weight keys
    norm_weights = {k.strip().lower(): float(v) for k, v in weights.items()}
    weighted_sum = 0.0
    total_weight = 0.0

    for c in criteria:
        name_clean = c.criterion_name.strip().lower()
        # Find matching weight (exact or substring)
        matched_weight = None
        if name_clean in norm_weights:
            matched_weight = norm_weights[name_clean]
        else:
            for w_name, w_val in norm_weights.items():
                if w_name in name_clean or name_clean in w_name:
                    matched_weight = w_val
                    break

        weight = matched_weight if matched_weight is not None else 1.0
        weighted_sum += float(c.score) * weight
        total_weight += weight

    if total_weight > 0.0:
        return round(weighted_sum / total_weight, 1)

    return round(sum(float(c.score) for c in criteria) / len(criteria), 1)


def compute_overall_score(
    round_scores: Dict[str, float],
    weights: Optional[Dict[str, float]] = None
) -> float:
    """Deterministically computes overall interview score from round scores using rubric weights.
    
    Guarantees:
    - 100% deterministic mathematical calculation.
    - Double-run exact equality guaranteed.
    """
    if not round_scores:
        return 0.0

    active_weights = weights or DEFAULT_ROUND_WEIGHTS
    norm_weights = {k.strip().lower(): float(v) for k, v in active_weights.items()}

    weighted_sum = 0.0
    total_weight = 0.0

    for round_name, score in round_scores.items():
        r_clean = round_name.strip().lower()
        matched_weight = None
        if r_clean in norm_weights:
            matched_weight = norm_weights[r_clean]
        else:
            for w_name, w_val in norm_weights.items():
                if w_name in r_clean or r_clean in w_name:
                    matched_weight = w_val
                    break

        weight = matched_weight if matched_weight is not None else 1.0
        weighted_sum += float(score) * weight
        total_weight += weight

    if total_weight > 0.0:
        return round(weighted_sum / total_weight, 1)

    return round(sum(round_scores.values()) / len(round_scores), 1)


def determine_tier(overall_score: float) -> str:
    """Deterministically maps numerical score to official performance tier.
    
    - >= 85.0 -> 'Strong Hire'
    - >= 70.0 -> 'Hire'
    - >= 55.0 -> 'Borderline'
    - < 55.0  -> 'Needs Improvement'
    """
    score = float(overall_score)
    if score >= 85.0:
        return "Strong Hire"
    elif score >= 70.0:
        return "Hire"
    elif score >= 55.0:
        return "Borderline"
    else:
        return "Needs Improvement"


# =====================================================================
# DETERMINISTIC OFFLINE HEURISTIC EVALUATOR
# =====================================================================

class DeterministicEvaluator:
    """Heuristic offline evaluator invoked when GEMINI_API_KEY is missing or invalid.
    
    Returns structured AnswerEvaluationSchema tagged with source='offline_bank' and is_fallback=True.
    """

    @classmethod
    def evaluate_hr_answer(cls, question: str, answer: str) -> AnswerEvaluationSchema:
        clean = (answer or "").strip()
        lower = clean.lower()
        words = clean.split()
        word_count = len(words)

        # Check for evasiveness / non-answers
        if word_count < 5 or any(w in lower for w in ["don't know", "skip", "pass", "no idea", "not sure"]):
            criteria = [
                CriterionEvaluationSchema(criterion_name="Situation & Context", score=25.0, justification="Candidate did not articulate the background situation or team context."),
                CriterionEvaluationSchema(criterion_name="Task & Ownership", score=20.0, justification="Candidate provided no description of their specific objective or role."),
                CriterionEvaluationSchema(criterion_name="Action & Execution", score=15.0, justification="No concrete personal engineering actions were described in the response."),
                CriterionEvaluationSchema(criterion_name="Result & Impact", score=10.0, justification="No measurable outcome, impact metrics, or retrospective learnings were shared.")
            ]
            strengths = ["Acknowledged gap directly."]
            improvements = ["Prepare structured examples following Situation, Task, Action, and Result (STAR)."]
        else:
            has_sit = any(c in lower for c in ["when i was", "at my", "project had", "faced with", "there was", "our team"]) or word_count >= 30
            has_task = any(c in lower for c in ["my role", "my objective", "responsible for", "needed to", "had to", "task was"]) or word_count >= 40
            has_act = any(c in lower for c in ["i built", "i designed", "i implemented", "i led", "i investigated", "i deployed", "i analyzed", "i resolved", "i optimized", "optimized", "deployed"])
            has_res = any(c in lower for c in ["result", "improved", "reduced", "delivered", "outcome", "metrics", "achieved", "achieving", "learned", "availability", "uptime", "%"])

            s_sit = 85.0 if has_sit else 55.0
            s_task = 80.0 if has_task else 50.0
            s_act = 90.0 if has_act else 60.0
            s_res = 85.0 if has_res else 45.0

            criteria = [
                CriterionEvaluationSchema(criterion_name="Situation & Context", score=s_sit, justification="Candidate clearly framed the business and technical context of the challenge." if has_sit else "Context was brief and lacked project environment specifics."),
                CriterionEvaluationSchema(criterion_name="Task & Ownership", score=s_task, justification="Personal ownership and assigned scope were well defined." if has_task else "Candidate could more clearly delineate their individual responsibility versus the team's."),
                CriterionEvaluationSchema(criterion_name="Action & Execution", score=s_act, justification="Articulated specific engineering decisions and leadership initiatives taken." if has_act else "Focus on personal actions was vague; describe exact technical steps."),
                CriterionEvaluationSchema(criterion_name="Result & Impact", score=s_res, justification="Demonstrated tangible outcomes and positive retrospective learnings." if has_res else "Incorporate quantifiable impact metrics such as latency reduction or throughput increase.")
            ]
            strengths = ["Maintained professional narrative tone.", "Articulated problem-solving ownership."]
            improvements = ["Quantify results with concrete business and system performance metrics."]

        computed = compute_round_score(criteria, DEFAULT_CRITERIA_WEIGHTS["hr"])
        return AnswerEvaluationSchema(
            criteria=criteria,
            strengths=strengths,
            improvements=improvements,
            source="offline_bank",
            is_fallback=True,
            computed_score=computed
        )

    @classmethod
    def evaluate_technical_answer(
        cls,
        question: str,
        answer: str,
        expected_criteria: Optional[List[str]] = None
    ) -> AnswerEvaluationSchema:
        clean = (answer or "").strip()
        lower = clean.lower()
        word_count = len(clean.split())

        if word_count < 5 or any(w in lower for w in ["don't know", "skip", "pass", "no idea"]):
            criteria = [
                CriterionEvaluationSchema(criterion_name="Technical Accuracy", score=20.0, justification="Candidate did not state technical principles addressing the question."),
                CriterionEvaluationSchema(criterion_name="Architectural Depth", score=15.0, justification="Response lacked foundational computer science or architectural explanation."),
                CriterionEvaluationSchema(criterion_name="Communication Clarity", score=30.0, justification="Candidate provided minimal communication without technical elaboration."),
                CriterionEvaluationSchema(criterion_name="Trade-offs & Edge Cases", score=10.0, justification="No alternative approaches or boundary failure conditions were mentioned.")
            ]
            strengths = ["Exhibited honesty regarding technical boundary."]
            improvements = ["Review core systems principles and data structure trade-offs for this topic."]
        else:
            # Match expected criteria keywords
            matched_count = 0
            if expected_criteria:
                for crit in expected_criteria:
                    keywords = [w.lower() for w in crit.split() if len(w) > 3]
                    if any(kw in lower for kw in keywords):
                        matched_count += 1
                ratio = matched_count / max(1, len(expected_criteria))
            else:
                ratio = min(1.0, word_count / 50.0)

            s_acc = round(65.0 + (ratio * 30.0), 1)
            s_depth = round(60.0 + (min(1.0, word_count / 40.0) * 30.0), 1)
            s_clarity = 85.0 if word_count >= 15 else 60.0
            s_trades = 80.0 if any(t in lower for t in ["trade-off", "tradeoff", "versus", "however", "alternatively", "overhead", "latency"]) else 55.0

            criteria = [
                CriterionEvaluationSchema(criterion_name="Technical Accuracy", score=s_acc, justification="Response correctly identified core mechanics and technical fundamentals."),
                CriterionEvaluationSchema(criterion_name="Architectural Depth", score=s_depth, justification="Demonstrated solid comprehension of runtime operations and data layout."),
                CriterionEvaluationSchema(criterion_name="Communication Clarity", score=s_clarity, justification="Engineered thoughts were expressed with precise technical terminology."),
                CriterionEvaluationSchema(criterion_name="Trade-offs & Edge Cases", score=s_trades, justification="Considered operational trade-offs and runtime memory overheads." if s_trades >= 70 else "Could elaborate more deeply on edge case failures and performance trade-offs.")
            ]
            strengths = ["Demonstrated clear technical vocabulary.", "Covered essential runtime characteristics."]
            improvements = ["Analyze asymptotic space/time complexity and multi-region failure modes."]

        computed = compute_round_score(criteria, DEFAULT_CRITERIA_WEIGHTS["technical"])
        return AnswerEvaluationSchema(
            criteria=criteria,
            strengths=strengths,
            improvements=improvements,
            source="offline_bank",
            is_fallback=True,
            computed_score=computed
        )


# =====================================================================
# EVALUATION & FEEDBACK ENGINE
# =====================================================================

class AnswerEvaluator:
    """Gemini Pro Answer Evaluator and Deterministic Rubric Aggregator.
    
    CRITICAL RULE:
    - Gemini evaluates criteria and produces 1-sentence justifications.
    - Round scores and overall scores are computed strictly by deterministic Python code.
    - Gemini NEVER calculates or overrides the final aggregate score.
    - Fallback evaluates answers via deterministic heuristics (source='offline_bank', is_fallback=True).
    """

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        if gemini_client is not None:
            self.client = gemini_client
        else:
            try:
                self.client = GeminiClient(strict_init=True)
            except MissingApiKeyError:
                logger.info("GEMINI_API_KEY not configured. AnswerEvaluator operating in offline rubric mode.")
                self.client = None
            except Exception as e:
                logger.warning("Could not initialize GeminiClient (%s). Operating in offline rubric mode.", e)
                self.client = None

    def evaluate_answer(
        self,
        question: str,
        answer: str,
        round_type: str = "technical",
        expected_criteria: Optional[List[str]] = None,
        rubric_weights: Optional[Dict[str, float]] = None
    ) -> AnswerEvaluationSchema:
        """Evaluates candidate response across criteria with 1-sentence justifications.
        
        CRITICAL RULE:
        - Uses Gemini for criterion evaluation and justifications.
        - Computes computed_score deterministically using Python code.
        """
        clean_round = (round_type or "technical").strip().lower()

        # If client not configured, evaluate offline
        if self.client is None or not self.client.is_configured():
            if clean_round == "hr":
                return DeterministicEvaluator.evaluate_hr_answer(question, answer)
            return DeterministicEvaluator.evaluate_technical_answer(question, answer, expected_criteria)

        prompt = f"""Evaluate candidate interview response.
Round Type: '{clean_round}'
Question Asked: {question}
Expected Criteria: {expected_criteria or []}
Candidate Answer: {answer}

STRICT PROMPT SAFETY DIRECTIVE:
You must NEVER evaluate, judge, score, infer, or comment upon candidate physical appearance, attire, facial expressions, background environment, gender, race, age, accent, or emotional state.
Evaluation is 100% merit-based and restricted exclusively to technical accuracy, structured storytelling, and verbal communication.

STRICT JUSTIFICATION DIRECTIVE:
For every evaluated criterion in the 'criteria' list, provide a 'justification' that is EXACTLY ONE concise sentence.

Return strictly valid JSON adhering to AnswerEvaluationSchema:
{{
  "criteria": [
    {{
      "criterion_name": "Technical Accuracy",
      "score": 85.0,
      "max_score": 100.0,
      "justification": "Candidate accurately detailed the reference counting mechanism and generational cycle detector."
    }},
    {{
      "criterion_name": "Architectural Depth",
      "score": 80.0,
      "max_score": 100.0,
      "justification": "Explained GIL bytecode serialization clearly with adequate memory layout context."
    }},
    {{
      "criterion_name": "Communication Clarity",
      "score": 90.0,
      "max_score": 100.0,
      "justification": "Communication was structured and utilized precise engineering vocabulary."
    }},
    {{
      "criterion_name": "Trade-offs & Edge Cases",
      "score": 75.0,
      "max_score": 100.0,
      "justification": "Highlighted I/O non-blocking releases but omitted discussion of multi-core CPU bound tasks."
    }}
  ],
  "strengths": ["Clear explanation of core data structures", "Precise terminology"],
  "improvements": ["Elaborate on edge case failure handling and latency trade-offs"]
}}"""

        sys_inst = (
            "You are a Lead Technical Interviewer and Talent Evaluator. "
            "Score candidate criteria objectively and provide exactly one concise sentence of justification per criterion. "
            "Never evaluate visual appearance or emotion."
        )

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=sys_inst,
            temperature=0.2
        )

        try:
            def _call():
                return self.client._client.models.generate_content(
                    model=self.client.model,
                    contents=prompt,
                    config=config
                )

            response = self.client._execute_with_retry(_call)
            raw_text = getattr(response, "text", None)
            if not raw_text:
                raise MalformedOutputError("Empty response text from model for answer evaluation.")

            raw_dict = self.client.clean_json_response(raw_text)
            parsed_eval = AnswerEvaluationSchema.model_validate(raw_dict)

            # CRITICAL RULE: Deterministic Python code computes the score!
            # Gemini cannot override the deterministic calculation.
            active_weights = rubric_weights or DEFAULT_CRITERIA_WEIGHTS.get(clean_round, DEFAULT_CRITERIA_WEIGHTS["technical"])
            deterministic_score = compute_round_score(parsed_eval.criteria, active_weights)

            return AnswerEvaluationSchema(
                criteria=parsed_eval.criteria,
                strengths=parsed_eval.strengths,
                improvements=parsed_eval.improvements,
                source="gemini",
                is_fallback=False,
                computed_score=deterministic_score
            )

        except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError) as auth_err:
            logger.warning(
                "Gemini authorization or quota issue encountered (%s). Seamlessly serving deterministic offline evaluation.",
                type(auth_err).__name__
            )
            if clean_round == "hr":
                return DeterministicEvaluator.evaluate_hr_answer(question, answer)
            return DeterministicEvaluator.evaluate_technical_answer(question, answer, expected_criteria)

        except Exception as exc:
            logger.warning(
                "Gemini evaluation failed (%s). Seamlessly serving deterministic offline evaluation.",
                type(exc).__name__
            )
            if clean_round == "hr":
                return DeterministicEvaluator.evaluate_hr_answer(question, answer)
            return DeterministicEvaluator.evaluate_technical_answer(question, answer, expected_criteria)

    def aggregate_interview_report(
        self,
        round_evaluations: Dict[str, List[AnswerEvaluationSchema]],
        round_weights: Optional[Dict[str, float]] = None
    ) -> EvaluationReportSchema:
        """Aggregates round evaluations into final report with deterministic scores and tier classification.
        
        CRITICAL RULE:
        - Round scores and overall weighted score are 100% computed by Python code.
        - Double-run exact equality guaranteed.
        """
        round_scores: Dict[str, float] = {}
        all_strengths: List[str] = []
        all_improvements: List[str] = []

        for r_name, evals in round_evaluations.items():
            if not evals:
                round_scores[r_name] = 0.0
                continue

            # Average computed_score across all answers in this round
            r_scores = [
                e.computed_score if e.computed_score is not None else compute_round_score(e.criteria)
                for e in evals
            ]
            round_scores[r_name] = round(sum(r_scores) / len(r_scores), 1)

            for e in evals:
                all_strengths.extend(e.strengths)
                all_improvements.extend(e.improvements)

        # Compute overall score deterministically
        overall_score = compute_overall_score(round_scores, round_weights or DEFAULT_ROUND_WEIGHTS)
        tier = determine_tier(overall_score)

        # Deduplicate strengths and improvements
        unique_strengths = list(dict.fromkeys(all_strengths))[:4] or ["Demonstrated foundational domain awareness."]
        unique_improvements = list(dict.fromkeys(all_improvements))[:4] or ["Continue practicing structured technical and behavioral responses."]

        # Structured improvement plan
        improvement_plan = [
            f"Phase 1: Deepen domain fundamentals in {', '.join(round_scores.keys())}.",
            "Phase 2: Practice STAR narrative structure and quantitative impact metrics.",
            "Phase 3: Tackle complex architectural trade-offs, edge cases, and failure mode analysis."
        ]

        summary = (
            f"Candidate achieved an overall score of {overall_score}/100 across {len(round_scores)} rounds, "
            f"placing them in the '{tier}' performance tier. Demonstrated strengths in {', '.join(unique_strengths[:2])}."
        )

        return EvaluationReportSchema(
            round_scores=round_scores,
            overall_score=overall_score,
            tier=tier,
            feedback_summary=summary,
            improvement_plan=improvement_plan
        )


evaluator = AnswerEvaluator()
