# AI ENGINEER TASK SPECIFICATION
Agent Name: `ai` (Pane `w2:p5`, Tab 2)
Owned Files: `ai_engine/*`

## Objectives:
1. Verify and enhance the multi-agent system in `ai_engine/`:
   - `hr_agent.py`: Behavioral & STAR methodology, conversational follow-ups.
   - `technical_agent.py`: Technical domains (Python, Java, DSA, DBMS, OS, Networks, Web Dev, AI/ML) with code assessment and conceptual depth.
   - `aptitude_agent.py`: Quantitative, logical, verbal reasoning questions and deterministic grading.
   - `resume_agent.py`: Resume extraction and grounded interview questions tailored to candidate projects/skills.
   - `coordinator_agent.py`: State machine governing difficulty adaptation (easy/medium/hard based on score), follow-up vs next question routing.
   - `evaluation_agent.py`: Transparent rubrics (technical accuracy, communication clarity, structure, relevance), strengths, weaknesses, and personalized study plan.
   - `gemini_client.py`: Structured JSON responses with resilient offline deterministic fallback.
2. Verify all agent methods execute cleanly by running an automated test script.
3. Report deliverables and test status to Master Orchestrator.
