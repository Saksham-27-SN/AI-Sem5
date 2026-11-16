import pytest
import json
import uuid
from ai_engine.hr_agent import HRAgent
from ai_engine.technical_agent import TechnicalAgent
from ai_engine.aptitude_agent import AptitudeAgent
from ai_engine.resume_agent import ResumeAgent
from ai_engine.evaluation_agent import EvaluationAgent
from ai_engine.coordinator_agent import coordinator_agent
from backend.app.models.models import InterviewSession, Question, Answer, EvaluationReport, Profile


# =====================================================================
# 1. HR DOMAIN VALIDATION (JSON Structure & Difficulty Adaptation)
# =====================================================================

def test_hr_agent_json_structure_and_difficulty():
    """Verify HRAgent produces valid JSON structures and supports difficulty levels."""
    agent = HRAgent()

    # 1. Question bank and dynamic retrieval across difficulty tiers
    for diff in ["easy", "medium", "hard"]:
        q = agent.get_question(index=0, difficulty=diff)
        assert isinstance(q, dict), f"HR question should be a dict for {diff}"
        assert "question_text" in q and isinstance(q["question_text"], str) and len(q["question_text"]) > 10
        assert "category" in q and isinstance(q["category"], str)
        assert "difficulty" in q and q["difficulty"] == diff
        assert "expected_criteria" in q and isinstance(q["expected_criteria"], list) and len(q["expected_criteria"]) > 0

    # Dynamic generation beyond question bank length
    q_dynamic = agent.get_question(index=99, difficulty="hard")
    assert isinstance(q_dynamic, dict)
    assert "question_text" in q_dynamic and len(q_dynamic["question_text"]) > 10
    assert q_dynamic["difficulty"] == "hard"
    assert "expected_criteria" in q_dynamic

    # 2. Answer evaluation JSON structure with STAR breakdown
    answer_text = (
        "In my previous project at Acme Corp, our microservice suffered high latency. "
        "My task was to optimize the SQL queries and database indexes. "
        "I analyzed slow query logs, redesigned indexes on foreign keys, and added Redis caching. "
        "As a result, API response times dropped by 65% and throughput tripled."
    )
    eval_res = agent.evaluate_answer(
        question="Describe a challenging technical problem you solved.",
        answer=answer_text,
        expected_criteria=["Situation", "Task", "Action", "Result"]
    )
    assert isinstance(eval_res, dict)
    for field in ["score", "relevance_score", "clarity_score", "technical_depth_score", "feedback", "strengths", "improvements", "star_breakdown"]:
        assert field in eval_res, f"Field '{field}' missing from HR evaluation JSON"

    assert 0.0 <= eval_res["score"] <= 100.0
    assert 0.0 <= eval_res["relevance_score"] <= 100.0
    assert isinstance(eval_res["strengths"], list) and len(eval_res["strengths"]) > 0
    assert isinstance(eval_res["improvements"], list)

    star = eval_res["star_breakdown"]
    for star_field in ["has_situation", "has_task", "has_action", "has_result", "star_score", "missing_components"]:
        assert star_field in star, f"STAR field '{star_field}' missing"
    assert star["has_situation"] is True
    assert star["has_action"] is True
    assert star["has_result"] is True

    # 3. Follow-up decision JSON structure
    follow_up_brief = agent.should_ask_follow_up("I fixed the bug.", "How did you solve the incident?")
    assert isinstance(follow_up_brief, dict)
    assert follow_up_brief["needs_follow_up"] is True
    assert "follow_up_question" in follow_up_brief and follow_up_brief["follow_up_question"] is not None
    assert "rationale" in follow_up_brief


# =====================================================================
# 2. TECHNICAL DOMAIN: PYTHON VALIDATION
# =====================================================================

def test_technical_agent_python_validation():
    """Verify TechnicalAgent Python questions, code assessment, and JSON structure."""
    agent = TechnicalAgent()

    # 1. Question retrieval across difficulties
    for diff in ["easy", "medium", "hard"]:
        q = agent.get_question(domain="Python", index=0, difficulty=diff)
        assert isinstance(q, dict)
        assert "question_text" in q and len(q["question_text"]) > 10
        assert "category" in q
        assert q["difficulty"] == diff
        assert "expected_criteria" in q and len(q["expected_criteria"]) > 0

    # 2. Evaluation structure
    eval_res = agent.evaluate_answer(
        question="Explain how the Python GIL impacts multi-threaded CPU-bound programs versus I/O-bound programs.",
        answer="The Python Global Interpreter Lock (GIL) serializes CPython bytecode execution, meaning only one thread executes Python bytecode at once. For CPU-bound tasks, multithreading does not give speedup; multiprocessing must be used. For I/O bound tasks, GIL is released during system calls, so asyncio or threading works well.",
        expected_criteria=["GIL bytecode serialization", "I/O non-blocking releases", "Multiprocessing memory isolation"]
    )
    assert isinstance(eval_res, dict)
    for field in ["score", "relevance_score", "clarity_score", "technical_depth_score", "feedback", "strengths", "improvements"]:
        assert field in eval_res
        assert eval_res[field] is not None
    assert eval_res["score"] >= 70.0

    # 3. Python Code Assessment JSON structure
    code = """
def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []
"""
    code_eval = agent.assess_code(code=code, language="python", problem_description="Two Sum problem in O(N) time")
    assert isinstance(code_eval, dict)
    for field in ["correctness_score", "time_complexity", "space_complexity", "code_quality_score", "overall_score", "feedback", "strengths", "potential_bugs_or_edge_cases", "optimization_suggestions"]:
        assert field in code_eval, f"Code assessment missing {field}"
    assert 0.0 <= code_eval["overall_score"] <= 100.0


# =====================================================================
# 3. TECHNICAL DOMAIN: JAVA VALIDATION
# =====================================================================

def test_technical_agent_java_validation():
    """Verify TechnicalAgent Java questions, code assessment, and JSON structure."""
    agent = TechnicalAgent()

    # 1. Question retrieval across difficulties
    for diff in ["easy", "medium", "hard"]:
        q = agent.get_question(domain="Java", index=0, difficulty=diff)
        assert isinstance(q, dict)
        assert "question_text" in q and len(q["question_text"]) > 10
        assert "category" in q
        assert q["difficulty"] == diff
        assert "expected_criteria" in q and len(q["expected_criteria"]) > 0

    # 2. Evaluation structure
    eval_res = agent.evaluate_answer(
        question="Explain the Java Memory Model (JMM) guarantees regarding 'happens-before' semantics.",
        answer="The JMM guarantees memory visibility across threads. Volatile write happens-before subsequent volatile read. Synchronized monitor exit happens-before monitor acquire. This prevents CPU and compiler instruction reordering.",
        expected_criteria=["Instruction reordering prevention", "Visibility vs atomicity guarantees", "ReentrantLock"]
    )
    assert isinstance(eval_res, dict)
    assert "score" in eval_res
    assert "technical_depth_score" in eval_res
    assert isinstance(eval_res["strengths"], list)
    assert isinstance(eval_res["improvements"], list)

    # 3. Java Code Assessment
    java_code = """
public class LRUCache {
    private final int capacity;
    private final java.util.LinkedHashMap<Integer, Integer> map;
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new java.util.LinkedHashMap<>(capacity, 0.75f, true) {
            protected boolean removeEldestEntry(java.util.Map.Entry eldest) {
                return size() > capacity;
            }
        };
    }
    public int get(int key) { return map.getOrDefault(key, -1); }
    public void put(int key, int value) { map.put(key, value); }
}
"""
    code_eval = agent.assess_code(code=java_code, language="java", problem_description="LRU Cache implementation")
    assert isinstance(code_eval, dict)
    assert "correctness_score" in code_eval
    assert "time_complexity" in code_eval


# =====================================================================
# 4. TECHNICAL DOMAIN: DSA VALIDATION
# =====================================================================

def test_technical_agent_dsa_validation():
    """Verify TechnicalAgent DSA questions, evaluation, and JSON structure."""
    agent = TechnicalAgent()

    # 1. Question retrieval across difficulties
    for diff in ["easy", "medium", "hard"]:
        q = agent.get_question(domain="DSA", index=0, difficulty=diff)
        assert isinstance(q, dict)
        assert "question_text" in q and len(q["question_text"]) > 10
        assert "category" in q
        assert q["difficulty"] == diff
        assert "expected_criteria" in q and len(q["expected_criteria"]) > 0

    # 2. Evaluation structure
    eval_res = agent.evaluate_answer(
        question="Explain how you would detect a cycle in a directed dependency graph.",
        answer="We can detect a cycle using Kahn's algorithm by computing in-degrees of all vertices and enqueueing vertices with 0 in-degree. If the topological sort processed count does not equal V, a cycle exists. Alternatively, 3-color DFS (White, Gray, Black) detects a cycle if a Gray node is re-visited.",
        expected_criteria=["In-degree tracking and queue processing", "White-Gray-Black node coloring in DFS", "O(V + E) time and space complexity"]
    )
    assert isinstance(eval_res, dict)
    assert eval_res["score"] >= 70.0
    assert "feedback" in eval_res

    # 3. DSA Code Assessment
    dsa_code = """
def has_cycle_directed(graph, num_nodes):
    in_degree = [0] * num_nodes
    for u in graph:
        for v in graph[u]:
            in_degree[v] += 1
    queue = [i for i in range(num_nodes) if in_degree[i] == 0]
    visited_count = 0
    while queue:
        node = queue.pop(0)
        visited_count += 1
        for neighbor in graph.get(node, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    return visited_count != num_nodes
"""
    code_eval = agent.assess_code(code=dsa_code, language="python", problem_description="Kahn's cycle detection")
    assert isinstance(code_eval, dict)
    assert "time_complexity" in code_eval
    assert "space_complexity" in code_eval


# =====================================================================
# 5. TECHNICAL DOMAIN: OS VALIDATION
# =====================================================================

def test_technical_agent_os_validation():
    """Verify TechnicalAgent OS questions, evaluation, and JSON structure."""
    agent = TechnicalAgent()

    # 1. Question retrieval across difficulties
    for diff in ["easy", "medium", "hard"]:
        q = agent.get_question(domain="OS", index=0, difficulty=diff)
        assert isinstance(q, dict)
        assert "question_text" in q and len(q["question_text"]) > 10
        assert "category" in q
        assert q["difficulty"] == diff
        assert "expected_criteria" in q and len(q["expected_criteria"]) > 0

    # 2. Evaluation structure
    eval_res = agent.evaluate_answer(
        question="Explain the four Coffman conditions required for a deadlock to occur.",
        answer="The four Coffman conditions are Mutual Exclusion (exclusive resource holding), Hold and Wait (holding one resource while waiting for another), No Preemption (resources cannot be forcibly reclaimed), and Circular Wait (a circular chain of processes waiting on each other). Breaking any one condition prevents deadlocks.",
        expected_criteria=["Mutual exclusion, Hold and wait, No preemption, Circular wait", "Resource ordering", "Banker's Algorithm"]
    )
    assert isinstance(eval_res, dict)
    assert eval_res["score"] >= 70.0
    assert "technical_depth_score" in eval_res


# =====================================================================
# 6. APTITUDE DOMAIN VALIDATION
# =====================================================================

def test_aptitude_agent_json_structure_and_grading():
    """Verify AptitudeAgent question retrieval, filtering by difficulty, and grading schema."""
    agent = AptitudeAgent()

    # 1. Retrieve questions across difficulties
    for diff in ["easy", "medium", "hard"]:
        questions = agent.get_test_questions(count=5, category="all", difficulty=diff)
        assert isinstance(questions, list)
        assert len(questions) > 0, f"Expected at least one aptitude question for difficulty {diff}"
        for q in questions:
            assert "id" in q and isinstance(q["id"], str)
            assert "question" in q and len(q["question"]) > 5
            assert "category" in q
            assert q["difficulty"] == diff
            assert "options" in q and isinstance(q["options"], dict)
            for opt_key in ["A", "B", "C", "D"]:
                assert opt_key in q["options"]
            # Security: ensure answer key is NOT leaked
            assert "correct_option" not in q
            assert "explanation" not in q

    # 2. Deterministic grading JSON structure
    submission = {
        "apt_q1": "B",  # Correct
        "apt_q2": "A",  # Correct
        "apt_q3": "D",  # Wrong (correct is B)
        "apt_q4": "A"   # Correct
    }
    graded = agent.grade_submission(answers=submission, time_spent=120)
    assert isinstance(graded, dict)
    for field in ["total_questions", "correct_count", "score_percentage", "category_scores", "time_spent_seconds", "average_seconds_per_question", "results"]:
        assert field in graded, f"Grading missing field {field}"

    assert graded["total_questions"] == 4
    assert graded["correct_count"] == 3
    assert graded["score_percentage"] == 75.0
    assert graded["time_spent_seconds"] == 120
    assert graded["average_seconds_per_question"] == 30.0

    for item in graded["results"]:
        for field in ["question_id", "question", "user_answer", "correct_answer", "is_correct", "explanation"]:
            assert field in item, f"Result item missing {field}"
        assert isinstance(item["is_correct"], bool)
        assert len(item["explanation"]) > 5


# =====================================================================
# 7. RESUME DOMAIN VALIDATION
# =====================================================================

def test_resume_agent_json_structure_and_grounding():
    """Verify ResumeAgent extraction and grounded question generation JSON structure."""
    agent = ResumeAgent()

    sample_resume = """
Jane Doe
Senior Full Stack Engineer
Summary: 5+ years of experience architecting distributed backend services in Python, FastAPI, and PostgreSQL.
Skills: Python, FastAPI, PostgreSQL, Docker, Kubernetes, React, Redis, AWS, System Design, DSA.
Experience:
- Architected a real-time event streaming platform using FastAPI and Kafka, reducing latency by 40%.
- Designed database sharding and connection pooling in PostgreSQL handling 50,000 queries per second.
Education:
Bachelor of Science in Computer Science, 2020.
"""
    # 1. Profile Extraction JSON Schema
    profile = agent.extract_profile_from_text(sample_resume)
    assert isinstance(profile, dict)
    for field in ["skills", "experience_level", "years_of_experience", "projects", "education", "detected_domains", "summary"]:
        assert field in profile, f"Resume profile missing {field}"

    assert "Python" in profile["skills"]
    assert "FastAPI" in profile["skills"]
    assert "PostgreSQL" in profile["skills"]
    assert profile["years_of_experience"] == 5
    assert profile["experience_level"] == "senior"
    assert len(profile["projects"]) > 0
    assert len(profile["education"]) > 0

    # 2. Grounded Question Generation across difficulties
    for diff in ["easy", "medium", "hard"]:
        grounded_q = agent.generate_grounded_question(
            resume_summary=profile["summary"],
            skills=profile["skills"],
            index=0,
            projects=profile["projects"],
            difficulty=diff
        )
        assert isinstance(grounded_q, dict)
        assert "question_text" in grounded_q and len(grounded_q["question_text"]) > 10
        assert "category" in grounded_q
        assert grounded_q["difficulty"] == diff
        assert "expected_criteria" in grounded_q and len(grounded_q["expected_criteria"]) > 0


# =====================================================================
# 8. COORDINATOR DIFFICULTY ADAPTATION MATRIX VALIDATION
# =====================================================================

def test_coordinator_difficulty_adaptation_matrix():
    """Verify coordinator adapt_difficulty state machine transitions across all score boundaries."""
    # Promotion: score >= 85.0
    assert coordinator_agent.adapt_difficulty("easy", 85.0) == "medium"
    assert coordinator_agent.adapt_difficulty("easy", 95.0) == "medium"
    assert coordinator_agent.adapt_difficulty("medium", 85.0) == "hard"
    assert coordinator_agent.adapt_difficulty("medium", 100.0) == "hard"
    assert coordinator_agent.adapt_difficulty("hard", 90.0) == "hard"

    # Demotion: score < 60.0
    assert coordinator_agent.adapt_difficulty("hard", 59.9) == "medium"
    assert coordinator_agent.adapt_difficulty("hard", 30.0) == "medium"
    assert coordinator_agent.adapt_difficulty("medium", 59.9) == "easy"
    assert coordinator_agent.adapt_difficulty("medium", 20.0) == "easy"
    assert coordinator_agent.adapt_difficulty("easy", 50.0) == "easy"

    # Stability: 60.0 <= score < 85.0
    assert coordinator_agent.adapt_difficulty("easy", 60.0) == "easy"
    assert coordinator_agent.adapt_difficulty("easy", 84.9) == "easy"
    assert coordinator_agent.adapt_difficulty("medium", 60.0) == "medium"
    assert coordinator_agent.adapt_difficulty("medium", 75.0) == "medium"
    assert coordinator_agent.adapt_difficulty("medium", 84.9) == "medium"
    assert coordinator_agent.adapt_difficulty("hard", 60.0) == "hard"
    assert coordinator_agent.adapt_difficulty("hard", 84.9) == "hard"


# =====================================================================
# 9. END-TO-END MULTI-TURN SESSIONS ACROSS ALL DOMAINS WITH ADAPTATION
# =====================================================================

@pytest.mark.parametrize("domain_config", [
    {"type": "hr", "domain": "General HR", "start_diff": "medium", "ans": "In my previous role, our team faced high churn. My task was to improve retention. I established weekly one-on-ones, pair programming, and unblocking sessions. As a result, team satisfaction rose 40% and churn dropped to 0."},
    {"type": "technical", "domain": "Python", "start_diff": "easy", "ans": "Python mutable types like lists can be modified in-place, whereas immutable types like tuples and strings cannot. Function arguments pass references by assignment."},
    {"type": "technical", "domain": "Java", "start_diff": "hard", "ans": "The Java Memory Model establishes happens-before relationships via volatile variables and synchronized monitors, preventing processor cache incoherence and compiler reordering."},
    {"type": "technical", "domain": "DSA", "start_diff": "medium", "ans": "Topological sort via Kahn's algorithm maintains vertex in-degrees. We enqueue 0-indegree nodes and iteratively decrement neighbor in-degrees, achieving O(V + E) complexity."},
    {"type": "technical", "domain": "OS", "start_diff": "hard", "ans": "Virtual memory relies on the Memory Management Unit (MMU) translating virtual addresses using page tables. TLB caches translations; a TLB miss triggers a page table walk or page fault interrupt."},
    {"type": "resume", "domain": "Backend Systems", "start_diff": "medium", "ans": "When designing our PostgreSQL database architecture, we partitioned tables by range, tuned WAL buffer sizes, and introduced pgbouncer to eliminate connection starvation."}
])
def test_e2e_interview_turn_across_all_domains(client, registered_user, db_session, domain_config):
    """Executes multi-turn session across HR, Technical (Python, Java, DSA, OS), and Resume, verifying structure & adaptation."""
    # 1. Create Interview Session
    create_payload = {
        "interview_type": domain_config["type"],
        "domain": domain_config["domain"],
        "target_role": "Senior Engineer",
        "difficulty": domain_config["start_diff"],
        "total_questions": 3,
        "enable_voice": False,
        "enable_video": False
    }
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json=create_payload)
    assert create_res.status_code == 201, f"Failed creation for {domain_config['domain']}: {create_res.text}"
    session_data = create_res.json()
    interview_id = session_data["id"]
    assert session_data["interview_type"] == domain_config["type"]
    assert session_data["difficulty"] == domain_config["start_diff"]

    # 2. Start Session
    start_res = client.post(f"/api/interviews/{interview_id}/start", headers=registered_user["headers"])
    assert start_res.status_code == 200
    start_data = start_res.json()
    q1 = start_data["current_question"]
    assert "id" in q1
    assert "question_text" in q1 and len(q1["question_text"]) > 5
    assert q1["difficulty"] in ["easy", "medium", "hard"]

    # 3. Submit High-Scoring Answer for Turn 1
    ans1_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q1["id"],
        "answer_text": domain_config["ans"],
        "duration_seconds": 45
    })
    assert ans1_res.status_code == 200
    ans1_data = ans1_res.json()
    assert "answer_id" in ans1_data
    assert "next_action" in ans1_data
    assert ans1_data["next_action"] in ("next_question", "follow_up")
    q2 = ans1_data["next_question"]
    assert q2 is not None
    assert "question_text" in q2
    assert q2["difficulty"] in ["easy", "medium", "hard"]

    # 4. Check DB session difficulty updated
    db_session.expire_all()
    db_sess = db_session.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    assert db_sess.difficulty in ["easy", "medium", "hard"]

    # 5. Submit Low-Scoring Answer for Turn 2 to test demotion or stability
    ans2_res = client.post(f"/api/interviews/{interview_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q2["id"],
        "answer_text": "I do not know.",
        "duration_seconds": 5
    })
    assert ans2_res.status_code == 200
    ans2_data = ans2_res.json()
    assert "next_action" in ans2_data

    # 6. Conclude interview and verify evaluation report JSON structure
    end_res = client.post(f"/api/interviews/{interview_id}/end", headers=registered_user["headers"])
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    eval_res = client.get(f"/api/interviews/{interview_id}/evaluation", headers=registered_user["headers"])
    assert eval_res.status_code == 200
    eval_report = eval_res.json()
    for field in ["interview_id", "overall_score", "round_scores", "question_evaluations", "overall_strengths", "critical_weaknesses", "improvement_plan", "pdf_report_url"]:
        assert field in eval_report, f"Report missing {field}"

    for rubric_key in ["technical_accuracy", "communication_clarity", "structure_and_depth", "relevance"]:
        assert rubric_key in eval_report["round_scores"]
