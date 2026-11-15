from typing import Dict, Any, List
from ai_engine.base import BaseAgent

class EvaluationAgent(BaseAgent):
    """Aggregates round scores, applies transparent rubrics, and creates personalized study plans."""

    RUBRIC_WEIGHTS = {
        "technical_depth": 0.35,
        "relevance": 0.25,
        "communication_clarity": 0.25,
        "structure": 0.15
    }

    def __init__(self):
        super().__init__(name="Evaluation Agent", role="Rubric & Performance Analytics Specialist")

    def aggregate_evaluation(self, question_evaluations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates reproducible, deterministic scores across all completed questions."""
        if not question_evaluations:
            return {
                "overall_score": 0.0,
                "round_scores": {
                    "technical_accuracy": 0.0,
                    "communication_clarity": 0.0,
                    "structure_and_depth": 0.0,
                    "relevance": 0.0
                },
                "overall_strengths": ["Assessment initiated"],
                "critical_weaknesses": ["No answers submitted yet"],
                "improvement_plan": []
            }

        total_questions = len(question_evaluations)
        avg_score = sum(q.get("score", 70.0) for q in question_evaluations) / total_questions
        avg_relevance = sum(q.get("relevance_score", 75.0) for q in question_evaluations) / total_questions
        avg_clarity = sum(q.get("clarity_score", 70.0) for q in question_evaluations) / total_questions
        avg_depth = sum(q.get("technical_depth_score", 70.0) for q in question_evaluations) / total_questions

        # Deterministic weighted calculation
        overall_weighted = (
            (avg_depth * self.RUBRIC_WEIGHTS["technical_depth"]) +
            (avg_relevance * self.RUBRIC_WEIGHTS["relevance"]) +
            (avg_clarity * self.RUBRIC_WEIGHTS["communication_clarity"]) +
            (avg_score * self.RUBRIC_WEIGHTS["structure"])
        )

        all_strengths = []
        all_improvements = []
        for q in question_evaluations:
            all_strengths.extend(q.get("strengths", []))
            all_improvements.extend(q.get("improvements", []))

        # Deduplicate and prioritize top items
        unique_strengths = list(dict.fromkeys(all_strengths))[:4]
        unique_weaknesses = list(dict.fromkeys(all_improvements))[:4]

        # Generate actionable improvement study plan
        improvement_plan = []
        if avg_depth < 80:
            improvement_plan.append({
                "topic": "System & Algorithmic Depth",
                "recommendation": "Deepen technical responses by discussing internal runtime mechanisms, memory allocation, and concurrency trade-offs."
            })
        if avg_clarity < 80:
            improvement_plan.append({
                "topic": "STAR Communication Structure",
                "recommendation": "Structure behavioral responses into distinct Situation, Task, Action, and Result phases to avoid open-ended wandering."
            })
        if avg_relevance < 80:
            improvement_plan.append({
                "topic": "Direct Requirement Alignment",
                "recommendation": "Address the core prompt directly within the first two sentences before expanding into contextual background."
            })
        if not improvement_plan:
            improvement_plan.append({
                "topic": "Advanced Edge Cases & Scaling",
                "recommendation": "Incorporate distributed systems edge cases, fault-tolerance mechanisms, and zero-downtime deployment patterns."
            })

        return {
            "overall_score": round(overall_weighted, 1),
            "round_scores": {
                "technical_accuracy": round(avg_depth, 1),
                "communication_clarity": round(avg_clarity, 1),
                "structure_and_depth": round(avg_score, 1),
                "relevance": round(avg_relevance, 1)
            },
            "overall_strengths": unique_strengths or ["Clear engagement with interview questions"],
            "critical_weaknesses": unique_weaknesses or ["Provide more quantitative metrics in your results"],
            "improvement_plan": improvement_plan
        }
