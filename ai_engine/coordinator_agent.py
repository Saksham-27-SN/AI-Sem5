from typing import Dict, Any, Optional, List
from ai_engine.hr_agent import HRAgent
from ai_engine.technical_agent import TechnicalAgent
from ai_engine.aptitude_agent import AptitudeAgent
from ai_engine.resume_agent import ResumeAgent
from ai_engine.evaluation_agent import EvaluationAgent

class CoordinatorAgent:
    """Orchestrates multi-agent transitions, state machine progression, and adaptive difficulty."""

    DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

    def __init__(self):
        self.hr_agent = HRAgent()
        self.technical_agent = TechnicalAgent()
        self.aptitude_agent = AptitudeAgent()
        self.resume_agent = ResumeAgent()
        self.evaluation_agent = EvaluationAgent()

    def adapt_difficulty(self, current_difficulty: str, score: float) -> str:
        """State machine transition for difficulty based on performance score."""
        current = (current_difficulty or "medium").lower().strip()
        if current not in self.DIFFICULTY_LEVELS:
            current = "medium"

        if score >= 85.0:
            # Promote difficulty
            if current == "easy":
                return "medium"
            elif current == "medium":
                return "hard"
            else:
                return "hard"
        elif score < 60.0:
            # Demote difficulty
            if current == "hard":
                return "medium"
            elif current == "medium":
                return "easy"
            else:
                return "easy"
        else:
            # Maintain difficulty
            return current

    def get_initial_question(
        self,
        interview_type: str,
        domain: str,
        difficulty: str = "medium",
        resume_summary: Optional[str] = None,
        skills: Optional[list] = None,
        projects: Optional[list] = None
    ) -> Dict[str, Any]:
        """Routes initial question retrieval to the appropriate domain agent."""
        itype = (interview_type or "").lower().strip()
        diff = (difficulty or "medium").lower().strip()
        if itype == "hr":
            return self.hr_agent.get_question(index=0, difficulty=diff)
        elif itype == "technical":
            return self.technical_agent.get_question(domain=domain, index=0, difficulty=diff)
        elif itype == "resume":
            return self.resume_agent.generate_grounded_question(
                resume_summary=resume_summary or "Candidate with modern software engineering experience.",
                skills=skills or ["Python", "FastAPI", "System Architecture"],
                index=0,
                projects=projects,
                difficulty=diff
            )
        elif itype == "aptitude":
            return self.aptitude_agent.get_question(index=0, difficulty=diff)
        else:
            return self.hr_agent.get_question(index=0, difficulty=diff)

    def process_turn(
        self,
        interview_type: str,
        domain: str,
        current_question_index: int,
        total_questions: int,
        current_question: Dict[str, Any],
        answer_text: str,
        prior_score: float = 75.0,
        resume_summary: Optional[str] = None,
        skills: Optional[list] = None,
        projects: Optional[list] = None
    ) -> Dict[str, Any]:
        """Evaluates answer, decides follow-up or next question, and adapts difficulty."""
        itype = (interview_type or "hr").lower().strip()
        expected = current_question.get("expected_criteria", [])
        current_difficulty = current_question.get("difficulty", "medium")

        # 1. Evaluate current answer via specialized agent
        if itype == "technical":
            eval_res = self.technical_agent.evaluate_answer(current_question["question_text"], answer_text, expected)
        elif itype == "resume":
            # Resume deep-dive evaluates technical grounding
            eval_res = self.technical_agent.evaluate_answer(current_question["question_text"], answer_text, expected)
        elif itype == "aptitude":
            eval_res = self.aptitude_agent.grade_single_answer(current_question["question_text"], answer_text)
        else:
            eval_res = self.hr_agent.evaluate_answer(current_question["question_text"], answer_text, expected)

        answer_score = float(eval_res.get("score", 75.0))

        # 2. State Machine: Adapt Difficulty
        adapted_difficulty = self.adapt_difficulty(current_difficulty, answer_score)

        # 3. Check interview termination condition
        # If current question index has reached total_questions, complete the session
        if current_question_index >= total_questions:
            return {
                "evaluation": eval_res,
                "next_action": "completed",
                "next_question": None,
                "current_difficulty": adapted_difficulty
            }

        # 4. Follow-up State Routing:
        # Check if current question was already a follow-up or round is aptitude (aptitude doesn't follow up)
        is_current_follow_up = current_question.get("is_follow_up", False)
        if not is_current_follow_up and itype != "aptitude":
            follow_up_decision: Dict[str, Any] = {}
            if itype == "hr":
                follow_up_decision = self.hr_agent.should_ask_follow_up(answer_text, current_question["question_text"])
            elif itype in ("technical", "resume"):
                follow_up_decision = self.technical_agent.should_ask_follow_up(answer_text, current_question["question_text"])

            if follow_up_decision.get("needs_follow_up") and follow_up_decision.get("follow_up_question"):
                return {
                    "evaluation": eval_res,
                    "next_action": "follow_up",
                    "next_question": {
                        "question_text": follow_up_decision["follow_up_question"],
                        "category": current_question.get("category", "Follow-up"),
                        "difficulty": adapted_difficulty,
                        "expected_criteria": ["Concrete evidence, edge cases, and retrospective depth"],
                        "is_follow_up": True
                    },
                    "current_difficulty": adapted_difficulty
                }

        # 5. Fetch next question matching adapted difficulty
        next_bank_index = current_question_index
        if itype == "technical":
            next_q = self.technical_agent.get_question(domain, next_bank_index, adapted_difficulty)
        elif itype == "resume":
            next_q = self.resume_agent.generate_grounded_question(
                resume_summary=resume_summary or "Candidate with modern software engineering experience.",
                skills=skills or ["Python", "System Design"],
                index=next_bank_index,
                projects=projects,
                difficulty=adapted_difficulty
            )
        elif itype == "aptitude":
            next_q = self.aptitude_agent.get_question(next_bank_index, adapted_difficulty)
        else:
            next_q = self.hr_agent.get_question(next_bank_index, adapted_difficulty)

        next_q["is_follow_up"] = False
        next_q["difficulty"] = adapted_difficulty

        return {
            "evaluation": eval_res,
            "next_action": "next_question",
            "next_question": next_q,
            "current_difficulty": adapted_difficulty
        }

coordinator_agent = CoordinatorAgent()
