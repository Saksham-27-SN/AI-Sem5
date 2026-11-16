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

STRICT ETHICAL & SAFETY DIRECTIVE:
You must NEVER evaluate, judge, score, infer, or comment upon candidate physical appearance, facial expressions, eye contact, attire, background environment, gender, race, age, accent, or emotional state.
All evaluations must be 100% objective, merit-based, and focused exclusively on candidate response content, verbal clarity, structured storytelling (STAR framework), and behavioral competencies.

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
        lower = (answer or "").lower()
        word_count = len((answer or "").strip().split())

        # Keyword and semantic cues for each STAR pillar
        situation_cues = ["situation", "when i was", "at my previous", "in my project", "we had", "there was", "our team", "client wanted", "faced with", "company was"]
        task_cues = ["task", "my role", "my objective", "responsible for", "needed to", "goal was", "assigned to", "had to deliver", "challenge was"]
        action_cues = [
            "i designed", "i implemented", "i created", "i built", "i led",
            "i investigated", "i decided", "i organized", "i initiated", "my action",
            "i wrote", "i introduced", "i reached out", "i analyzed", "i redesigned",
            "i added", "i optimized", "i resolved", "i refactored", "i developed",
            "i tested", "i configured", "i migrated", "i executed", "i established",
            "we designed", "we implemented", "we resolved", "our solution"
        ]
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
        diff_clean = (difficulty or "medium").lower().strip()
        matching_diff = [q for q in self.HR_QUESTION_BANK if q.get("difficulty") == diff_clean]
        if matching_diff and index < len(matching_diff):
            q = matching_diff[index]
            return {
                "question_text": q["question_text"],
                "category": q["category"],
                "difficulty": diff_clean,
                "expected_criteria": list(q["expected_criteria"])
            }
        elif index < len(self.HR_QUESTION_BANK):
            q = self.HR_QUESTION_BANK[index]
            return {
                "question_text": q["question_text"],
                "category": q["category"],
                "difficulty": diff_clean or q["difficulty"],
                "expected_criteria": list(q["expected_criteria"])
            }
        
        prompt = f"""Generate an advanced behavioral HR interview question for index {index + 1} at '{diff_clean}' difficulty.
Return JSON format:
{{
  "question_text": "...",
  "category": "...",
  "difficulty": "{diff_clean}",
  "expected_criteria": ["...", "..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)
        if "question_text" not in res:
            fallback = self.HR_QUESTION_BANK[-1]
            return {
                "question_text": fallback["question_text"],
                "category": fallback["category"],
                "difficulty": diff_clean,
                "expected_criteria": list(fallback["expected_criteria"])
            }
        if "difficulty" not in res or not res["difficulty"]:
            res["difficulty"] = diff_clean
        if "category" not in res or not res["category"]:
            res["category"] = "Behavioral & STAR Assessment"
        if "expected_criteria" not in res or not isinstance(res["expected_criteria"], list):
            res["expected_criteria"] = ["STAR methodology alignment", "Communication clarity", "Constructive problem solving"]
        return res

    def evaluate_answer(self, question: str, answer: str, expected_criteria: List[str]) -> Dict[str, Any]:
        """Evaluates candidate answer against STAR criteria and behavioral clarity."""
        star_analysis = self.assess_star_methodology(answer)
        clean_ans = (answer or "").strip()
        word_count = len(clean_ans.split())
        is_weak = word_count < 5 or any(p in clean_ans.lower() for p in ["don't know", "do not know", "no idea", "not sure", "skip", "pass"])

        prompt = f"""Evaluate candidate HR response.
STRICT SAFETY DIRECTIVE: Strictly zero evaluation of physical appearance, attire, facial expressions, or emotional state. Scoring is 100% merit-based.
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

        if is_weak:
            base_score = 30.0
            relevance = 25.0
            clarity = 40.0
            depth = 20.0
            feedback = "Candidate provided minimal or unelaborated answer to the behavioral question."
            strengths = ["Acknowledged gap directly"]
            improvements = ["Provide a structured real-world example using Situation, Task, Action, and Result"]
        else:
            base_score = self.safe_float(res.get("score"), 75.0)
            relevance = self.safe_float(res.get("relevance_score"), base_score)
            clarity = self.safe_float(res.get("clarity_score"), base_score)
            depth = self.safe_float(res.get("technical_depth_score"), base_score)
            feedback = str(res.get("feedback", "Candidate provided clear communication with behavioral context."))
            strengths = list(res.get("strengths", ["Maintained professional tone"]))
            improvements = list(res.get("improvements", []))

        # Ensure STAR analysis influences the final scored output
        final_score = round((base_score * 0.7) + (star_analysis["star_score"] * 0.3), 1)

        if star_analysis["missing_components"]:
            improvements.extend([f"Incorporate missing STAR element: {elem}" for elem in star_analysis["missing_components"]])
        # Deduplicate improvements
        improvements = list(dict.fromkeys(improvements))

        return {
            "score": final_score,
            "relevance_score": relevance,
            "clarity_score": clarity,
            "technical_depth_score": depth,
            "star_breakdown": star_analysis,
            "feedback": feedback,
            "strengths": strengths or ["Maintained professional tone"],
            "improvements": improvements
        }

    def should_ask_follow_up(self, answer: str, question: str) -> Dict[str, Any]:
        """Determines if the answer is brief, ambiguous, or evasive, and guides candidate on STAR structure."""
        clean_ans = (answer or "").strip()
        word_count = len(clean_ans.split())
        lower_ans = clean_ans.lower()
        star_analysis = self.assess_star_methodology(clean_ans)

        evasive_cues = [
            "don't know", "do not know", "no idea", "not sure", "can't recall", "cannot recall",
            "can't remember", "cannot remember", "someone else", "not me", "skip", "pass",
            "no comment", "we just did it", "it was handled", "nothing specific", "whatever"
        ]
        is_evasive = any(cue in lower_ans for cue in evasive_cues)
        is_short = word_count < 25

        if is_short or is_evasive:
            return {
                "needs_follow_up": True,
                "follow_up_question": (
                    "That response was quite brief. To help evaluate your experience effectively, "
                    "could you walk me through a specific real-world example using the STAR structure? "
                    "Please outline the Situation you faced, the Task you needed to accomplish, "
                    "the personal Actions you took, and the measurable Result or outcome achieved."
                ),
                "rationale": "Candidate answer was short or evasive; guiding candidate to structure their answer using the STAR methodology (Situation, Task, Action, Result)."
            }

        if not star_analysis["has_action"] and word_count < 60:
            return {
                "needs_follow_up": True,
                "follow_up_question": (
                    "You described the background, but what specific Actions did you personally execute? "
                    "Under the Action component of the STAR structure, walk me through the key engineering or leadership decisions you drove."
                ),
                "rationale": "Candidate provided background but lacked personal Action details in the STAR framework."
            }

        if not star_analysis["has_result"] and word_count < 60:
            return {
                "needs_follow_up": True,
                "follow_up_question": (
                    "What was the final outcome or measurable impact of the actions you took? "
                    "Please highlight the Result component of the STAR structure, including quantitative metrics and key takeaways."
                ),
                "rationale": "Candidate described the situation but omitted the concrete Result and retrospective learning in the STAR framework."
            }

        prompt = f"""Analyze candidate behavioral HR answer to question: '{question}'.
Answer: '{answer}'
STRICT SAFETY DIRECTIVE: Strictly zero evaluation of physical appearance or emotion. Focus solely on substantive content and STAR structure.

Decide if the interviewer should probe deeper on trade-offs, results, or specific actions.
If the candidate was vague or evasive, provide a follow-up question that explicitly prompts them on the STAR framework (Situation, Task, Action, Result).
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
