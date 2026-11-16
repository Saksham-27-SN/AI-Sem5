import json
import logging
import re
from typing import List, Dict, Any, Optional, Set
from google.genai import types

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
    QuotaExceededError,
    MalformedOutputError,
    GeminiClientError
)

logger = logging.getLogger(__name__)


# =====================================================================
# STEM NORMALIZATION FOR DUPLICATE REJECTION
# =====================================================================

def normalize_stem(stem: str) -> str:
    """Normalizes question stem for duplicate comparison (removes punctuation, lowercases, trims)."""
    if not stem:
        return ""
    cleaned = re.sub(r"[^\w\s]", "", stem.lower())
    return " ".join(cleaned.split())


# =====================================================================
# PRE-VALIDATED OFFLINE QUIZ BANK
# =====================================================================

class OfflineQuizBank:
    """Curated, high-fidelity offline quiz bank.
    
    All questions strictly adhere to QuizQuestionSchema (4 unique options,
    0 <= correct_index < 4) and are labeled with source='offline_bank' and is_fallback=True.
    """

    QUESTIONS: List[Dict[str, Any]] = [
        # --- Quantitative Aptitude ---
        {
            "id": "apt_quant_01",
            "stem": "A train 240 meters long passes a pole in 24 seconds. How long will it take to pass a platform 650 meters long?",
            "options": [
                "65 seconds",
                "89 seconds",
                "100 seconds",
                "150 seconds"
            ],
            "correct_index": 1,
            "explanation": "Speed of train = 240 / 24 = 10 m/s. Total distance for platform = 240 + 650 = 890 meters. Time taken = 890 / 10 = 89 seconds.",
            "topic": "Quantitative Aptitude",
            "difficulty": "medium"
        },
        {
            "id": "apt_quant_02",
            "stem": "A and B together can complete a work in 12 days, while B alone can finish it in 30 days. In how many days can A alone finish the work?",
            "options": [
                "15 days",
                "18 days",
                "20 days",
                "25 days"
            ],
            "correct_index": 2,
            "explanation": "1/A + 1/30 = 1/12 => 1/A = 1/12 - 1/30 = (5 - 2)/60 = 3/60 = 1/20. Thus, A alone takes 20 days.",
            "topic": "Quantitative Aptitude",
            "difficulty": "easy"
        },
        {
            "id": "apt_quant_03",
            "stem": "Two dice are rolled simultaneously. What is the probability that the sum of the numbers appearing on the dice is a prime number?",
            "options": [
                "5/12",
                "7/18",
                "1/2",
                "13/36"
            ],
            "correct_index": 0,
            "explanation": "Possible prime sums are 2, 3, 5, 7, 11. Sum 2: 1 pair; Sum 3: 2 pairs; Sum 5: 4 pairs; Sum 7: 6 pairs; Sum 11: 2 pairs. Total outcomes = 15. Probability = 15/36 = 5/12.",
            "topic": "Quantitative Aptitude",
            "difficulty": "hard"
        },
        {
            "id": "apt_quant_04",
            "stem": "If the price of a commodity increases by 25%, by what percentage must a household reduce its consumption so that the total expenditure remains unchanged?",
            "options": [
                "15%",
                "20%",
                "25%",
                "30%"
            ],
            "correct_index": 1,
            "explanation": "Reduction percentage = [R / (100 + R)] * 100 = [25 / 125] * 100 = 20%.",
            "topic": "Quantitative Aptitude",
            "difficulty": "easy"
        },
        {
            "id": "apt_quant_05",
            "stem": "A boat can travel with a speed of 13 km/hr in still water. If the speed of the stream is 4 km/hr, find the time taken by the boat to go 68 km downstream.",
            "options": [
                "3 hours",
                "4 hours",
                "5 hours",
                "6 hours"
            ],
            "correct_index": 1,
            "explanation": "Downstream speed = 13 + 4 = 17 km/hr. Time taken = 68 / 17 = 4 hours.",
            "topic": "Quantitative Aptitude",
            "difficulty": "medium"
        },
        {
            "id": "apt_quant_06",
            "stem": "In how many different ways can the letters of the word 'LEADING' be arranged in such a way that the vowels always come together?",
            "options": [
                "360",
                "480",
                "720",
                "5040"
            ],
            "correct_index": 2,
            "explanation": "Vowels are E, A, I (3 vowels). Treat (E, A, I) as 1 unit. Total units = L, D, N, G + (EAI) = 5 units. Arrangements = 5! * 3! = 120 * 6 = 720.",
            "topic": "Quantitative Aptitude",
            "difficulty": "medium"
        },
        {
            "id": "apt_quant_07",
            "stem": "A sum of money placed at compound interest doubles itself in 4 years. In how many years will it amount to 8 times itself at the same rate?",
            "options": [
                "8 years",
                "12 years",
                "16 years",
                "24 years"
            ],
            "correct_index": 1,
            "explanation": "8 = 2^3. Since it doubles in 4 years, it becomes 2^3 times in 4 * 3 = 12 years.",
            "topic": "Quantitative Aptitude",
            "difficulty": "medium"
        },

        # --- Logical Reasoning ---
        {
            "id": "apt_logic_01",
            "stem": "Look at this series: 7, 10, 8, 11, 9, 12, ... What number should come next?",
            "options": [
                "7",
                "10",
                "12",
                "13"
            ],
            "correct_index": 1,
            "explanation": "It is an alternating addition and subtraction series: +3, -2, +3, -2, +3, -2. 12 - 2 = 10.",
            "topic": "Logical Reasoning",
            "difficulty": "easy"
        },
        {
            "id": "apt_logic_02",
            "stem": "In a certain code, COMPUTER is written as RFUVQNPC. How is MEDICINE written in that same code?",
            "options": [
                "EOJDJEFM",
                "EOJDEJFM",
                "MFEDJJOE",
                "MFEJDJOE"
            ],
            "correct_index": 0,
            "explanation": "Reverse the word, keep the first and last letters swapped or shifted: each intermediate letter is replaced by its successor, yielding EOJDJEFM.",
            "topic": "Logical Reasoning",
            "difficulty": "medium"
        },
        {
            "id": "apt_logic_03",
            "stem": "Statements: (1) All mangoes are golden in color. (2) No golden colored things are cheap. Conclusions: (I) All mangoes are cheap. (II) Golden-colored mangoes are not cheap.",
            "options": [
                "Only conclusion I follows",
                "Only conclusion II follows",
                "Either I or II follows",
                "Neither I nor II follows"
            ],
            "correct_index": 1,
            "explanation": "Since all mangoes are golden and golden things are not cheap, golden-colored mangoes are not cheap. Thus only II follows.",
            "topic": "Logical Reasoning",
            "difficulty": "medium"
        },

        # --- Technical: Python ---
        {
            "id": "tech_py_01",
            "stem": "Which of the following data structures in Python is mutable?",
            "options": [
                "tuple",
                "frozenset",
                "bytearray",
                "str"
            ],
            "correct_index": 2,
            "explanation": "bytearray is a mutable sequence of integers in range 0 <= x < 256. tuple, frozenset, and str are immutable.",
            "topic": "Python",
            "difficulty": "easy"
        },
        {
            "id": "tech_py_02",
            "stem": "What is the primary role of the Global Interpreter Lock (GIL) in CPython?",
            "options": [
                "To optimize CPU-bound multithreaded performance across multi-core processors",
                "To synchronize thread execution so only one thread executes Python bytecode at a time",
                "To prevent circular references in Python's garbage collection",
                "To automatically compile Python bytecode into native machine assembly"
            ],
            "correct_index": 1,
            "explanation": "The GIL is a mutex that prevents multiple native OS threads from executing CPython bytecodes at once, ensuring thread-safe CPython memory management.",
            "topic": "Python",
            "difficulty": "medium"
        },
        {
            "id": "tech_py_03",
            "stem": "In modern Python (PEP 468), how are dictionary keys ordered and stored in memory?",
            "options": [
                "Sorted alphabetically using red-black trees",
                "Ordered by insertion sequence via a compact indices array and entries table",
                "Shuffled pseudo-randomly to avoid hash collisions",
                "Grouped by hash modulo buckets with linked collision chains"
            ],
            "correct_index": 1,
            "explanation": "Python dicts preserve insertion order using a compact array of sparse indices pointing into a dense entries array storing hash, key, and value.",
            "topic": "Python",
            "difficulty": "hard"
        },

        # --- Technical: DSA ---
        {
            "id": "tech_dsa_01",
            "stem": "What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL or Red-Black Tree) containing N nodes?",
            "options": [
                "O(1)",
                "O(log N)",
                "O(N)",
                "O(N log N)"
            ],
            "correct_index": 1,
            "explanation": "Because balanced BSTs maintain a height of O(log N), the worst-case search, insertion, and deletion complexity is strictly O(log N).",
            "topic": "DSA",
            "difficulty": "easy"
        },
        {
            "id": "tech_dsa_02",
            "stem": "Which sorting algorithm is guaranteed to have O(N log N) worst-case time complexity, operates in-place with O(1) auxiliary space, but is NOT stable?",
            "options": [
                "Merge Sort",
                "Quick Sort",
                "Heap Sort",
                "Radix Sort"
            ],
            "correct_index": 2,
            "explanation": "Heap Sort achieves O(N log N) worst-case time and O(1) auxiliary space, but is an unstable sort.",
            "topic": "DSA",
            "difficulty": "medium"
        },
        {
            "id": "tech_dsa_03",
            "stem": "In Dijkstra's single-source shortest path algorithm implemented using a binary min-heap on a graph with V vertices and E edges, what is the tight asymptotic time complexity?",
            "options": [
                "O(V^2)",
                "O((V + E) log V)",
                "O(V * E)",
                "O(E log E + V)"
            ],
            "correct_index": 1,
            "explanation": "With a binary min-heap, extracting min takes O(log V) per vertex and decreasing keys takes O(log V) per edge, resulting in O((V + E) log V).",
            "topic": "DSA",
            "difficulty": "hard"
        },

        # --- Technical: Databases & Systems ---
        {
            "id": "tech_db_01",
            "stem": "Why are B+ Trees overwhelmingly preferred over B Trees for storage engines in relational databases like PostgreSQL and MySQL InnoDB?",
            "options": [
                "B+ Trees consume significantly less memory because they do not use balance factors",
                "All data records are stored exclusively in leaf nodes linked sequentially, facilitating fast range scans and higher fan-out",
                "B+ Trees eliminate the need for write-ahead logging (WAL)",
                "B+ Trees execute search queries in O(1) constant time"
            ],
            "correct_index": 1,
            "explanation": "B+ Trees store records only in leaf nodes connected by a linked list, which maximizes internal node branching fan-out and enables rapid sequential range scans.",
            "topic": "DBMS",
            "difficulty": "medium"
        },
        {
            "id": "tech_sys_01",
            "stem": "Which of the following is NOT one of Coffman's four necessary conditions for a deadlock to occur in an operating system?",
            "options": [
                "Mutual Exclusion",
                "Hold and Wait",
                "Preemptive Scheduling",
                "Circular Wait"
            ],
            "correct_index": 2,
            "explanation": "The four Coffman conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Preemptive Scheduling prevents deadlocks, rather than causing them.",
            "topic": "Operating Systems",
            "difficulty": "medium"
        }
    ]

    @classmethod
    def get_question(
        cls,
        topic: str = "Quantitative Aptitude",
        difficulty: str = "medium",
        existing_stems: Optional[List[str]] = None,
        index: int = 0
    ) -> LabeledQuizQuestion:
        """Retrieves a pre-validated question from the offline bank, avoiding existing stems if possible."""
        clean_topic = (topic or "").strip().lower()
        clean_diff = (difficulty or "medium").strip().lower()
        existing_norms = {normalize_stem(s) for s in (existing_stems or []) if s}

        # Filter candidate pool
        matching_topic = [
            q for q in cls.QUESTIONS
            if clean_topic in q["topic"].lower() or q["topic"].lower() in clean_topic
        ]
        if not matching_topic:
            matching_topic = cls.QUESTIONS

        matching_diff = [q for q in matching_topic if q["difficulty"].lower() == clean_diff]
        pool = matching_diff if matching_diff else matching_topic

        # Prefer non-duplicate stem: first from pool, then from topic, then all questions
        non_dupes = [q for q in pool if normalize_stem(q["stem"]) not in existing_norms]
        if not non_dupes:
            non_dupes = [q for q in matching_topic if normalize_stem(q["stem"]) not in existing_norms]
        if not non_dupes:
            non_dupes = [q for q in cls.QUESTIONS if normalize_stem(q["stem"]) not in existing_norms]

        selected_list = non_dupes if non_dupes else pool
        selected = selected_list[index % len(selected_list)]

        return LabeledQuizQuestion(
            stem=selected["stem"],
            options=list(selected["options"]),
            correct_index=selected["correct_index"],
            explanation=selected["explanation"],
            topic=selected["topic"],
            difficulty=selected["difficulty"],
            source="offline_bank",
            is_fallback=True,
            id=selected.get("id")
        )

    @classmethod
    def get_all_questions(cls) -> List[LabeledQuizQuestion]:
        """Returns all questions in the bank as LabeledQuizQuestion instances."""
        return [
            LabeledQuizQuestion(
                stem=q["stem"],
                options=list(q["options"]),
                correct_index=q["correct_index"],
                explanation=q["explanation"],
                topic=q["topic"],
                difficulty=q["difficulty"],
                source="offline_bank",
                is_fallback=True,
                id=q.get("id")
            )
            for q in cls.QUESTIONS
        ]


offline_quiz_bank = OfflineQuizBank()


# =====================================================================
# DETERMINISTIC ANSWER KEY SCORING (NO LLM CALLED AT GRADING TIME)
# =====================================================================

def grade_quiz_answer(
    question: QuizQuestionSchema,
    selected_index: int
) -> QuizGradingResult:
    """Evaluates candidate MCQ answer deterministically against stored correct_index answer key.
    
    Guarantees:
    - 100% deterministic O(1) evaluation.
    - The LLM is NEVER invoked at grading time.
    """
    is_correct = int(selected_index) == int(question.correct_index)
    score = 100.0 if is_correct else 0.0
    return QuizGradingResult(
        is_correct=is_correct,
        score=score,
        correct_index=question.correct_index,
        selected_index=selected_index,
        explanation=question.explanation
    )


def grade_quiz_submission(
    questions: List[QuizQuestionSchema],
    selected_indices: List[int]
) -> QuizBatchGradingResult:
    """Evaluates an entire quiz submission deterministically.
    
    Guarantees:
    - Strict mathematical grading against stored answer keys.
    - The LLM is NEVER called.
    """
    if len(questions) != len(selected_indices):
        raise ValueError(
            f"Mismatched lengths: {len(questions)} questions vs {len(selected_indices)} selected indices."
        )

    results: List[QuizGradingResult] = []
    correct_count = 0

    for q, sel in zip(questions, selected_indices):
        res = grade_quiz_answer(q, sel)
        results.append(res)
        if res.is_correct:
            correct_count += 1

    total = len(questions)
    percentage = round((correct_count / total) * 100.0, 1) if total > 0 else 0.0

    return QuizBatchGradingResult(
        total_questions=total,
        correct_count=correct_count,
        score_percentage=percentage,
        results=results
    )


# =====================================================================
# QUIZ GENERATOR ENGINE
# =====================================================================

class QuizGenerator:
    """Gemini Pro Quiz & MCQ generation engine.
    
    Guarantees:
    - Generates MCQs adhering to QuizQuestionSchema.
    - Validates: 4 unique options, valid correct_index (0 <= i < 4), non-duplicate stem.
    - Discards invalid failures and retries up to 1 time.
    - Seamlessly falls back to labeled offline question bank if API key is missing or invalid.
    - Evaluates submissions with 100% deterministic grading without calling LLM.
    """

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        if gemini_client is not None:
            self.client = gemini_client
        else:
            try:
                self.client = GeminiClient(strict_init=True)
            except MissingApiKeyError:
                logger.info("GEMINI_API_KEY not configured. QuizGenerator operating in offline bank mode.")
                self.client = None
            except Exception as e:
                logger.warning("Could not initialize GeminiClient (%s). Operating in offline bank mode.", e)
                self.client = None

    def _validate_raw_dict(
        self,
        raw_dict: Dict[str, Any],
        existing_norms: Set[str]
    ) -> QuizQuestionSchema:
        """Validates raw dictionary into QuizQuestionSchema, rejecting duplicates."""
        # 1. Pydantic schema validation (options count, uniqueness, correct_index bounds)
        schema = QuizQuestionSchema.model_validate(raw_dict)

        # 2. Duplicate stem rejection against existing bank
        norm = normalize_stem(schema.stem)
        if norm in existing_norms:
            raise ValueError(f"Duplicate question stem detected: '{schema.stem[:40]}...' matches existing question in session.")

        return schema

    def generate_quiz_question(
        self,
        topic: str = "Quantitative Aptitude",
        difficulty: str = "medium",
        existing_stems: Optional[List[str]] = None,
        index: int = 0
    ) -> LabeledQuizQuestion:
        """Generates a single MCQ with strict validation and 1-retry failure handling.
        
        If Gemini is unavailable or fails validation twice, falls back to labeled offline bank.
        """
        clean_topic = topic or "Quantitative Aptitude"
        clean_diff = (difficulty or "medium").strip().lower()
        if clean_diff not in ("easy", "medium", "hard"):
            clean_diff = "medium"

        existing_norms: Set[str] = {normalize_stem(s) for s in (existing_stems or []) if s}

        # If client not configured, immediately return pre-validated offline question
        if self.client is None or not self.client.is_configured():
            return offline_quiz_bank.get_question(
                topic=clean_topic,
                difficulty=clean_diff,
                existing_stems=existing_stems,
                index=index
            )

        prompt = f"""Generate a high-quality Multiple Choice Question (MCQ) for topic '{clean_topic}'.
Difficulty tier: '{clean_diff}'

Strict Generation & Validation Rules:
1. Provide exactly 4 distinct, plausible, and mutually exclusive options in the 'options' list.
2. Ensure there are NO duplicate or synonymous options (all 4 options must be strictly unique).
3. Specify 'correct_index' as an integer strictly between 0 and 3 (0 <= correct_index < 4) pointing to the single correct option.
4. Provide a clear, step-by-step 'explanation' justifying why that option is correct.
5. The 'stem' must pose a clear problem, puzzle, or conceptual question.

Return strictly valid JSON matching this schema:
{{
  "stem": "question statement or problem",
  "options": ["option 0", "option 1", "option 2", "option 3"],
  "correct_index": 0,
  "explanation": "step by step explanation",
  "topic": "{clean_topic}",
  "difficulty": "{clean_diff}"
}}"""

        sys_inst = (
            "You are a Senior Psychometrician and Technical Assessment Creator. "
            "You generate perfectly calibrated MCQs with exactly 4 unique options and exactly 1 correct index. "
            "Output strictly valid JSON conforming to QuizQuestionSchema."
        )

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=sys_inst,
            temperature=0.3
        )

        # Attempt generation with up to 1 retry on validation failure
        attempts = 0
        max_attempts = 2  # initial attempt + 1 retry

        while attempts < max_attempts:
            attempts += 1
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
                    raise MalformedOutputError("Empty text received from model for quiz question.")

                raw_dict = self.client.clean_json_response(raw_text)
                validated = self._validate_raw_dict(raw_dict, existing_norms)

                # Successfully generated and validated
                return LabeledQuizQuestion(
                    stem=validated.stem,
                    options=validated.options,
                    correct_index=validated.correct_index,
                    explanation=validated.explanation,
                    topic=validated.topic,
                    difficulty=validated.difficulty,
                    source="gemini",
                    is_fallback=False
                )

            except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError) as auth_err:
                # Auth/quota errors shouldn't retry generation; fall back immediately
                logger.warning(
                    "Gemini API key error or quota exceeded (%s). Seamlessly serving labeled offline fallback.",
                    type(auth_err).__name__
                )
                return offline_quiz_bank.get_question(
                    topic=clean_topic,
                    difficulty=clean_diff,
                    existing_stems=existing_stems,
                    index=index
                )
            except Exception as failure:
                logger.warning(
                    "Quiz question generation attempt %d/%d failed validation: %s. Discarding failure...",
                    attempts, max_attempts, failure
                )
                if attempts < max_attempts:
                    continue  # Retry up to 1 time

        # If both attempts failed validation, fall back to offline bank
        logger.warning(
            "Quiz generation attempts exhausted. Serving pre-validated offline quiz fallback."
        )
        return offline_quiz_bank.get_question(
            topic=clean_topic,
            difficulty=clean_diff,
            existing_stems=existing_stems,
            index=index
        )

    def generate_quiz_test(
        self,
        topic: str = "Quantitative Aptitude",
        count: int = 5,
        difficulty: str = "medium"
    ) -> List[LabeledQuizQuestion]:
        """Generates a complete quiz test of 'count' questions ensuring no duplicate stems across the test."""
        questions: List[LabeledQuizQuestion] = []
        existing_stems: List[str] = []

        for i in range(count):
            q = self.generate_quiz_question(
                topic=topic,
                difficulty=difficulty,
                existing_stems=existing_stems,
                index=i
            )
            questions.append(q)
            existing_stems.append(q.stem)

        return questions


quiz_generator = QuizGenerator()
