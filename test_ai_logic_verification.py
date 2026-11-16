import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath("InterviewGenie-AI"))

from ai_engine.hr_agent import HRAgent
from ai_engine.evaluation_agent import EvaluationAgent

def verify_adaptive_follow_up():
    print("=== PART 1: VERIFYING ADAPTIVE FOLLOW-UP LOGIC ===")
    hr_agent = HRAgent()
    
    question = "Describe a situation where a production service failed and how you handled it."
    
    # Candidate Answer A: Vague / evasive answer (< 25 words or evasive cues)
    ans_a = "I do not know, someone else on the team handled the server outage."
    res_a = hr_agent.should_ask_follow_up(ans_a, question)
    
    print("\n[Test Case A: Evasive / Short Answer]")
    print("Candidate Answer:", ans_a)
    print("Needs Follow-up:", res_a["needs_follow_up"])
    print("Follow-up Prompt:", res_a["follow_up_question"])
    print("Rationale:", res_a["rationale"])
    
    # Candidate Answer B: Provides Situation & Task, but omits personal Action
    ans_b = (
        "Situation: Our user authentication service went down on a Friday night due to a database deadlock. "
        "Task: The objective was to restore logins immediately for 100,000 active users before peak hours."
    )
    res_b = hr_agent.should_ask_follow_up(ans_b, question)
    
    print("\n[Test Case B: Missing Personal Action]")
    print("Candidate Answer:", ans_b)
    print("Needs Follow-up:", res_b["needs_follow_up"])
    print("Follow-up Prompt:", res_b["follow_up_question"])
    print("Rationale:", res_b["rationale"])

    # Candidate Answer C: Provides Situation, Task, and Action, but omits Result
    ans_c = (
        "Situation: During Black Friday, database connection pools were exhausted. "
        "Task: I was responsible for diagnosing the deadlock and deploying a hotfix. "
        "Action: I analyzed thread dumps, killed blocking transactions, and deployed connection pooling."
    )
    res_c = hr_agent.should_ask_follow_up(ans_c, question)
    
    print("\n[Test Case C: Missing Measurable Result]")
    print("Candidate Answer:", ans_c)
    print("Needs Follow-up:", res_c["needs_follow_up"])
    print("Follow-up Prompt:", res_c["follow_up_question"])
    print("Rationale:", res_c["rationale"])

    # Assertions
    assert res_a["needs_follow_up"] is True
    assert res_b["needs_follow_up"] is True
    assert res_c["needs_follow_up"] is True
    assert res_a["follow_up_question"] != res_b["follow_up_question"]
    assert res_b["follow_up_question"] != res_c["follow_up_question"]
    print("\n-> PASS: Follow-up questions dynamically and deterministically depend on previous candidate answers!")

def verify_deterministic_scoring():
    print("\n=== PART 2: VERIFYING DETERMINISTIC SCORE AGGREGATION ===")
    eval_agent = EvaluationAgent()
    
    # Fixed rubric input representing two answered interview questions
    fixed_evaluations = [
        {
            "score": 88.0,
            "relevance_score": 92.0,
            "clarity_score": 85.0,
            "technical_depth_score": 90.0,
            "strengths": ["Clear architectural trade-off discussion", "Quantified performance metrics"],
            "improvements": ["Elaborate on edge case failovers"]
        },
        {
            "score": 82.0,
            "relevance_score": 84.0,
            "clarity_score": 80.0,
            "technical_depth_score": 86.0,
            "strengths": ["Disciplined STAR communication"],
            "improvements": ["Provide deeper concurrency analysis"]
        }
    ]
    
    # Run aggregation 1
    run_1 = eval_agent.aggregate_evaluation(fixed_evaluations)
    
    # Run aggregation 2 on the exact same fixed inputs
    run_2 = eval_agent.aggregate_evaluation(fixed_evaluations)
    
    print("Run 1 Result:")
    print("  Overall Score:", run_1["overall_score"])
    print("  Round Scores:", run_1["round_scores"])
    print("  Strengths:", run_1["overall_strengths"])
    
    print("\nRun 2 Result:")
    print("  Overall Score:", run_2["overall_score"])
    print("  Round Scores:", run_2["round_scores"])
    print("  Strengths:", run_2["overall_strengths"])
    
    # Mathematical manual check:
    # avg_depth = (90 + 86) / 2 = 88.0
    # avg_relevance = (92 + 84) / 2 = 88.0
    # avg_clarity = (85 + 80) / 2 = 82.5
    # avg_score = (88 + 82) / 2 = 85.0
    # overall = (88.0 * 0.35) + (88.0 * 0.25) + (82.5 * 0.25) + (85.0 * 0.15)
    #         = 30.8 + 22.0 + 20.625 + 12.75 = 86.175 -> round(86.175, 1) = 86.2
    expected_overall = 86.2
    
    print(f"\nMathematical Manual Check: Expected {expected_overall}, Computed {run_1['overall_score']}")
    
    assert run_1["overall_score"] == run_2["overall_score"]
    assert run_1["overall_score"] == expected_overall
    assert run_1["round_scores"] == run_2["round_scores"]
    assert run_1["overall_strengths"] == run_2["overall_strengths"]
    assert run_1["critical_weaknesses"] == run_2["critical_weaknesses"]
    
    print("\n-> PASS: Final score is 100% deterministic code arithmetic (identical output across runs)!")

if __name__ == "__main__":
    verify_adaptive_follow_up()
    verify_deterministic_scoring()
    print("\n=== ALL AI INTERVIEW LOGIC VERIFICATIONS PASSED ===")
