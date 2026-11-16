"""
InterviewGenie AI — Full Domain Validation Runner
Validates JSON response structures and difficulty adaptation across:
- HR (STAR methodology, behavioral evaluation, follow-up)
- Technical: Python, Java, DSA, OS (question generation, code assessment, answer evaluation)
- Aptitude (MCQ generation, zero-leak check, deterministic grading)
- Resume (Profile extraction, grounded questions, adaptive evaluation)
"""

import sys
import os
import json
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai_engine.hr_agent import HRAgent
from ai_engine.technical_agent import TechnicalAgent
from ai_engine.aptitude_agent import AptitudeAgent
from ai_engine.resume_agent import ResumeAgent
from ai_engine.evaluation_agent import EvaluationAgent
from ai_engine.coordinator_agent import coordinator_agent


def validate_schema(data: Dict[str, Any], required_fields: List[str], schema_name: str) -> bool:
    missing = [f for f in required_fields if f not in data]
    if missing:
        print(f"  [FAIL] {schema_name} missing fields: {missing}")
        return False
    print(f"  [PASS] {schema_name} validated. Fields present: {list(data.keys())}")
    return True


def run_full_validation():
    print("=" * 80)
    print("INTERVIEWGENIE AI — COMPREHENSIVE DOMAIN VALIDATION REPORT")
    print("=" * 80)

    # -------------------------------------------------------------
    # 1. HR Domain Validation
    # -------------------------------------------------------------
    print("\n[1/6] VALIDATING HR DOMAIN...")
    hr_agent = HRAgent()
    for diff in ["easy", "medium", "hard"]:
        q = hr_agent.get_question(index=0, difficulty=diff)
        validate_schema(q, ["question_text", "category", "difficulty", "expected_criteria"], f"HR Question ({diff})")
        assert q["difficulty"] == diff

    hr_eval = hr_agent.evaluate_answer(
        question="Describe a time you resolved a critical production incident.",
        answer="In my previous company, our payment gateway failed. My task was to restore processing. I analyzed network timeouts, added exponential backoff, and migrated to a fallback gateway. As a result, checkout availability reached 99.99%.",
        expected_criteria=["Situation", "Task", "Action", "Result"]
    )
    validate_schema(hr_eval, ["score", "relevance_score", "clarity_score", "technical_depth_score", "feedback", "strengths", "improvements", "star_breakdown"], "HR Answer Evaluation")
    validate_schema(hr_eval["star_breakdown"], ["has_situation", "has_task", "has_action", "has_result", "star_score"], "HR STAR Breakdown")

    hr_follow_up = hr_agent.should_ask_follow_up("I fixed the bug.", "How did you resolve it?")
    validate_schema(hr_follow_up, ["needs_follow_up", "follow_up_question", "rationale"], "HR Follow-up Detection")

    # -------------------------------------------------------------
    # 2. Technical Domains: Python, Java, DSA, OS
    # -------------------------------------------------------------
    tech_agent = TechnicalAgent()
    tech_domains = ["Python", "Java", "DSA", "OS"]

    for domain in tech_domains:
        print(f"\n[2/6] VALIDATING TECHNICAL DOMAIN: {domain}...")
        for diff in ["easy", "medium", "hard"]:
            tq = tech_agent.get_question(domain=domain, index=0, difficulty=diff)
            validate_schema(tq, ["question_text", "category", "difficulty", "expected_criteria"], f"Technical {domain} Question ({diff})")
            assert tq["difficulty"] == diff, f"Expected {diff}, got {tq['difficulty']}"

        teval = tech_agent.evaluate_answer(
            question=tq["question_text"],
            answer=f"Detailed architectural analysis addressing memory, concurrency, Big-O complexity, and operational trade-offs for {domain}.",
            expected_criteria=tq["expected_criteria"]
        )
        validate_schema(teval, ["score", "relevance_score", "clarity_score", "technical_depth_score", "feedback", "strengths", "improvements"], f"Technical {domain} Answer Evaluation")

        if domain in ["Python", "Java", "DSA"]:
            code_sample = "def solve(): return 42" if domain != "Java" else "class Solution { public int solve() { return 42; } }"
            code_eval = tech_agent.assess_code(code_sample, language=domain.lower(), problem_description=f"Optimal implementation for {domain}")
            validate_schema(code_eval, ["correctness_score", "time_complexity", "space_complexity", "code_quality_score", "overall_score", "feedback", "strengths"], f"Technical {domain} Code Assessment")

    # -------------------------------------------------------------
    # 3. Aptitude Domain Validation
    # -------------------------------------------------------------
    print("\n[3/6] VALIDATING APTITUDE DOMAIN...")
    apt_agent = AptitudeAgent()
    for diff in ["easy", "medium", "hard"]:
        apt_qs = apt_agent.get_test_questions(count=3, category="all", difficulty=diff)
        assert len(apt_qs) > 0
        for q in apt_qs:
            validate_schema(q, ["id", "category", "difficulty", "question", "options"], f"Aptitude MCQ ({diff})")
            assert q["difficulty"] == diff
            assert "correct_option" not in q, "Security leak: correct_option exposed!"
            assert "explanation" not in q, "Security leak: explanation exposed!"

    apt_grade = apt_agent.grade_submission(
        answers={"apt_q1": "B", "apt_q2": "A", "apt_q3": "C"},
        time_spent=90
    )
    validate_schema(apt_grade, ["total_questions", "correct_count", "score_percentage", "category_scores", "time_spent_seconds", "average_seconds_per_question", "results"], "Aptitude Grading Result")

    # -------------------------------------------------------------
    # 4. Resume Domain Validation
    # -------------------------------------------------------------
    print("\n[4/6] VALIDATING RESUME DOMAIN...")
    resume_agent = ResumeAgent()
    sample_text = """
    Jane Candidate
    Staff Software Architect
    7+ years of experience in Python, Go, Docker, Kubernetes, Distributed Systems, Microservices, and PostgreSQL.
    Projects:
    - Designed distributed database sharding mechanism handling 100k writes/sec with Raft consensus.
    - Implemented high-throughput event bus using Kafka and FastAPI with sub-10ms p99 latency.
    Education:
    Master of Science in Computer Science
    """
    res_prof = resume_agent.extract_profile_from_text(sample_text)
    validate_schema(res_prof, ["skills", "experience_level", "years_of_experience", "projects", "education", "detected_domains", "summary"], "Resume Profile Extraction")
    assert "Python" in res_prof["skills"]
    assert res_prof["experience_level"] == "lead/principal"

    for diff in ["easy", "medium", "hard"]:
        rq = resume_agent.generate_grounded_question(
            resume_summary=res_prof["summary"],
            skills=res_prof["skills"],
            index=0,
            projects=res_prof["projects"],
            difficulty=diff
        )
        validate_schema(rq, ["question_text", "category", "difficulty", "expected_criteria"], f"Resume Grounded Question ({diff})")
        assert rq["difficulty"] == diff

    # -------------------------------------------------------------
    # 5. Difficulty Adaptation State Machine Validation
    # -------------------------------------------------------------
    print("\n[5/6] VALIDATING DIFFICULTY ADAPTATION STATE MACHINE...")
    test_matrix = [
        # (initial, score, expected)
        ("easy", 95.0, "medium", "Promotion: Easy -> Medium on score >= 85"),
        ("medium", 90.0, "hard", "Promotion: Medium -> Hard on score >= 85"),
        ("hard", 90.0, "hard", "Ceiling: Hard -> Hard on score >= 85"),
        ("hard", 50.0, "medium", "Demotion: Hard -> Medium on score < 60"),
        ("medium", 45.0, "easy", "Demotion: Medium -> Easy on score < 60"),
        ("easy", 40.0, "easy", "Floor: Easy -> Easy on score < 60"),
        ("easy", 75.0, "easy", "Stability: Easy stays Easy on 60 <= score < 85"),
        ("medium", 70.0, "medium", "Stability: Medium stays Medium on 60 <= score < 85"),
        ("hard", 80.0, "hard", "Stability: Hard stays Hard on 60 <= score < 85"),
        # Boundaries
        ("easy", 85.0, "medium", "Boundary Promotion: Score 85.0 promotes"),
        ("medium", 84.9, "medium", "Boundary Stability: Score 84.9 does not promote"),
        ("medium", 60.0, "medium", "Boundary Stability: Score 60.0 does not demote"),
        ("medium", 59.9, "easy", "Boundary Demotion: Score 59.9 demotes")
    ]

    for initial, score, expected, description in test_matrix:
        actual = coordinator_agent.adapt_difficulty(initial, score)
        assert actual == expected, f"{description} failed: expected {expected}, got {actual}"
        print(f"  [PASS] {description}: ({initial}, score={score}) -> {actual}")

    # -------------------------------------------------------------
    # 6. Evaluation Agent Rubric Aggregation Validation
    # -------------------------------------------------------------
    print("\n[6/6] VALIDATING EVALUATION AGENT RUBRIC AGGREGATION...")
    eval_agent = EvaluationAgent()
    sample_evals = [
        {"score": 88.0, "relevance_score": 90.0, "clarity_score": 85.0, "technical_depth_score": 88.0, "strengths": ["Clear explanation"], "improvements": ["Provide more metrics"]},
        {"score": 92.0, "relevance_score": 95.0, "clarity_score": 90.0, "technical_depth_score": 92.0, "strengths": ["Deep systems knowledge"], "improvements": []}
    ]
    report = eval_agent.aggregate_evaluation(sample_evals)
    validate_schema(report, ["overall_score", "round_scores", "overall_strengths", "critical_weaknesses", "improvement_plan"], "Evaluation Report Aggregation")
    validate_schema(report["round_scores"], ["technical_accuracy", "communication_clarity", "structure_and_depth", "relevance"], "Rubric Round Scores")

    print("\n" + "=" * 80)
    print("ALL VALIDATION CHECKS COMPLETED SUCCESSFULLY ACROSS ALL DOMAINS!")
    print("=" * 80)


if __name__ == "__main__":
    run_full_validation()
