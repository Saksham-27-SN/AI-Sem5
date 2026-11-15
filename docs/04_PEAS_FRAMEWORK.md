# Formal PEAS Framework: Multi-Agent System Specification

**Author:** Master Orchestrator & Research Engineering Team  
**Project:** InterviewGenie AI  
**Academic Module:** Section 04 — Formal Agent Design & PEAS Analysis  
**Date:** November 2026  

---

## 1. Theoretical Foundations of Agent Specification

In modern artificial intelligence literature, as formalized by Russell and Norvig [1], an intelligent agent is defined as an entity that perceives its environment through **Sensors** and acts upon that environment through **Actuators**. The formal specification of an agent's rational design requires defining its **PEAS** properties:
- **P — Performance Measure:** The objective criterion by which the agent's success is quantified.
- **E — Environment:** The operational context, state space, and external variables.
- **A — Actuators:** The output mechanisms and actions the agent executes.
- **S — Sensors:** The perceptual inputs and telemetry the agent ingests.

In InterviewGenie AI, the interview simulation is decentralized across **six specialized autonomous agents**, each possessing an isolated cognitive scope, specialized prompt templates, and explicit input/output contracts.

```
+-------------------------------------------------------------------------------------------------+
|                       INTERVIEWGENIE AI: SIX-AGENT DECENTRALIZED TOPOLOGY                       |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|                                    +-----------------------+                                    |
|                                    |   Coordinator Agent   |                                    |
|                                    |   (FSM & Routing)     |                                    |
|                                    +-----------+-----------+                                    |
|                                                |                                                |
|                   +----------------------------+----------------------------+                   |
|                   |                            |                            |                   |
|        +----------v----------+      +----------v----------+      +----------v----------+        |
|        |      HR Agent       |      |   Technical Agent   |      |    Resume Agent     |        |
|        |   (STAR Behavioral) |      | (DSA, SysDesign, SE)|      | (Grounded Context)  |        |
|        +----------+----------+      +----------+----------+      +----------+----------+        |
|                   |                            |                            |                   |
|                   +----------------------------+----------------------------+                   |
|                                                |                                                |
|                   +----------------------------+----------------------------+                   |
|                   |                                                         |                   |
|        +----------v----------+                                   +----------v----------+        |
|        |   Aptitude Agent    |                                   |  Evaluation Agent   |        |
|        | (Psychometric MCQs) |                                   | (Deterministic PDF) |        |
|        +---------------------+                                   +---------------------+        |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Formal PEAS Breakdown for All Six Agents

### 2.1 Agent 1: Coordinator Agent (`CoordinatorAgent`)
- **Primary Role:** Global session state machine manager, turn routing, and closed-loop difficulty adaptation.
- **Agent Function:** $f_{coord}: \mathcal{H}_{t} \times \mathcal{M}_{session} \to \{\text{next\_question}, \text{follow\_up}, \text{completed}\} \times \mathcal{D}$ where $\mathcal{D} \in \{\text{easy}, \text{medium}, \text{hard}\}$.

| Component | Detailed Specification |
| :--- | :--- |
| **Performance Measure ($P$)** | - 100% adherence to interview state machine transition invariants.<br>- Turn-taking latency $< 200\text{ms}$ for routing decisions.<br>- Difficulty convergence rate (adapting to candidate ability within $\le 2$ turns).<br>- Zero deadlock or infinite loop states. |
| **Environment ($E$)** | - Active interview session state in database (`interview_sessions`).<br>- Candidate target role, domain, difficulty parameters.<br>- Turn history containing scores from prior questions.<br>- Client connection state (active, paused, disconnected). |
| **Actuators ($A$)** | - State transition events: `start`, `submit_answer`, `repeat_question`, `end`.<br>- Routing directives dispatching requests to domain agents (`HRAgent`, `TechnicalAgent`, etc.).<br>- Difficulty level adjustments: `easy`, `medium`, `hard`.<br>- Session termination triggers transitioning status to `evaluating`. |
| **Sensors ($S$)** | - Inbound HTTP REST turn requests (`POST /api/interviews/{id}/submit-answer`).<br>- Turn evaluation outputs (scores, strengths, weaknesses) emitted by domain agents.<br>- Candidate speech duration and audio cadence metrics (WPM, pause count).<br>- Question index counters ($q_i \text{ of } N$). |

---

### 2.2 Agent 2: HR / Behavioral Agent (`HRAgent`)
- **Primary Role:** Conducting behavioral, situational, and cultural competency assessments using the structured STAR methodology.
- **Agent Function:** $f_{hr}: \mathcal{T}_{candidate} \times \mathcal{C}_{STAR} \to \mathcal{Q}_{follow\_up} \cup \mathcal{E}_{behavioral}$.

| Component | Detailed Specification |
| :--- | :--- |
| **Performance Measure ($P$)** | - STAR framework extraction precision (identifying Situation, Task, Action, Result).<br>- Probing precision: $> 90\%$ accuracy in triggering follow-ups when candidates provide vague or incomplete answers.<br>- Absence of conversational hallucination or out-of-scope advice during the interview. |
| **Environment ($E$)** | - Catalog of behavioral competency questions categorized by domain (Conflict Resolution, Leadership, Failure Analysis, Ambiguity).<br>- Candidate audio transcripts and previous turn context. |
| **Actuators ($A$)** | - Emits structured STAR behavioral interview questions.<br>- Generates contextual follow-up probes targeting missing STAR dimensions (e.g., *"What specific quantitative metric proved the success of that action?"*).<br>- Produces structured JSON evaluations with per-turn scores ($0-100$). |
| **Sensors ($S$)** | - Candidate transcribed speech text ($\mathcal{T}_{candidate}$).<br>- Elapsed answering time (seconds).<br>- Expected behavioral criteria vector $\vec{C}_{exp}$. |

---

### 2.3 Agent 3: Technical & Coding Agent (`TechnicalAgent`)
- **Primary Role:** Assessing domain-specific technical capabilities across Software Engineering, DSA, System Architecture, Databases, Concurrency, and AI/ML.
- **Agent Function:** $f_{tech}: \mathcal{D}_{topic} \times \mathcal{T}_{answer} \times \mathcal{K}_{criteria} \to \mathcal{S}_{depth} \times \mathcal{F}_{technical}$.

| Component | Detailed Specification |
| :--- | :--- |
| **Performance Measure ($P$)** | - Technical correctness verification accuracy against industry standards.<br>- Algorithmic complexity identification (Big-O time and space accuracy).<br>- Precision in detecting subtle architectural vulnerabilities (e.g., race conditions, lock contention, memory leaks).<br>- Zero false positives on valid alternative technical architectures. |
| **Environment ($E$)** | - Technical domain question bank (Python, Java, Systems Design, DBMS, Networks, Concurrency).<br>- Expected technical criteria vectors (e.g., `["Process vs thread memory space", "GIL / synchronization locks", "Eviction strategy"]`). |
| **Actuators ($A$)** | - Generates domain-specific architecture and coding prompts.<br>- Emits technical follow-up questions targeting edge cases.<br>- Generates JSON evaluation objects containing: `technical_depth_score`, `relevance_score`, `strengths`, and `improvements`. |
| **Sensors ($S$)** | - Candidate submitted code snippets or verbal technical explanations.<br>- Domain selection string (`"Software Engineering"`, `"AI/ML"`, etc.).<br>- Current difficulty level parameter (`"easy"`, `"medium"`, `"hard"`). |

---

### 2.4 Agent 4: Aptitude & Reasoning Agent (`AptitudeAgent`)
- **Primary Role:** Generating and deterministically grading psychometric, quantitative, logical, and verbal reasoning assessments.
- **Agent Function:** $f_{apt}: \mathcal{K}_{bank} \times \mathcal{U}_{answers} \to \mathcal{G}_{deterministic} \times \mathcal{P}_{percentile}$.

| Component | Detailed Specification |
| :--- | :--- |
| **Performance Measure ($P$)** | - **100% Mathematical Grading Accuracy:** Deterministic evaluation with zero variance.<br>- Zero answer leakage: Complete masking of correct answers and explanations during test delivery.<br>- Category breakdown accuracy across Quantitative, Logical, and Verbal reasoning. |
| **Environment ($E$)** | - Calibrated multiple-choice question repository (`aptitude_questions` table).<br>- Active test session context and time limits. |
| **Actuators ($A$)** | - Emits randomized or category-filtered MCQ question sets (sanitized of answers).<br>- Executes deterministic comparison between candidate selections and ground-truth answer keys.<br>- Computes percentage scores, category performance vectors, and per-question explanations. |
| **Sensors ($S$)** | - Candidate option selections: $\mathcal{U}_{answers} = \{q_1: \text{"B"}, q_2: \text{"A"}, \dots\}$.<br>- Test duration and per-question timestamp telemetry. |

---

### 2.5 Agent 5: Resume Grounding Agent (`ResumeAgent`)
- **Primary Role:** Ingesting candidate resumes, extracting verified skills and experience, and generating grounded questions referencing real candidate achievements.
- **Agent Function:** $f_{resume}: \mathcal{B}_{PDF} \to \mathcal{T}_{extracted} \times \mathcal{K}_{skills} \times \mathcal{Q}_{grounded}$.

| Component | Detailed Specification |
| :--- | :--- |
| **Performance Measure ($P$)** | - High-fidelity textual extraction rate from multi-column PDF resumes ($> 98\%$ text recovery via PyMuPDF).<br>- Grounding fidelity: 100% of generated questions must reference an authentic project, tool, or achievement present in the candidate's resume.<br>- Zero hallucination of fictitious past employers or credentials. |
| **Environment ($E$)** | - Raw binary PDF streams uploaded by candidates.<br>- Candidate profile database (`profiles` table). |
| **Actuators ($A$)** | - Structured JSON extraction of: `extracted_skills`, `experience_years`, and `resume_summary`.<br>- Synthesizes highly contextualized, grounded interview questions targeting real project trade-offs and metrics. |
| **Sensors ($S$)** | - Multi-part file stream (`POST /api/profile/resume/upload`).<br>- Candidate profile target role and self-reported competencies. |

---

### 2.6 Agent 6: Evaluation & Feedback Agent (`EvaluationAgent`)
- **Primary Role:** Aggregating per-turn evaluations, computing deterministic multi-dimensional scores, synthesizing actionable study plans, and compiling PDF diagnostic reports.
- **Agent Function:** $f_{eval}: \sum_{i=1}^N \mathcal{E}_{turn_i} \to \mathcal{R}_{overall} \times \mathcal{P}_{study\_plan} \times \mathcal{B}_{PDF}$.

| Component | Detailed Specification |
| :--- | :--- |
| **Performance Measure ($P$)** | - Mathematical reproducibility: Zero score variance under identical input vectors.<br>- Deduplication efficiency: Eliminating redundant advice across questions.<br>- Actionability: 100% of study plan recommendations provide specific technical topics and remediation strategies.<br>- Sub-second PDF report compilation. |
| **Environment ($E$)** | - Complete interview history (all questions, candidate answers, and per-turn scoring records).<br>- Historical user profile performance data. |
| **Actuators ($A$)** | - Computes deterministic weighted composite scores:<br>  $$S_{\text{overall}} = 0.35 S_{\text{depth}} + 0.25 S_{\text{relevance}} + 0.25 S_{\text{clarity}} + 0.15 S_{\text{structure}}$$  <br>- Emits prioritized lists of top 4 unique strengths and top 4 actionable weaknesses.<br>- Compiles comprehensive, multi-page binary PDF evaluation reports via ReportLab. |
| **Sensors ($S$)** | - Database records from `answers` and `questions` tables for the target `interview_id`.<br>- Speech cadence metrics (average WPM, pause density). |

---

## 3. Formal Environmental Properties (Russell & Norvig Taxonomy)

Table 2 evaluates the operational environment of InterviewGenie AI across the seven standard dimensions of artificial intelligence environments.

### Table 2: Environmental Classification Matrix

| Dimension | Classification | Theoretical Justification |
| :--- | :--- | :--- |
| **Observability** | **Partially Observable** | The system perceives spoken/written text and cadence metrics, but cannot directly observe the candidate's internal cognitive state, real-time anxiety, or unstated technical knowledge. |
| **Determinism** | **Stochastic (LLM) / Deterministic (Rubric & Fallback)** | Natural language dialogue generation involves stochastic temperature sampling; however, the rubric scoring aggregation, FSM state transitions, and aptitude grading are **strictly deterministic**. |
| **Episodic vs. Sequential** | **Sequential** | Current candidate answers directly influence subsequent difficulty levels, follow-up question generation, and cumulative final evaluation reports. |
| **Static vs. Dynamic** | **Dynamic** | The interview session context evolves as time elapses; user-imposed timeouts and turn duration directly influence speech cadence metrics. |
| **Discrete vs. Continuous** | **Discrete** | Dialogue proceeds through distinct turns ($t = 1, 2, \dots, N$); state transitions occur on discrete event triggers (HTTP requests). |
| **Single vs. Multi-Agent** | **Multi-Agent** | Six distinct software agents collaborate in a hub-and-spoke topology, interacting with the human candidate. |
| **Known vs. Unknown** | **Known** | The rules of the environment (API contracts, database schema, evaluation rubrics) are fully known and specified *a priori*. |

---

## 4. Inter-Agent Communication and Contract Matrix

All inter-agent communication follows strict typed Pydantic/JSON payloads. Table 3 formalizes the directional message routing.

### Table 3: Inter-Agent Routing and Payload Specifications

| Source Agent | Destination Agent | Trigger Event | Payload Content |
| :--- | :--- | :--- | :--- |
| `Client / Router` | `CoordinatorAgent` | `POST /interviews/{id}/start` | `{interview_type, domain, difficulty, resume_summary}` |
| `CoordinatorAgent` | `HRAgent` / `TechAgent` | Session Start / Turn Transition | `get_question(index, difficulty, domain)` |
| `HRAgent` / `TechAgent` | `CoordinatorAgent` | Question Generated | `{question_text, category, difficulty, expected_criteria}` |
| `Client / Router` | `CoordinatorAgent` | `POST /submit-answer` | `{question_id, answer_text, duration_seconds, speech_metrics}` |
| `CoordinatorAgent` | `HRAgent` / `TechAgent` | Turn Answer Ingestion | `evaluate_answer(question_text, answer_text, expected_criteria)` |
| `HRAgent` | `CoordinatorAgent` | Follow-up Analysis | `should_ask_follow_up(answer_text, question_text) -> {needs_follow_up, follow_up_question}` |
| `CoordinatorAgent` | `Client / Router` | Turn Processed | `{answer_id, next_action, next_question, progress}` |
| `CoordinatorAgent` | `EvaluationAgent` | Session Complete (`end`) | `aggregate_evaluation(question_evaluations_list)` |
| `EvaluationAgent` | `PDF Report Engine` | PDF Request | `generate_report_pdf(eval_data, user_profile, filename)` |

---

## References

1. S. Russell and P. Norvig, *Artificial Intelligence: A Modern Approach*, 4th ed. Pearson, 2020, pp. 36–58.
