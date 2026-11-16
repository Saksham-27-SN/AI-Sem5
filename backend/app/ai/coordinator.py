import logging
from typing import Dict, Optional, List, Any
from backend.app.ai.schemas import (
    LabeledQuestion,
    ConversationTurn,
    SessionState,
    CoordinatorTurnResult
)
from backend.app.ai.echo_stripper import strip_ai_echo
from backend.app.ai.interviewer import LiveInterviewer

logger = logging.getLogger(__name__)


class InterviewCoordinator:
    """State machine and coordinator orchestrating live interview rounds.
    
    Guarantees:
    - Deterministically controls current round, question count, and difficulty transitions.
    - Strips AI-spoken echo from candidate speech-to-text transcripts.
    - Maintains conversational memory per session.
    - Gemini generates only question wording and adaptive follow-ups.
    """

    DIFFICULTY_TIERS = ["easy", "medium", "hard"]

    def __init__(self, interviewer: Optional[LiveInterviewer] = None):
        self.interviewer = interviewer or LiveInterviewer()
        self.sessions: Dict[str, SessionState] = {}

    # -----------------------------------------------------------------
    # SESSION & MEMORY MANAGEMENT
    # -----------------------------------------------------------------

    def get_or_create_session(
        self,
        session_id: str,
        round_type: str = "hr",
        domain: str = "General",
        difficulty: str = "medium",
        total_questions: int = 5
    ) -> SessionState:
        """Retrieves existing session memory or initializes a fresh deterministic state."""
        if session_id not in self.sessions:
            diff_clean = difficulty.strip().lower() if difficulty else "medium"
            if diff_clean not in self.DIFFICULTY_TIERS:
                diff_clean = "medium"

            self.sessions[session_id] = SessionState(
                session_id=session_id,
                round_type=(round_type or "hr").strip().lower(),
                domain=domain or "General",
                current_difficulty=diff_clean,
                current_question_index=0,
                total_questions=max(1, total_questions),
                is_completed=False,
                consecutive_follow_ups=0,
                history=[]
            )
        return self.sessions[session_id]

    def get_session_state(self, session_id: str) -> Optional[SessionState]:
        """Returns session state or None if not registered."""
        return self.sessions.get(session_id)

    def record_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        raw_content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Appends a dialogue turn to the session's conversation memory."""
        session = self.get_or_create_session(session_id)
        turn = ConversationTurn(
            role="interviewer" if role == "interviewer" else "candidate",
            content=content,
            raw_content=raw_content,
            metadata=metadata or {}
        )
        session.history.append(turn)

    # -----------------------------------------------------------------
    # STATE MACHINE & DIFFICULTY ADAPTATION
    # -----------------------------------------------------------------

    def adapt_difficulty(self, current_difficulty: str, score: float) -> str:
        """Deterministically adapts difficulty tier based on quantitative performance score.
        
        - Score >= 80.0 -> Promote (easy -> medium -> hard)
        - Score < 60.0  -> Demote (hard -> medium -> easy)
        - 60.0 <= Score < 80.0 -> Stable
        """
        cur = (current_difficulty or "medium").strip().lower()
        if cur not in self.DIFFICULTY_TIERS:
            cur = "medium"

        if score >= 80.0:
            if cur == "easy":
                return "medium"
            return "hard"
        elif score < 60.0:
            if cur == "hard":
                return "medium"
            return "easy"
        else:
            return cur

    def should_ask_follow_up(self, session: SessionState, cleaned_transcript: str) -> bool:
        """Determines whether an adaptive follow-up is warranted based on brevity or evasiveness.
        
        Enforces a hard limit of at most 1 consecutive follow-up to guarantee turn progression.
        """
        if session.consecutive_follow_ups >= 1:
            return False

        clean = (cleaned_transcript or "").strip()
        word_count = len(clean.split())
        lower = clean.lower()

        # Evasive cues
        evasive_cues = [
            "don't know", "do not know", "no idea", "not sure",
            "can't recall", "cannot recall", "skip", "pass",
            "someone else", "not me", "nothing specific"
        ]
        is_evasive = any(cue in lower for cue in evasive_cues)
        is_brief = word_count < 20

        return is_brief or is_evasive

    # -----------------------------------------------------------------
    # TURN LIFECYCLE & COORDINATION
    # -----------------------------------------------------------------

    def get_initial_question(
        self,
        session_id: str,
        round_type: str = "hr",
        domain: str = "General",
        difficulty: str = "medium",
        total_questions: int = 5
    ) -> LabeledQuestion:
        """Retrieves and records the initial question for an interview session."""
        session = self.get_or_create_session(
            session_id=session_id,
            round_type=round_type,
            domain=domain,
            difficulty=difficulty,
            total_questions=total_questions
        )

        question = self.interviewer.generate_question(
            round_type=session.round_type,
            difficulty=session.current_difficulty,
            domain=session.domain,
            index=0,
            history=session.history
        )

        session.current_question = question
        self.record_turn(
            session_id=session_id,
            role="interviewer",
            content=question.question,
            metadata={"source": question.source, "is_fallback": question.is_fallback}
        )
        return question

    def process_turn(
        self,
        session_id: str,
        raw_candidate_transcript: str,
        score: Optional[float] = None
    ) -> CoordinatorTurnResult:
        """Processes a candidate turn through echo-stripping, follow-up evaluation, and difficulty transition."""
        session = self.get_or_create_session(session_id)

        # 1. Termination check
        if session.is_completed:
            return CoordinatorTurnResult(
                session_id=session_id,
                next_action="completed",
                question=None,
                current_difficulty=session.current_difficulty,
                round_type=session.round_type,
                turn_index=session.current_question_index,
                total_questions=session.total_questions,
                cleaned_transcript=""
            )

        # 2. Echo-loop prevention: Strip AI echo from candidate speech
        current_q_text = session.current_question.question if session.current_question else None
        past_q_texts = [t.content for t in session.history if t.role == "interviewer"]
        cleaned_transcript = strip_ai_echo(
            candidate_transcript=raw_candidate_transcript,
            current_question=current_q_text,
            history_questions=past_q_texts
        )

        # 3. Record candidate turn in conversation memory
        self.record_turn(
            session_id=session_id,
            role="candidate",
            content=cleaned_transcript,
            raw_content=raw_candidate_transcript
        )

        # 4. Adapt difficulty immediately if score is provided
        if score is not None:
            session.current_difficulty = self.adapt_difficulty(session.current_difficulty, score)

        # 5. Check if adaptive follow-up is needed
        if self.should_ask_follow_up(session, cleaned_transcript):
            follow_up_q = self.interviewer.generate_follow_up(
                round_type=session.round_type,
                candidate_transcript=cleaned_transcript,
                parent_question=current_q_text,
                difficulty=session.current_difficulty,
                history=session.history
            )
            session.consecutive_follow_ups += 1
            session.current_question = follow_up_q

            # Record interviewer follow-up in memory
            self.record_turn(
                session_id=session_id,
                role="interviewer",
                content=follow_up_q.question,
                metadata={"source": follow_up_q.source, "is_fallback": follow_up_q.is_fallback, "is_follow_up": True}
            )

            return CoordinatorTurnResult(
                session_id=session_id,
                next_action="follow_up",
                question=follow_up_q,
                current_difficulty=session.current_difficulty,
                round_type=session.round_type,
                turn_index=session.current_question_index + 1,
                total_questions=session.total_questions,
                cleaned_transcript=cleaned_transcript
            )

        # 6. Question completed: Advance question counter
        session.consecutive_follow_ups = 0
        session.current_question_index += 1

        # 7. Check if interview is now completed
        if session.current_question_index >= session.total_questions:
            session.is_completed = True
            session.current_question = None
            return CoordinatorTurnResult(
                session_id=session_id,
                next_action="completed",
                question=None,
                current_difficulty=session.current_difficulty,
                round_type=session.round_type,
                turn_index=session.current_question_index,
                total_questions=session.total_questions,
                cleaned_transcript=cleaned_transcript
            )

        # 8. Generate next question for adapted difficulty
        next_q = self.interviewer.generate_question(
            round_type=session.round_type,
            difficulty=session.current_difficulty,
            domain=session.domain,
            index=session.current_question_index,
            history=session.history
        )
        session.current_question = next_q

        # Record interviewer question in memory
        self.record_turn(
            session_id=session_id,
            role="interviewer",
            content=next_q.question,
            metadata={"source": next_q.source, "is_fallback": next_q.is_fallback}
        )

        return CoordinatorTurnResult(
            session_id=session_id,
            next_action="next_question",
            question=next_q,
            current_difficulty=session.current_difficulty,
            round_type=session.round_type,
            turn_index=session.current_question_index,
            total_questions=session.total_questions,
            cleaned_transcript=cleaned_transcript
        )


coordinator = InterviewCoordinator()
