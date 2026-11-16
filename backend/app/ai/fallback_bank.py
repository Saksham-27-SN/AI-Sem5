import re
from typing import Dict, List, Any, Optional
from backend.app.ai.schemas import LabeledQuestion, InterviewQuestionSchema


class OfflineFallbackBank:
    """Pre-curated, high-fidelity offline question bank.
    
    All questions strictly adhere to InterviewQuestionSchema and are explicitly
    tagged with source='offline_bank' and is_fallback=True.
    """

    HR_QUESTIONS: Dict[str, List[Dict[str, Any]]] = {
        "easy": [
            {
                "question": "Could you walk me through your engineering background, key technical strengths, and what excites you about this role?",
                "intent": "Assess verbal introduction clarity, self-awareness, and intrinsic engineering motivation.",
                "difficulty": "easy",
                "category": "Introduction & Background",
                "expected_points": [
                    "Concise summary of relevant technical experience",
                    "Identification of core engineering strengths",
                    "Clear motivation and alignment with role expectations"
                ]
            },
            {
                "question": "How do you typically organize your daily work, prioritize competing tasks, and manage communication with teammates?",
                "intent": "Assess work organization, task prioritization, and collaboration habits.",
                "difficulty": "easy",
                "category": "Work Organization & Collaboration",
                "expected_points": [
                    "Use of structured planning or ticketing systems",
                    "Proactive communication of blockers",
                    "Balancing urgent requests against planned milestones"
                ]
            }
        ],
        "medium": [
            {
                "question": "Describe a specific situation where a critical production outage or major release risk occurred. What specific steps did you take to resolve it?",
                "intent": "Assess incident response, problem ownership, and structured STAR narrative.",
                "difficulty": "medium",
                "category": "Crisis Management & STAR",
                "expected_points": [
                    "Clear Situation context and specific Task responsibility",
                    "Decisive personal Actions taken (troubleshooting, triage, mitigation)",
                    "Measurable Result, impact metrics, and post-mortem preventative learnings"
                ]
            },
            {
                "question": "Tell me about a disagreement you had with a teammate or lead regarding technical architecture or code design. How was the consensus reached?",
                "intent": "Evaluate conflict resolution, data-driven argumentation, and team alignment.",
                "difficulty": "medium",
                "category": "Conflict & Team Dynamics",
                "expected_points": [
                    "Respectful listening and objective presentation of trade-offs",
                    "Use of benchmarks, data, or prototypes to inform decisions",
                    "Commitment to team consensus once a decision is made"
                ]
            },
            {
                "question": "Can you share an instance where you made a significant professional mistake? How did you acknowledge it and what changed afterwards?",
                "intent": "Evaluate accountability, intellectual honesty, and continuous improvement mindset.",
                "difficulty": "medium",
                "category": "Accountability & Growth",
                "expected_points": [
                    "Direct ownership without deflecting blame onto others",
                    "Immediate remediation and stakeholder communication",
                    "Implementation of guardrails or automated tests to prevent recurrence"
                ]
            }
        ],
        "hard": [
            {
                "question": "Describe how you navigate an engineering project characterized by ambiguous business requirements, conflicting stakeholder priorities, and tight deadlines.",
                "intent": "Assess senior-level ambiguity navigation, scope negotiation, and leadership.",
                "difficulty": "hard",
                "category": "Ambiguity & Stakeholder Negotiation",
                "expected_points": [
                    "Techniques for decomposing ambiguous goals into verifiable milestones",
                    "Direct negotiation with product and executive stakeholders on trade-offs",
                    "Risk mitigation strategies and phased progressive delivery"
                ]
            },
            {
                "question": "How do you systematically balance paying down accumulated technical debt against the unrelenting pressure to deliver new product features?",
                "intent": "Evaluate engineering stewardship, pragmatic trade-offs, and executive communication.",
                "difficulty": "hard",
                "category": "Technical Debt & Strategy",
                "expected_points": [
                    "Quantifying technical debt impact in business terms (uptime, velocity, cost)",
                    "Allocating fixed maintenance budgets or iterative refactoring sprints",
                    "Establishing automated metrics and architectural fitness functions"
                ]
            }
        ]
    }

    TECHNICAL_QUESTIONS: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
        "Python": {
            "easy": [
                {
                    "question": "What is the distinction between mutable and immutable types in Python? How does Python's pass-by-object-reference mechanism behave for each?",
                    "intent": "Evaluate fundamental Python data model understanding and memory semantics.",
                    "difficulty": "easy",
                    "category": "Python Fundamentals",
                    "expected_points": [
                        "Lists/dicts/sets as mutable vs int/str/tuple as immutable",
                        "Behavior of in-place modifications vs re-binding in function arguments",
                        "Impact on object identity (id()) versus value equality (==)"
                    ]
                }
            ],
            "medium": [
                {
                    "question": "Explain the mechanics of Python's Global Interpreter Lock (GIL). How does it affect multithreaded CPU-bound tasks versus I/O-bound tasks, and what alternatives exist?",
                    "intent": "Assess concurrency architecture, thread scheduling, and runtime limitations.",
                    "difficulty": "medium",
                    "category": "Concurrency & Internals",
                    "expected_points": [
                        "GIL serialization of bytecode execution on a single OS thread",
                        "Why I/O tasks release the GIL during network/disk waits",
                        "Multiprocessing isolation vs asyncio single-threaded cooperative multitasking"
                    ]
                },
                {
                    "question": "How do Python dictionaries achieve average O(1) time complexity? What occurs internally during hash collisions and when table resizing is triggered?",
                    "intent": "Evaluate data structure internals, open addressing, and compact dict memory layouts.",
                    "difficulty": "medium",
                    "category": "Data Structures & Internals",
                    "expected_points": [
                        "Hash function computation and index probing via open addressing",
                        "Perturbation shift strategy to minimize clustering",
                        "Compact dict layout splitting indices array and entries array (PEP 468)"
                    ]
                }
            ],
            "hard": [
                {
                    "question": "Detail the inner workings of Python's garbage collection system. How do reference counting and generational cyclic GC interact, and how do __del__ finalizers complicate cycle destruction?",
                    "intent": "Assess deep runtime memory management and cycle detection algorithms.",
                    "difficulty": "hard",
                    "category": "Memory & Garbage Collection",
                    "expected_points": [
                        "Deterministic reference counting deallocation when refcount reaches zero",
                        "Tri-color marking algorithm across Gen 0, 1, and 2 generational heaps",
                        "Handling of circular references and uncollectable cycles"
                    ]
                }
            ]
        },
        "General": {
            "easy": [
                {
                    "question": "Explain the difference between a Process and a Thread in modern operating systems. When would you prefer one over the other?",
                    "intent": "Evaluate fundamental systems programming and OS concurrency concepts.",
                    "difficulty": "easy",
                    "category": "Operating Systems",
                    "expected_points": [
                        "Processes have isolated virtual address spaces; threads share memory",
                        "Thread context switching overhead is lower than process switching",
                        "Crash isolation and security advantages of multi-process architectures"
                    ]
                }
            ],
            "medium": [
                {
                    "question": "Explain how database indexing using B+ Trees works. Why are B+ Trees preferred over binary search trees for disk-based storage engines?",
                    "intent": "Assess database storage engines, disk I/O optimization, and tree fan-out.",
                    "difficulty": "medium",
                    "category": "Databases & Storage",
                    "expected_points": [
                        "High fan-out minimizes tree height and disk block read operations",
                        "Leaf nodes linked sequentially facilitate efficient range scans",
                        "Internal nodes store only keys, maximizing node capacity per disk block"
                    ]
                },
                {
                    "question": "Describe the CAP Theorem and explain the practical trade-offs between consistency and availability during a network partition in distributed systems.",
                    "intent": "Evaluate distributed systems fundamentals and architectural trade-offs.",
                    "difficulty": "medium",
                    "category": "Distributed Systems",
                    "expected_points": [
                        "Network partition (P) is unavoidable in real distributed networks",
                        "CP systems prioritize strict consistency by rejecting writes when out-of-sync",
                        "AP systems prioritize availability and eventual consistency"
                    ]
                }
            ],
            "hard": [
                {
                    "question": "Design a distributed rate limiter capable of handling 500,000 requests per second across globally distributed regions with sub-5ms latency and strict fairness.",
                    "intent": "Assess large-scale distributed system design, synchronization, and race condition handling.",
                    "difficulty": "hard",
                    "category": "System Design",
                    "expected_points": [
                        "Token Bucket or Sliding Window Log/Counter algorithm choice",
                        "Redis cluster with Lua scripts for atomic increments vs local in-memory batching",
                        "Handling multi-region replication latency and clock drift"
                    ]
                }
            ]
        }
    }

    @classmethod
    def normalize_difficulty(cls, difficulty: Optional[str]) -> str:
        if not difficulty:
            return "medium"
        diff = difficulty.strip().lower()
        return diff if diff in ("easy", "medium", "hard") else "medium"

    @classmethod
    def get_fallback_question(
        cls,
        round_type: str = "hr",
        difficulty: str = "medium",
        domain: Optional[str] = None,
        index: int = 0
    ) -> LabeledQuestion:
        """Retrieves a curated question from the offline bank labeled with source='offline_bank' and is_fallback=True."""
        clean_round = (round_type or "hr").strip().lower()
        diff = cls.normalize_difficulty(difficulty)

        if clean_round == "hr":
            pool = cls.HR_QUESTIONS.get(diff, cls.HR_QUESTIONS["medium"])
            selected = pool[index % len(pool)]
        else:
            # Technical round
            clean_domain = "Python" if (domain and "python" in domain.lower()) else "General"
            domain_pool = cls.TECHNICAL_QUESTIONS.get(clean_domain, cls.TECHNICAL_QUESTIONS["General"])
            pool = domain_pool.get(diff, domain_pool.get("medium", cls.TECHNICAL_QUESTIONS["General"]["medium"]))
            selected = pool[index % len(pool)]

        return LabeledQuestion(
            question=selected["question"],
            intent=selected["intent"],
            difficulty=selected["difficulty"],
            expected_points=list(selected["expected_points"]),
            source="offline_bank",
            is_fallback=True,
            round_type=clean_round,
            category=selected.get("category", "General"),
            is_follow_up=False,
            parent_question=None
        )

    @classmethod
    def get_fallback_follow_up(
        cls,
        round_type: str = "hr",
        candidate_transcript: str = "",
        parent_question: Optional[str] = None,
        difficulty: str = "medium"
    ) -> LabeledQuestion:
        """Generates a structured follow-up question from offline bank guiding on STAR or trade-offs."""
        clean_round = (round_type or "hr").strip().lower()
        diff = cls.normalize_difficulty(difficulty)

        if clean_round == "hr":
            question_text = (
                "That provides a good starting point. To help evaluate your experience thoroughly, "
                "could you walk me through this using the STAR structure? Specifically, describe the "
                "Situation, the Task you owned, the concrete Actions you took, and the measurable Result or impact achieved."
            )
            intent = "Probe for structured STAR evidence (Situation, Task, Action, Result) following brief or evasive candidate answer."
            category = "Behavioral STAR Follow-up"
            expected_points = [
                "Articulation of specific Situation and Task boundaries",
                "Explicit personal Actions taken rather than vague team statements",
                "Quantifiable Result and retrospective engineering learning"
            ]
        else:
            question_text = (
                "Could you delve deeper into the architectural trade-offs of that approach? "
                "Specifically, what failure modes, edge cases, or performance bottlenecks did you consider, "
                "and what alternative designs did you reject?"
            )
            intent = "Probe for technical depth, failure mode awareness, and architectural trade-offs."
            category = "Technical Trade-off Follow-up"
            expected_points = [
                "Identification of concrete failure modes and edge cases",
                "Analysis of time/space complexity or latency trade-offs",
                "Justification of chosen architecture versus viable alternatives"
            ]

        return LabeledQuestion(
            question=question_text,
            intent=intent,
            difficulty=diff,
            expected_points=expected_points,
            source="offline_bank",
            is_fallback=True,
            round_type=clean_round,
            category=category,
            is_follow_up=True,
            parent_question=parent_question
        )


fallback_bank = OfflineFallbackBank()
