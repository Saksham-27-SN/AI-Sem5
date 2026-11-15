import re
from typing import Dict, Any, List, Optional
from ai_engine.base import BaseAgent
from ai_engine.gemini_client import gemini_client

class TechnicalAgent(BaseAgent):
    """Conducts technical interviews across DSA, Systems, Languages, and Architecture."""

    SYSTEM_PROMPT = """You are a Principal Software Architect and Lead Technical Interviewer.
You evaluate candidates on:
1. Architectural depth and foundational computer science principles.
2. Clean code, time/space complexity awareness, and edge-case handling.
3. Scalability, data integrity, and pragmatic engineering trade-offs.
Output strictly valid JSON without extraneous text."""

    TECHNICAL_TOPIC_BANK: Dict[str, List[Dict[str, Any]]] = {
        "Python": [
            {
                "category": "Python Internals & Concurrency",
                "question_text": "Explain how the Python Global Interpreter Lock (GIL) impacts multi-threaded CPU-bound programs versus I/O-bound programs. How do multiprocessing and asyncio overcome these limitations?",
                "expected_criteria": ["GIL bytecode serialization", "I/O non-blocking releases", "Multiprocessing memory isolation vs asyncio event loop"],
                "difficulty": "medium"
            },
            {
                "category": "Memory & Data Structures",
                "question_text": "How do Python dictionaries achieve O(1) average lookup time? What happens during a hash collision and when resizing occurs in modern Python (PEP 468/compact dict)?",
                "expected_criteria": ["Hash functions and modulo indexing", "Open addressing with perturbation", "Indices array and entries array split"],
                "difficulty": "hard"
            },
            {
                "category": "Metaprogramming & Generators",
                "question_text": "Explain how Python decorators work under the hood. What is the role of functools.wraps, and how do Python generators manage execution suspension with yield?",
                "expected_criteria": ["Higher-order functions & closures", "Preserving docstrings and metadata with wraps", "Frame objects and generator state machine"],
                "difficulty": "medium"
            }
        ],
        "Java": [
            {
                "category": "JVM Architecture & Memory",
                "question_text": "Describe the memory layout of the JVM (Heap, Stack, Metaspace) and explain the lifecycle of an object from Eden space to Tenured generation in the G1 Garbage Collector.",
                "expected_criteria": ["Generational hypothesis", "Eden/Survivor spaces copy collector", "Tenuring threshold and concurrent marking"],
                "difficulty": "hard"
            },
            {
                "category": "Java Concurrency & Memory Model",
                "question_text": "Explain the Java Memory Model (JMM) guarantees regarding 'happens-before' semantics. What is the difference between volatile variables, synchronized blocks, and ReentrantLock?",
                "expected_criteria": ["Instruction reordering prevention", "Visibility vs atomicity guarantees", "Fairness policies and condition variables in ReentrantLock"],
                "difficulty": "hard"
            },
            {
                "category": "Collections & Generics",
                "question_text": "How does ConcurrentHashMap achieve high throughput compared to Hashtable or Collections.synchronizedMap? Explain the evolution from segment locking to bucket-level CAS in Java 8.",
                "expected_criteria": ["Segment locking in Java 7", "CAS operations and synchronized bucket heads in Java 8", "Treeification of buckets on collisions (O(log N))"],
                "difficulty": "medium"
            }
        ],
        "DSA": [
            {
                "category": "Algorithms & Streaming Data",
                "question_text": "Given a distributed log stream with millions of timestamps, how would you design an algorithm to find the top 100 most frequent IP addresses in near real-time?",
                "expected_criteria": ["Min-Heap / Count-Min Sketch", "Hash map frequency counting", "Streaming windowing trade-offs"],
                "difficulty": "medium"
            },
            {
                "category": "Graphs & Topological Sort",
                "question_text": "Describe how you would detect a cycle in a directed dependency graph (e.g., a build system package resolver) using Kahn's algorithm or DFS with three colors.",
                "expected_criteria": ["In-degree tracking and queue processing (Kahn's)", "White-Gray-Black node coloring in DFS", "O(V + E) time and space complexity"],
                "difficulty": "medium"
            },
            {
                "category": "Dynamic Programming & Optimization",
                "question_text": "Explain the concept of overlapping subproblems and optimal substructure. How would you solve the Longest Increasing Subsequence (LIS) problem in O(N log N) time?",
                "expected_criteria": ["O(N^2) memoization vs O(N log N) patience sorting / binary search", "Tails array state invariant", "Binary search insertion index finding"],
                "difficulty": "hard"
            }
        ],
        "DBMS": [
            {
                "category": "Concurrency & Isolation",
                "question_text": "Differentiate between Optimistic Concurrency Control (OCC) and Pessimistic Concurrency Control (PCC) in high-throughput database transactions. What are dirty reads, non-repeatable reads, and phantom reads?",
                "expected_criteria": ["Row-level locking vs version check at commit", "ACID isolation levels (Read Committed, Repeatable Read, Serializable)", "Lock contention vs retry overhead"],
                "difficulty": "medium"
            },
            {
                "category": "Indexing & Storage Engines",
                "question_text": "Explain the architectural trade-offs between B+ Trees and Log-Structured Merge (LSM) Trees. Which is better suited for write-heavy workloads vs read-heavy workloads and why?",
                "expected_criteria": ["B+ Tree in-place page updates vs LSM append-only sequential writes", "Memtable, WAL, SSTables, and compaction overhead", "Write amplification vs read latency"],
                "difficulty": "hard"
            },
            {
                "category": "Sharding & Consistency",
                "question_text": "What are the core challenges of horizontal database sharding? How does consistent hashing mitigate rebalancing overhead when adding or removing database nodes?",
                "expected_criteria": ["Hash ring partition mechanism", "Virtual nodes for uniform distribution", "Cross-shard queries and 2-phase commit (2PC) trade-offs"],
                "difficulty": "hard"
            }
        ],
        "OS": [
            {
                "category": "Systems & Concurrency",
                "question_text": "Explain the four Coffman conditions required for a deadlock to occur. How can an operating system or distributed system prevent or detect deadlocks?",
                "expected_criteria": ["Mutual exclusion, Hold and wait, No preemption, Circular wait", "Resource ordering", "Banker's Algorithm / Wait-For graph"],
                "difficulty": "hard"
            },
            {
                "category": "Virtual Memory & Paging",
                "question_text": "How does the virtual memory system map virtual addresses to physical RAM? Explain the roles of the MMU, Multi-level Page Tables, TLB, and page fault handling.",
                "expected_criteria": ["Virtual to physical translation via page tables", "TLB caching and miss latency", "Demand paging, page fault ISR, and page replacement (LRU/Clock)"],
                "difficulty": "hard"
            },
            {
                "category": "I/O Multiplexing & Process Models",
                "question_text": "What is the difference between select, poll, and epoll in Linux? Why is epoll preferred for high-concurrency network servers handling tens of thousands of connections?",
                "expected_criteria": ["O(N) descriptor iteration vs O(1) ready list notification", "Red-black tree descriptor monitoring", "Edge-triggered vs level-triggered notifications"],
                "difficulty": "medium"
            }
        ],
        "Networks": [
            {
                "category": "Transport Layer Protocols",
                "question_text": "Walk through the TCP 3-way handshake and 4-way termination handshake. What is the purpose of the TIME_WAIT state, and what problems occur if it is prematurely closed?",
                "expected_criteria": ["SYN, SYN-ACK, ACK sequence number synchronization", "FIN, ACK, FIN, ACK closure flow", "2 * MSL guard against delayed segments and socket reuse"],
                "difficulty": "medium"
            },
            {
                "category": "Application Protocols & Web Performance",
                "question_text": "Compare HTTP/1.1, HTTP/2, and HTTP/3. How do binary framing, multiplexing, header compression (HPACK/QPACK), and QUIC over UDP solve TCP head-of-line blocking?",
                "expected_criteria": ["HTTP/1.1 pipelining limitations", "HTTP/2 multiplexed streams over single TCP connection", "QUIC connection migration and independent UDP streams"],
                "difficulty": "hard"
            },
            {
                "category": "Security & Resolution",
                "question_text": "Explain how the TLS 1.3 handshake establishes an encrypted, authenticated session. How does it improve latency and security over TLS 1.2?",
                "expected_criteria": ["1-RTT handshake and 0-RTT early data", "Diffie-Hellman key exchange forward secrecy", "Deprecation of insecure ciphers and static RSA key exchange"],
                "difficulty": "medium"
            }
        ],
        "Web Dev": [
            {
                "category": "Browser Rendering & Optimization",
                "question_text": "Explain the browser Critical Rendering Path from HTML byte parsing to screen pixels. How do layout thrashing and repaint costs affect Core Web Vitals (LCP, INP, CLS)?",
                "expected_criteria": ["DOM and CSSOM parsing to Render Tree", "Layout/Reflow calculation vs Paint/Composite layers", "Minimizing DOM mutations and deferring non-critical scripts"],
                "difficulty": "medium"
            },
            {
                "category": "Architectures & Rendering Strategies",
                "question_text": "Compare Client-Side Rendering (CSR), Server-Side Rendering (SSR), and Static Site Generation (SSG). What are the hydration overhead and SEO implications of each?",
                "expected_criteria": ["Time to First Byte (TTFB) vs First Contentful Paint (FCP)", "Client-side hydration cost and Time to Interactive (TTI)", "Incremental Static Regeneration (ISR) trade-offs"],
                "difficulty": "medium"
            },
            {
                "category": "Web Security & Protocols",
                "question_text": "What is the Cross-Origin Resource Sharing (CORS) mechanism? Explain simple requests vs preflight OPTIONS requests, and how CORS differs from Cross-Site Scripting (XSS) and CSRF.",
                "expected_criteria": ["Same-Origin Policy (SOP) enforcement by browser", "Preflight OPTIONS request headers (Access-Control-Allow-Origin)", "Defense-in-depth: HttpOnly cookies, SameSite, CSP"],
                "difficulty": "hard"
            }
        ],
        "AI/ML": [
            {
                "category": "Deep Learning Architecture",
                "question_text": "Explain the Multi-Head Scaled Dot-Product Attention mechanism in Transformers. Why is scaling by sqrt(d_k) necessary, and what is the computational complexity relative to sequence length?",
                "expected_criteria": ["Query, Key, Value projection matrices", "Softmax gradient stabilization via scaling", "O(N^2) sequence length complexity & FlashAttention memory tiling"],
                "difficulty": "hard"
            },
            {
                "category": "Model Training & Optimization",
                "question_text": "How do you detect and mitigate overfitting in deep neural networks? Explain the mechanics of Dropout, L1/L2 Weight Decay, Batch Normalization, and Early Stopping.",
                "expected_criteria": ["Train vs validation loss divergence", "Dropout as ensemble approximation", "Batch Normalization internal covariate shift and gradient smoothing"],
                "difficulty": "medium"
            },
            {
                "category": "LLM Systems & Retrieval",
                "question_text": "Explain the architecture of a Retrieval-Augmented Generation (RAG) system. How do chunking strategies, vector embeddings, and Approximate Nearest Neighbor (ANN/HNSW) algorithms impact retrieval precision?",
                "expected_criteria": ["Document parsing and semantic chunking", "Embedding models and cosine similarity in vector space", "HNSW graph search trade-offs and re-ranking models"],
                "difficulty": "hard"
            }
        ]
    }

    DOMAIN_ALIASES = {
        "operating systems": "OS",
        "operating system": "OS",
        "os": "OS",
        "python": "Python",
        "java": "Java",
        "dsa": "DSA",
        "data structures and algorithms": "DSA",
        "data structures": "DSA",
        "dbms": "DBMS",
        "database": "DBMS",
        "databases": "DBMS",
        "networks": "Networks",
        "networking": "Networks",
        "computer networks": "Networks",
        "web dev": "Web Dev",
        "web development": "Web Dev",
        "frontend": "Web Dev",
        "backend web": "Web Dev",
        "ai/ml": "AI/ML",
        "ai": "AI/ML",
        "ml": "AI/ML",
        "machine learning": "AI/ML",
        "artificial intelligence": "AI/ML"
    }

    def __init__(self):
        super().__init__(name="Technical Interview Agent", role="Technical Assessment Specialist")

    def _normalize_domain(self, domain: Optional[str]) -> str:
        """Normalizes domain string using case-insensitivity and aliases."""
        if not domain:
            return "DSA"
        cleaned = domain.strip().lower()
        return self.DOMAIN_ALIASES.get(cleaned, "DSA" if cleaned not in [k.lower() for k in self.TECHNICAL_TOPIC_BANK] else domain.strip())

    def get_question(self, domain: str, index: int, difficulty: str = "medium") -> Dict[str, Any]:
        """Fetches technical question matching domain or generates dynamic question."""
        norm_domain = self._normalize_domain(domain)
        # Ensure we have a valid key from TECHNICAL_TOPIC_BANK
        target_bank = self.TECHNICAL_TOPIC_BANK.get(norm_domain)
        if not target_bank:
            # Check direct match or fallback to DSA
            target_bank = self.TECHNICAL_TOPIC_BANK.get(norm_domain, self.TECHNICAL_TOPIC_BANK["DSA"])

        if index < len(target_bank):
            q = target_bank[index]
            return {
                "question_text": q["question_text"],
                "category": q["category"],
                "difficulty": q["difficulty"],
                "expected_criteria": q["expected_criteria"]
            }

        prompt = f"""Generate a high-caliber technical interview question for domain '{norm_domain}', index {index + 1}, difficulty '{difficulty}'.
Return JSON format:
{{
  "question_text": "...",
  "category": "{norm_domain}",
  "difficulty": "{difficulty}",
  "expected_criteria": ["...", "..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        parsed = self.clean_json_response(raw)
        if "question_text" not in parsed:
            # Fallback to last question from topic bank
            fallback_q = target_bank[-1]
            return {
                "question_text": fallback_q["question_text"],
                "category": fallback_q["category"],
                "difficulty": difficulty,
                "expected_criteria": fallback_q["expected_criteria"]
            }
        return parsed

    def evaluate_answer(self, question: str, answer: str, expected_criteria: List[str]) -> Dict[str, Any]:
        """Evaluates candidate technical response against architectural depth and criteria."""
        prompt = f"""Evaluate technical answer.
Question: {question}
Expected Criteria: {expected_criteria}
Candidate Answer: {answer}

Return JSON format:
{{
  "score": float (0-100),
  "relevance_score": float (0-100),
  "clarity_score": float (0-100),
  "technical_depth_score": float (0-100),
  "feedback": "...",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)

        # Ensure all required evaluation fields exist with sensible fallbacks
        score = float(res.get("score", 75.0))
        return {
            "score": score,
            "relevance_score": float(res.get("relevance_score", score)),
            "clarity_score": float(res.get("clarity_score", score)),
            "technical_depth_score": float(res.get("technical_depth_score", score)),
            "feedback": str(res.get("feedback", "Technical response demonstrated acceptable baseline understanding.")),
            "strengths": list(res.get("strengths", ["Addressed core technical concept"])),
            "improvements": list(res.get("improvements", ["Provide deeper architectural trade-offs"]))
        }

    def assess_code(self, code: str, language: str = "python", problem_description: str = "") -> Dict[str, Any]:
        """Assesses code implementation for algorithmic correctness, time/space complexity, and code quality."""
        prompt = f"""Assess candidate code submission for language '{language}'.
Problem Description: {problem_description}
Code:
```{language}
{code}
```

Evaluate correctness, algorithmic efficiency (Big-O time and space complexity), code readability, and edge-case handling.
Return JSON format:
{{
  "correctness_score": float (0-100),
  "time_complexity": "string (e.g. O(N log N))",
  "space_complexity": "string (e.g. O(N))",
  "code_quality_score": float (0-100),
  "overall_score": float (0-100),
  "feedback": "summary assessment",
  "strengths": ["...", "..."],
  "potential_bugs_or_edge_cases": ["...", "..."],
  "optimization_suggestions": ["..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)

        return {
            "correctness_score": float(res.get("correctness_score", 85.0)),
            "time_complexity": str(res.get("time_complexity", "O(N)")),
            "space_complexity": str(res.get("space_complexity", "O(1)")),
            "code_quality_score": float(res.get("code_quality_score", 85.0)),
            "overall_score": float(res.get("overall_score", 85.0)),
            "feedback": str(res.get("feedback", "Code is functionally sound with clean structure.")),
            "strengths": list(res.get("strengths", ["Logical structure follows specifications"])),
            "potential_bugs_or_edge_cases": list(res.get("potential_bugs_or_edge_cases", ["Consider null and boundary inputs"])),
            "optimization_suggestions": list(res.get("optimization_suggestions", ["Profile with larger dataset workloads"]))
        }

    def should_ask_follow_up(self, answer: str, question: str) -> Dict[str, Any]:
        """Determines if a technical answer is too shallow or warrants probing on trade-offs."""
        word_count = len(answer.strip().split())
        if word_count < 25:
            return {
                "needs_follow_up": True,
                "follow_up_question": "Could you elaborate on the internal mechanics, edge cases, and runtime trade-offs of that approach?",
                "rationale": "Answer lacked sufficient technical depth and specificity."
            }

        prompt = f"""Analyze candidate technical answer to question: '{question}'.
Answer: '{answer}'
Decide if an interviewer should probe deeper on engineering trade-offs, scaling limits, or edge cases.
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
            "rationale": str(res.get("rationale", "Probing conceptual depth."))
        }
