import re
from typing import Dict, Any, List
from ai_engine.base import BaseAgent
from ai_engine.gemini_client import gemini_client

class HRAgent(BaseAgent):
    """Conducts conversational, STAR-methodology behavioral HR interviews."""
    
    SYSTEM_PROMPT = """You are an expert HR Interviewer and Talent Assessment Specialist at a top-tier tech organization.
Your objective is to assess candidates across:
1. Behavioral competencies (collaboration, leadership, ownership, conflict resolution).
2. Communication clarity and structured storytelling (STAR method: Situation, Task, Action, Result).
3. Culture contribution, growth mindset, and handling adversity.
Always produce valid JSON responses strictly matching the requested schema. Never output markdown format without JSON."""

    HR_QUESTION_BANK = [
        {
            "category": "Introduction & Motivation",
            "question_text": "To start off, could you briefly introduce yourself, highlight your core engineering passions, and share what drives you to excel in technology roles?",
            "expected_criteria": ["Concise professional background", "Key technical competencies", "Genuine motivation and growth orientation"],
            "difficulty": "easy"
        },
        {
            "category": "Behavioral & STAR - Crisis Management",
            "question_text": "Describe a situation where a critical production bug occurred or a project deadline was at severe risk. What specific steps did you take to resolve the crisis and align your team?",
            "expected_criteria": ["Clear Situation and Task", "Decisive ownership actions", "Measurable Resolution and learnings"],
            "difficulty": "medium"
        },
        {
            "category": "Conflict & Team Dynamics",
            "question_text": "Tell me about a time you strongly disagreed with a technical design choice or architectural decision proposed by a peer or manager. How did you handle the debate?",
            "expected_criteria": ["Respectful collaboration", "Data-driven arguments", "Commitment to the final consensus"],
            "difficulty": "medium"
        },
        {
            "category": "Adaptability & Ambiguity",
            "question_text": "Can you give an example of working on a project with vague or rapidly shifting requirements? How did you navigate ambiguity and ensure momentum?",
            "expected_criteria": ["Clarifying requirements proactively", "Iterative milestone delivery", "Risk mitigation"],
            "difficulty": "hard"
        },
        {
            "category": "Career Aspirations & Retrospective",
            "question_text": "Reflecting on your journey so far, what is one major technical or professional mistake you made, and what fundamental lesson did it teach you?",
            "expected_criteria": ["Honest self-awareness", "No blame-shifting", "Constructive behavioral improvement"],
            "difficulty": "medium"
        },
        {
            "category": "Leadership & Mentorship",
            "question_text": "Describe an instance where you mentored a junior teammate or helped an underperforming project regain velocity. What was your pedagogical approach?",
            "expected_criteria": ["Empathy and constructive guidance", "Pair programming or structured feedback", "Tangible improvement in team output"],
            "difficulty": "medium"
        },
        {
            "category": "Prioritization & Trade-offs",
            "question_text": "How do you balance technical debt reduction with product feature delivery under tight business roadmap pressures?",
            "expected_criteria": ["Pragmatic compromise", "Quantifying tech debt risk to business stakeholders", "Incremental refactoring strategy"],
            "difficulty": "hard"
        }
    ]

    def __init__(self):
        super().__init__(name="HR Interview Agent", role="Behavioral Assessment Specialist")

    def assess_star_methodology(self, answer: str) -> Dict[str, Any]:
        """Analyzes candidate response for presence of Situation, Task, Action, and Result (STAR)."""
        lower = answer.lower()
        word_count = len(answer.strip().split())

        # Keyword and semantic cues for each STAR pillar
        situation_cues = ["situation", "when i was", "at my previous", "in my project", "we had", "there was", "our team", "client wanted", "faced with", "company was"]
        task_cues = ["task", "my role", "my objective", "responsible for", "needed to", "goal was", "assigned to", "had to deliver", "challenge was"]
        action_cues = ["i designed", "i implemented", "i created", "i built", "i led", "i investigated", "i decided", "i organized", "i initiated", "my action", "i wrote", "i introduced", "i reached out"]
        result_cues = ["result", "outcome", "finally", "consequently", "reduced", "improved", "increased", "achieved", "delivered on time", "learned that", "metrics showed", "impact was"]

        has_situation = any(cue in lower for cue in situation_cues) or word_count >= 30
        has_task = any(cue in lower for cue in task_cues) or word_count >= 40
        has_action = any(cue in lower for cue in action_cues)
        has_result = any(cue in lower for cue in result_cues)

        missing = []
        if not has_situation:
            missing.append("Situation (Context/Background)")
        if not has_task:
            missing.append("Task (Specific Responsibility/Objective)")
        if not has_action:
            missing.append("Action (Personal Engineering/Leadership Steps)")
        if not has_result:
            missing.append("Result (Measurable Outcome/Impact/Learnings)")

        star_count = 4 - len(missing)
        star_score = round((star_count / 4.0) * 100.0, 1)

        return {
            "has_situation": has_situation,
            "has_task": has_task,
            "has_action": has_action,
            "has_result": has_result,
            "star_score": star_score,
            "missing_components": missing
        }

    def get_question(self, index: int, difficulty: str = "medium") -> Dict[str, Any]:
        """Returns question from bank or dynamically generates tailored behavioral prompt."""
        if index < len(self.HR_QUESTION_BANK):
            q = self.HR_QUESTION_BANK[index]
            return {
                "question_text": q["question_text"],
                "category": q["category"],
                "difficulty": q["difficulty"],
                "expected_criteria": q["expected_criteria"]
            }
        
        prompt = f"""Generate an advanced behavioral HR interview question for index {index + 1} at '{difficulty}' difficulty.
Return JSON format:
{{
  "question_text": "...",
  "category": "...",
  "difficulty": "{difficulty}",
  "expected_criteria": ["...", "..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)
        if "question_text" not in res:
            fallback = self.HR_QUESTION_BANK[-1]
            return {
                "question_text": fallback["question_text"],
                "category": fallback["category"],
                "difficulty": difficulty,
                "expected_criteria": fallback["expected_criteria"]
            }
        return res

    def evaluate_answer(self, question: str, answer: str, expected_criteria: List[str]) -> Dict[str, Any]:
        """Evaluates candidate answer against STAR criteria and behavioral clarity."""
        star_analysis = self.assess_star_methodology(answer)
        
        prompt = f"""Evaluate candidate HR response.
Question: {question}
Expected Criteria: {expected_criteria}
Candidate Answer: {answer}
STAR Framework Analysis: {star_analysis}

Return JSON format:
{{
  "score": float (0-100),
  "relevance_score": float (0-100),
  "clarity_score": float (0-100),
  "technical_depth_score": float (0-100),
  "feedback": "summary feedback",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)

        base_score = float(res.get("score", 75.0))
        # Ensure STAR analysis influences the final scored output
        final_score = round((base_score * 0.7) + (star_analysis["star_score"] * 0.3), 1)

        strengths = list(res.get("strengths", ["Maintained professional tone"]))
        improvements = list(res.get("improvements", []))
        if star_analysis["missing_components"]:
            improvements.extend([f"Incorporate missing STAR element: {elem}" for elem in star_analysis["missing_components"]])
        # Deduplicate improvements
        improvements = list(dict.fromkeys(improvements))

        return {
            "score": final_score,
            "relevance_score": float(res.get("relevance_score", final_score)),
            "clarity_score": float(res.get("clarity_score", final_score)),
            "technical_depth_score": float(res.get("technical_depth_score", final_score)),
            "star_breakdown": star_analysis,
            "feedback": str(res.get("feedback", "Candidate provided clear communication with behavioral context.")),
            "strengths": strengths,
            "improvements": improvements
        }

    def should_ask_follow_up(self, answer: str, question: str) -> Dict[str, Any]:
        """Determines if the answer is brief, ambiguous, or warrants a follow-up probe."""
        word_count = len(answer.strip().split())
        star_analysis = self.assess_star_methodology(answer)

        if word_count < 25:
            return {
                "needs_follow_up": True,
                "follow_up_question": "That was quite brief. Could you provide a concrete example from your past experience illustrating how you handled that situation?",
                "rationale": "Answer lacked sufficient detail and context."
            }

        if not star_analysis["has_result"] and word_count < 60:
            return {
                "needs_follow_up": True,
                "follow_up_question": "What was the final outcome or measurable impact of the actions you took, and what key lesson did you carry forward?",
                "rationale": "Candidate described the situation but omitted the concrete result and retrospective learning."
            }
        
        prompt = f"""Analyze candidate answer to question: '{question}'.
Answer: '{answer}'
Decide if an interviewer should probe deeper on trade-offs, results, or specific actions.
Return JSON format:
{{
  "needs_follow_up": boolean,
  "follow_up_question": "string or null",
  "rationale": "string"
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)
        return {
            "needs_follow_up": bool(res.get("needs_follow_up", False)),
            "follow_up_question": res.get("follow_up_question"),
            "rationale": str(res.get("rationale", "Probing behavioral depth."))
        }
