import re
from typing import Optional, List


class EchoStripper:
    """Detects and strips AI speech echo from candidate speech-to-text transcripts."""

    PREFIX_PATTERNS = [
        r"^(?:interviewer|ai|system|assistant|bot|interviewer\s+ai)\s*:\s*",
        r"^(?:candidate|user|student|interviewee)\s*:\s*",
    ]

    INLINE_ROLE_SPLITTERS = [
        r"(?:candidate|user|interviewee)\s*:\s*",
        r"(?:my answer is|i would say that|i would say)\s*:\s*"
    ]

    @classmethod
    def normalize_for_matching(cls, text: str) -> str:
        """Normalizes text for fuzzy phrase comparison (lowercased, punctuation removed, single-spaced)."""
        if not text:
            return ""
        # Remove punctuation, convert to lowercase, normalize whitespace
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        return " ".join(cleaned.split())

    @classmethod
    def strip_prefixes(cls, text: str) -> str:
        """Strips leading speaker/role prefixes like 'Interviewer:' or 'AI:'."""
        cleaned = text.strip()
        changed = True
        while changed:
            changed = False
            for pattern in cls.PREFIX_PATTERNS:
                sub = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
                if sub != cleaned:
                    cleaned = sub
                    changed = True
        return cleaned

    @classmethod
    def strip_inline_dialogue(cls, text: str) -> str:
        """If transcript contains 'Interviewer: ... Candidate: ...' or 'AI: Question? Answer', extract the candidate portion."""
        cleaned = text.strip()
        for splitter in cls.INLINE_ROLE_SPLITTERS:
            parts = re.split(splitter, cleaned, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) > 1 and parts[1].strip():
                return parts[1].strip()

        # Check if transcript starts with AI/Interviewer role prefix followed by an AI prompt ending in punctuation
        ai_prompt_match = re.match(
            r"^(?:interviewer|ai|system|assistant|bot|interviewer\s+ai)\s*:\s*([^.?!]+[.?!])\s*(.+)$",
            cleaned,
            flags=re.IGNORECASE | re.DOTALL
        )
        if ai_prompt_match:
            candidate_part = ai_prompt_match.group(2).strip()
            if candidate_part:
                return candidate_part

        return cleaned

    @classmethod
    def strip_question_echo(cls, candidate_text: str, question_text: Optional[str]) -> str:
        """Removes verbatim or near-verbatim repetition of the question from candidate transcript."""
        if not candidate_text or not question_text:
            return candidate_text

        text = candidate_text.strip()
        q_clean = question_text.strip()

        # 1. Exact match (case-insensitive) at the beginning
        if text.lower().startswith(q_clean.lower()):
            text = text[len(q_clean):].strip()
            text = re.sub(r"^[\s\.,?!:;\-]+", "", text).strip()
            return text

        # 2. Normalized check without punctuation
        norm_text = cls.normalize_for_matching(text)
        norm_q = cls.normalize_for_matching(q_clean)

        if not norm_q:
            return text

        # If the entire transcript is just the echoed question
        if norm_text == norm_q:
            return ""

        # If normalized text begins with normalized question
        if norm_text.startswith(norm_q):
            # Calculate word boundary in original text
            q_words = norm_q.split()
            orig_words = text.split()
            if len(orig_words) >= len(q_words):
                remaining = orig_words[len(q_words):]
                return " ".join(remaining).strip()

        # 3. Sub-sentence matching: check if first sentence matches question
        sentences = re.split(r"(?<=[.?!])\s+", text)
        if len(sentences) > 1:
            first_sentence_norm = cls.normalize_for_matching(sentences[0])
            if first_sentence_norm and (first_sentence_norm == norm_q or first_sentence_norm in norm_q or norm_q in first_sentence_norm):
                return " ".join(sentences[1:]).strip()

        return text

    @classmethod
    def strip_ai_echo(
        cls,
        candidate_transcript: str,
        current_question: Optional[str] = None,
        history_questions: Optional[List[str]] = None
    ) -> str:
        """Master function to sanitize candidate transcripts and ensure zero AI echo-loops.
        
        Guarantees:
        - Candidate transcript contains only candidate speech.
        - Strips any AI-spoken prompts, role headers, or echo fragments.
        """
        if not candidate_transcript:
            return ""

        text = candidate_transcript.strip()

        # Step 1: Check for inline dialogue ("Interviewer: ... Candidate: ...")
        text = cls.strip_inline_dialogue(text)

        # Step 2: Strip role prefixes ("Interviewer:", "AI:")
        text = cls.strip_prefixes(text)

        # Step 3: Strip current question echo
        if current_question:
            text = cls.strip_question_echo(text, current_question)

        # Step 4: Strip any historical question echoes if present
        if history_questions:
            for past_q in history_questions:
                if past_q:
                    text = cls.strip_question_echo(text, past_q)

        # Step 5: Final cleanup of prefixes and punctuation
        text = cls.strip_prefixes(text)
        text = re.sub(r"^[\s\.,?!:;\-]+", "", text).strip()

        return text


def strip_ai_echo(
    candidate_transcript: str,
    current_question: Optional[str] = None,
    history_questions: Optional[List[str]] = None
) -> str:
    """Convenience functional wrapper for EchoStripper.strip_ai_echo."""
    return EchoStripper.strip_ai_echo(candidate_transcript, current_question, history_questions)
