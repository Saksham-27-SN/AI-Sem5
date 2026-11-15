from typing import Dict, Any, List, Optional
from ai_engine.base import BaseAgent

class AptitudeAgent(BaseAgent):
    """Generates verified MCQs and executes deterministic grading for aptitude rounds."""

    VERIFIED_APTITUDE_BANK: List[Dict[str, Any]] = [
        # --- Quantitative Aptitude ---
        {
            "id": "apt_q1",
            "category": "Quantitative Aptitude",
            "difficulty": "medium",
            "question": "A train 180 meters long is running at a speed of 54 km/h. How many seconds will it take to pass a standing man on a platform?",
            "options": {
                "A": "10 seconds",
                "B": "12 seconds",
                "C": "14 seconds",
                "D": "15 seconds"
            },
            "correct_option": "B",
            "explanation": "Speed = 54 * (5/18) = 15 m/s. Time to cross a point object = Distance / Speed = 180 / 15 = 12 seconds."
        },
        {
            "id": "apt_q2",
            "category": "Quantitative Aptitude",
            "difficulty": "easy",
            "question": "If the price of an item increases by 25%, by what percentage must a consumer reduce consumption to keep total expenditure unchanged?",
            "options": {
                "A": "20%",
                "B": "25%",
                "C": "30%",
                "D": "15%"
            },
            "correct_option": "A",
            "explanation": "Formula: (R / (100 + R)) * 100 = (25 / 125) * 100 = 20% reduction."
        },
        {
            "id": "apt_q3",
            "category": "Quantitative Aptitude",
            "difficulty": "medium",
            "question": "A and B can complete a work together in 12 days. A alone can complete it in 20 days. If B works alone, in how many days can B finish the work?",
            "options": {
                "A": "25 days",
                "B": "30 days",
                "C": "35 days",
                "D": "40 days"
            },
            "correct_option": "B",
            "explanation": "1/B = 1/12 - 1/20 = (5 - 3)/60 = 2/60 = 1/30. B takes 30 days."
        },
        {
            "id": "apt_q4",
            "category": "Quantitative Aptitude",
            "difficulty": "hard",
            "question": "A bag contains 4 red, 5 green, and 6 blue balls. If two balls are drawn at random without replacement, what is the probability that both are green?",
            "options": {
                "A": "2/21",
                "B": "1/7",
                "C": "2/15",
                "D": "1/21"
            },
            "correct_option": "A",
            "explanation": "Total balls = 15. Probability = (5/15) * (4/14) = (1/3) * (2/7) = 2/21."
        },
        {
            "id": "apt_q5",
            "category": "Quantitative Aptitude",
            "difficulty": "easy",
            "question": "An article is sold for $840 at a gain of 20%. What was the cost price of the article?",
            "options": {
                "A": "$700",
                "B": "$720",
                "C": "$680",
                "D": "$750"
            },
            "correct_option": "A",
            "explanation": "CP = SP / (1 + Gain%) = 840 / 1.20 = $700."
        },

        # --- Logical Reasoning ---
        {
            "id": "apt_q6",
            "category": "Logical Reasoning",
            "difficulty": "medium",
            "question": "In a certain code, 'COMPUTER' is written as 'RFUVQNPC'. How is 'MEDICINE' written in that code?",
            "options": {
                "A": "EOJDJEFM",
                "B": "EOJDEJFM",
                "C": "MFEJDJOE",
                "D": "EOJDJFEM"
            },
            "correct_option": "A",
            "explanation": "First and last letters are swapped, and intermediate letters are incremented by 1 in reverse order."
        },
        {
            "id": "apt_q7",
            "category": "Logical Reasoning",
            "difficulty": "easy",
            "question": "Point A is 10m North of Point B. Point C is 10m East of Point B. In which direction is Point A with respect to Point C?",
            "options": {
                "A": "North-East",
                "B": "South-West",
                "C": "North-West",
                "D": "South-East"
            },
            "correct_option": "C",
            "explanation": "From C (East), going back to B (West) and up to A (North) results in North-West."
        },
        {
            "id": "apt_q8",
            "category": "Logical Reasoning",
            "difficulty": "medium",
            "question": "Look at this series: 2, 6, 12, 20, 30, ... What number should come next?",
            "options": {
                "A": "40",
                "B": "42",
                "C": "44",
                "D": "46"
            },
            "correct_option": "B",
            "explanation": "Differences between terms: +4, +6, +8, +10, +12. 30 + 12 = 42. (Or n*(n+1): 1*2, 2*3, 3*4, 4*5, 5*6, 6*7=42)."
        },
        {
            "id": "apt_q9",
            "category": "Logical Reasoning",
            "difficulty": "hard",
            "question": "Statements: (1) All engineers are problem solvers. (2) Some problem solvers are leaders. Conclusions: I. Some engineers are leaders. II. All problem solvers are engineers.",
            "options": {
                "A": "Only conclusion I follows",
                "B": "Only conclusion II follows",
                "C": "Either I or II follows",
                "D": "Neither I nor II follows"
            },
            "correct_option": "D",
            "explanation": "Since some problem solvers are leaders, those leaders might not overlap with engineers. Neither conclusion necessarily follows."
        },
        {
            "id": "apt_q10",
            "category": "Logical Reasoning",
            "difficulty": "medium",
            "question": "Pointing to a photograph, Rohit said, 'She is the daughter of my grandfather's only son.' How is Rohit related to the girl in the photograph?",
            "options": {
                "A": "Brother",
                "B": "Uncle",
                "C": "Cousin",
                "D": "Father"
            },
            "correct_option": "A",
            "explanation": "Grandfather's only son is Rohit's father. The daughter of Rohit's father is Rohit's sister. Thus Rohit is her brother."
        },

        # --- Verbal Reasoning ---
        {
            "id": "apt_q11",
            "category": "Verbal Reasoning",
            "difficulty": "easy",
            "question": "Choose the word most nearly opposite in meaning to 'METICULOUS':",
            "options": {
                "A": "Diligent",
                "B": "Careless",
                "C": "Precise",
                "D": "Painstaking"
            },
            "correct_option": "B",
            "explanation": "'Meticulous' means showing great attention to detail. Its opposite is 'Careless'."
        },
        {
            "id": "apt_q12",
            "category": "Verbal Reasoning",
            "difficulty": "medium",
            "question": "Select the pair that expresses a relationship most similar to: CANDLE : WAX ::",
            "options": {
                "A": "Metal : Ore",
                "B": "Tire : Rubber",
                "C": "Paper : Wood",
                "D": "Glass : Sand"
            },
            "correct_option": "B",
            "explanation": "A candle is composed primarily of wax, just as a tire is made primarily of rubber (finished product and its constituent substance)."
        },
        {
            "id": "apt_q13",
            "category": "Verbal Reasoning",
            "difficulty": "medium",
            "question": "Choose the most appropriate word to fill in the blank: 'The architect was praised for her _______ design that harmonized modern aesthetics with environmental sustainability.'",
            "options": {
                "A": "ephemeral",
                "B": "ingenious",
                "C": "pedestrian",
                "D": "derivative"
            },
            "correct_option": "B",
            "explanation": "'Ingenious' means clever, original, and inventive, which fits high praise for a harmonious design."
        },
        {
            "id": "apt_q14",
            "category": "Verbal Reasoning",
            "difficulty": "hard",
            "question": "Identify the grammatically correct sentence:",
            "options": {
                "A": "Neither the software architect nor the backend engineers was aware of the memory leak.",
                "B": "Neither the software architect nor the backend engineers were aware of the memory leak.",
                "C": "Neither the software architect or the backend engineers were aware of the memory leak.",
                "D": "Neither the software architect nor the backend engineers has been aware of the memory leak."
            },
            "correct_option": "B",
            "explanation": "In 'neither... nor', the verb agrees with the closer subject. 'Backend engineers' is plural, so 'were' is grammatically correct."
        },
        {
            "id": "apt_q15",
            "category": "Verbal Reasoning",
            "difficulty": "medium",
            "question": "Choose the word closest in meaning to 'UBIQUITOUS':",
            "options": {
                "A": "Omnipresent",
                "B": "Elusive",
                "C": "Scarce",
                "D": "Transient"
            },
            "correct_option": "A",
            "explanation": "'Ubiquitous' means present, appearing, or found everywhere. The closest synonym is 'Omnipresent'."
        }
    ]

    def __init__(self):
        super().__init__(name="Aptitude Assessment Agent", role="Cognitive & Analytical Evaluator")

    def get_test_questions(
        self,
        count: int = 10,
        category: str = "all",
        difficulty: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Returns verified questions without revealing correct answer keys or explanations."""
        filtered = self.VERIFIED_APTITUDE_BANK

        # Category filter
        if category and category.lower() != "all":
            cat_lower = category.lower().strip()
            filtered = [
                q for q in filtered
                if cat_lower in q["category"].lower()
            ]

        # Difficulty filter
        if difficulty and difficulty.lower() != "all":
            diff_lower = difficulty.lower().strip()
            filtered = [
                q for q in filtered
                if q["difficulty"].lower() == diff_lower
            ]

        questions = []
        for q in filtered[:count]:
            questions.append({
                "id": q["id"],
                "category": q["category"],
                "difficulty": q["difficulty"],
                "question": q["question"],
                "options": q["options"]
            })
        return questions

    def grade_submission(
        self,
        answers: Dict[str, str],
        time_spent: int = 0,
        question_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Performs deterministic grading against verified answer keys."""
        # Build canonical lookup table supporting both "apt_q1" and "q1" keys
        bank_dict: Dict[str, Dict[str, Any]] = {}
        for q in self.VERIFIED_APTITUDE_BANK:
            bank_dict[q["id"]] = q
            if q["id"].startswith("apt_"):
                bank_dict[q["id"].replace("apt_", "")] = q

        # Determine target questions to grade
        if question_ids:
            target_questions = [
                bank_dict[qid] for qid in question_ids
                if qid in bank_dict
            ]
        elif answers:
            # If answers contains matching IDs, grade against submitted questions
            matched_cids = {bank_dict[k]["id"] for k in answers.keys() if k in bank_dict}
            if matched_cids:
                target_questions = [q for q in self.VERIFIED_APTITUDE_BANK if q["id"] in matched_cids]
            else:
                target_questions = self.VERIFIED_APTITUDE_BANK
        else:
            target_questions = self.VERIFIED_APTITUDE_BANK

        correct_count = 0
        total = len(target_questions)
        category_stats: Dict[str, Dict[str, int]] = {}
        results = []

        # Normalize answers lookup
        norm_answers = {}
        for k, v in answers.items():
            norm_answers[k] = v
            if k.startswith("apt_"):
                norm_answers[k.replace("apt_", "")] = v
            else:
                norm_answers[f"apt_{k}"] = v

        for q_data in target_questions:
            q_id = q_data["id"]
            user_choice = norm_answers.get(q_id)
            is_correct = (user_choice == q_data["correct_option"])
            if is_correct:
                correct_count += 1

            cat = q_data["category"]
            if cat not in category_stats:
                category_stats[cat] = {"correct": 0, "total": 0}
            category_stats[cat]["total"] += 1
            if is_correct:
                category_stats[cat]["correct"] += 1

            results.append({
                "question_id": q_id,
                "question": q_data["question"],
                "user_answer": user_choice,
                "correct_answer": q_data["correct_option"],
                "is_correct": is_correct,
                "explanation": q_data["explanation"]
            })

        score_pct = round((correct_count / total) * 100.0, 1) if total > 0 else 0.0
        cat_scores = {
            cat: round((data["correct"] / data["total"]) * 100.0, 1)
            for cat, data in category_stats.items()
        }

        avg_seconds = round(time_spent / total, 1) if total > 0 and time_spent > 0 else 0.0

        return {
            "total_questions": total,
            "correct_count": correct_count,
            "score_percentage": score_pct,
            "category_scores": cat_scores,
            "time_spent_seconds": time_spent,
            "average_seconds_per_question": avg_seconds,
            "results": results
        }
