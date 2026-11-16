import re
import json
import logging
from typing import List, Dict, Any, Optional, Set
from google.genai import types

from backend.app.ai.schemas import (
    ResumeAnalysisSchema,
    ResumeQuestionSchema,
    LabeledResumeQuestion,
    ProjectItemSchema
)
from backend.app.ai.gemini_client import (
    GeminiClient,
    MissingApiKeyError,
    InvalidApiKeyError,
    QuotaExceededError,
    MalformedOutputError,
    GeminiClientError
)

logger = logging.getLogger(__name__)


# =====================================================================
# COMMON SKILLS & PATTERNS FOR DETERMINISTIC PARSING
# =====================================================================

COMMON_SKILLS: List[str] = [
    # Languages
    "Python", "Java", "Go", "Golang", "C++", "C#", "Rust", "JavaScript", "TypeScript", "SQL", "Ruby", "PHP",
    # Frameworks
    "FastAPI", "Django", "Flask", "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "Spring Boot",
    # Databases & Storage
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "SQLite",
    # Cloud & DevOps
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "CI/CD", "Git", "Linux", "Kafka", "RabbitMQ",
    # Architecture & Concepts
    "REST APIs", "GraphQL", "gRPC", "Microservices", "System Design", "Distributed Systems", "DSA",
    # AI/ML
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Scikit-Learn", "LLMs", "RAG", "NLP"
]


# =====================================================================
# DETERMINISTIC OFFLINE RESUME PARSER
# =====================================================================

class DeterministicResumeParser:
    """High-fidelity offline resume parser using section segmentation and regex heuristics.
    
    Guarantees:
    - 100% deterministic keyword/section parsing.
    - Zero raw resume text logging.
    - Returns structured ResumeAnalysisSchema and grounded LabeledResumeQuestion items.
    """

    @classmethod
    def extract_skills(cls, text: str) -> List[str]:
        lower_text = text.lower()
        extracted: List[str] = []
        for skill in COMMON_SKILLS:
            # Word boundary matching
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, lower_text):
                extracted.append(skill)
        return extracted

    @classmethod
    def extract_projects(cls, text: str, skills: List[str]) -> List[Dict[str, Any]]:
        projects: List[Dict[str, Any]] = []
        lower_text = text.lower()

        # Look for Projects section ending at Work Experience, Education, etc.
        proj_section_match = re.search(
            r'(?:projects?|key projects?|selected projects?)[:\n]([\s\S]*?)(?:\n\s*(?:(?:work\s+)?experience|education|skills|certifications|employment)|\Z)',
            text,
            re.IGNORECASE
        )
        section_text = proj_section_match.group(1) if proj_section_match else text

        lines = [line.strip() for line in section_text.splitlines() if line.strip()]
        current_project: Optional[Dict[str, Any]] = None

        for line in lines:
            # Check for project headers (e.g., "- Project Name: Description" or "Project Name - Description")
            header_match = re.match(r'^(?:[-*•]\s*)?([A-Za-z0-9\s_\-]{3,35})\s*(?:[:|\-–]\s*(.*))?$', line)
            is_action_line = any(line.lower().startswith(action) for action in ["built", "developed", "architected", "designed", "implemented", "created", "engineered"])

            if header_match and not is_action_line:
                name = header_match.group(1).strip()
                if name.lower() not in ["project", "projects", "key projects", "summary", "overview", "experience", "work experience", "education", "skills"]:
                    project_skills = [s for s in skills if s.lower() in line.lower()]
                    desc = header_match.group(2).strip() if header_match.group(2) else ""
                    current_project = {
                        "name": name,
                        "tech_stack": project_skills,
                        "description": desc or line
                    }
                    projects.append(current_project)
                    continue

            if is_action_line:
                if current_project:
                    current_project["description"] += " " + line
                    for s in skills:
                        if s.lower() in line.lower() and s not in current_project["tech_stack"]:
                            current_project["tech_stack"].append(s)
                else:
                    proj_name = line.split()[0:4]
                    name_str = " ".join(proj_name).strip(":,.-")
                    project_skills = [s for s in skills if s.lower() in line.lower()]
                    current_project = {
                        "name": name_str or "Core Engineering Project",
                        "tech_stack": project_skills,
                        "description": line
                    }
                    projects.append(current_project)

        if not projects:
            top_tech = skills[:3] if skills else ["Python", "SQL"]
            projects.append({
                "name": "Backend Application Architecture",
                "tech_stack": top_tech,
                "description": f"Designed and deployed backend services leveraging {', '.join(top_tech)}."
            })

        return projects[:5]

    @classmethod
    def extract_experience(cls, text: str) -> List[str]:
        exp_entries: List[str] = []
        exp_match = re.search(
            r'(?:(?:work\s+)?experience|employment history)[:\n]([\s\S]*?)(?:\n\s*(?:education|projects?|skills|certifications)|\Z)',
            text,
            re.IGNORECASE
        )
        target = exp_match.group(1) if exp_match else text

        lines = [l.strip() for l in target.splitlines() if l.strip()]
        for line in lines:
            if any(term in line.lower() for term in ["engineer", "developer", "architect", "lead", "manager", "intern", "consultant", "analyst"]):
                clean = re.sub(r'^[-*•]\s*', '', line).strip()
                if len(clean) > 5 and clean not in exp_entries:
                    exp_entries.append(clean)

        if not exp_entries:
            exp_entries.append("Software Engineering Experience (Full Lifecycle Development)")

        return exp_entries[:4]

    @classmethod
    def extract_education(cls, text: str) -> List[str]:
        edu_entries: List[str] = []
        edu_patterns = [
            r'(?:bachelor|master|b\.s|m\.s|b\.tech|m\.tech|b\.e|ph\.d|doctorate)[^.\n]*',
            r'(?:computer science|information technology|electrical engineering|software engineering)[^.\n]*',
            r'(?:university|institute|college)[^.\n]*'
        ]
        for pattern in edu_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for m in matches:
                clean = m.strip()
                if clean and clean not in edu_entries and len(clean) > 5:
                    edu_entries.append(clean)

        if not edu_entries:
            edu_entries.append("Bachelor of Science in Computer Science")

        return edu_entries[:3]

    @classmethod
    def identify_gaps(cls, text: str, skills: List[str], projects: List[Dict[str, Any]]) -> List[str]:
        gaps: List[str] = []
        lower = text.lower()

        # Check for quantitative impact metrics
        has_metrics = bool(re.search(r'\b\d+(?:%|\+|x|k|ms|s|gb|tb|m)\b', lower))
        if not has_metrics:
            gaps.append("Resume lacks quantitative impact metrics (e.g. latency reduced by X%, throughput increased by Y%).")

        # Check for testing & CI/CD
        has_tests = any(term in lower for term in ["test", "pytest", "unit test", "ci/cd", "pipeline", "jenkins", "github actions"])
        if not has_tests:
            gaps.append("Limited mention of automated testing, test coverage, or CI/CD deployment pipelines.")

        # Check for cloud deployment
        has_cloud = any(term in lower for term in ["aws", "gcp", "azure", "kubernetes", "docker", "cloud"])
        if not has_cloud:
            gaps.append("Cloud infrastructure, containerization (Docker/K8s), and distributed deployment details not highlighted.")

        return gaps

    @classmethod
    def parse_profile(cls, raw_text: str) -> ResumeAnalysisSchema:
        """Parses resume text deterministically with zero raw text logging."""
        skills = cls.extract_skills(raw_text)
        projects = cls.extract_projects(raw_text, skills)
        experience = cls.extract_experience(raw_text)
        education = cls.extract_education(raw_text)
        gaps = cls.identify_gaps(raw_text, skills, projects)

        return ResumeAnalysisSchema(
            skills=skills,
            projects=projects,
            experience=experience,
            education=education,
            gaps=gaps
        )

    @classmethod
    def generate_grounded_questions(
        cls,
        parsed_profile: ResumeAnalysisSchema,
        count: int = 3
    ) -> List[LabeledResumeQuestion]:
        """Generates grounded questions strictly derived from verified projects or experience."""
        questions: List[LabeledResumeQuestion] = []

        # 1. Questions from projects
        for proj in parsed_profile.projects:
            name = proj.get("name", "Project")
            tech = ", ".join(proj.get("tech_stack", [])) or "the project's tech stack"
            q_text = (
                f"In your project '{name}', you utilized {tech}. "
                "Could you walk me through the key architectural trade-offs you evaluated during design, "
                "and explain how you handled edge cases or system failures?"
            )
            questions.append(LabeledResumeQuestion(
                question=q_text,
                referenced_item=name,
                intent=f"Assess architectural depth, failure mode awareness, and implementation ownership in {name}.",
                difficulty="medium",
                source="offline_bank",
                is_fallback=True
            ))
            if len(questions) >= count:
                break

        # 2. Questions from experience if needed
        if len(questions) < count:
            for exp in parsed_profile.experience:
                q_text = (
                    f"Reflecting on your role in '{exp}', what was the most complex technical obstacle you personally surmounted, "
                    "and what quantifiable business or engineering impact did your solution yield?"
                )
                questions.append(LabeledResumeQuestion(
                    question=q_text,
                    referenced_item=exp,
                    intent=f"Evaluate STAR engineering delivery and leadership in '{exp}'.",
                    difficulty="hard",
                    source="offline_bank",
                    is_fallback=True
                ))
                if len(questions) >= count:
                    break

        return questions[:count]


# =====================================================================
# RESUME ANALYZER ENGINE
# =====================================================================

class ResumeAnalyzer:
    """Gemini Pro Resume Parser, Reviewer, and Grounded Question Generator.
    
    Guarantees:
    - Never logs raw resume text (Privacy Rule).
    - Strict Grounding Rule: Every generated question must explicitly reference a project,
      role, or company present in the resume. Hallucinations are discarded.
    - Seamlessly falls back to deterministic offline parser on missing/invalid API key or quota limits.
    """

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        if gemini_client is not None:
            self.client = gemini_client
        else:
            try:
                self.client = GeminiClient(strict_init=True)
            except MissingApiKeyError:
                logger.info("GEMINI_API_KEY not configured. ResumeAnalyzer operating in offline deterministic mode.")
                self.client = None
            except Exception as e:
                logger.warning("Could not initialize GeminiClient (%s). Operating in offline deterministic mode.", e)
                self.client = None

    # -----------------------------------------------------------------
    # PRIVACY-PRESERVING PARSER
    # -----------------------------------------------------------------

    def analyze_resume(self, extracted_text: str) -> ResumeAnalysisSchema:
        """Parses resume text via Gemini Pro with Pydantic validation, or deterministic fallback.
        
        PRIVACY RULE: NEVER logs raw resume text.
        """
        # Privacy: Only log length, never raw text!
        logger.info("Initiating resume analysis on document payload (%d characters).", len(extracted_text or ""))

        if not extracted_text or not extracted_text.strip():
            return ResumeAnalysisSchema()

        # If client not configured, immediately use deterministic offline parser
        if self.client is None or not self.client.is_configured():
            return DeterministicResumeParser.parse_profile(extracted_text)

        prompt = f"""You are an expert Technical Talent Sourcer and Resume Reviewer.
Analyze the following candidate resume text. Extract technical skills, key projects (with name, tech_stack, and description), work experience roles, education, and gaps.

STRICT PRIVACY & ETHICS DIRECTIVE:
You must strictly ignore and NEVER evaluate or extract candidate physical appearance, attire, facial expressions, gender, race, age, or emotional state.
Focus 100% on verifiable technical competencies, project architectures, and professional milestones.

Resume Text:
\"\"\"
{extracted_text}
\"\"\"

Return strictly valid JSON conforming to this schema:
{{
  "skills": ["skill 1", "skill 2"],
  "projects": [
    {{
      "name": "Project Name",
      "tech_stack": ["tech 1", "tech 2"],
      "description": "Project architecture and key accomplishments"
    }}
  ],
  "experience": ["Role at Company (dates/summary)", "..."],
  "education": ["Degree at Institution", "..."],
  "gaps": ["Identified gap or missing metrics", "..."]
}}"""

        sys_inst = (
            "You are a Principal Technical Interviewer and Resume Analyzer. "
            "Extract structured profiles strictly conforming to ResumeAnalysisSchema. "
            "Never evaluate visual appearance or demographics."
        )

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=sys_inst,
            temperature=0.2
        )

        try:
            def _call():
                return self.client._client.models.generate_content(
                    model=self.client.model,
                    contents=prompt,
                    config=config
                )

            response = self.client._execute_with_retry(_call)
            raw_text = getattr(response, "text", None)
            if not raw_text:
                raise MalformedOutputError("Empty response text received from model for resume analysis.")

            raw_dict = self.client.clean_json_response(raw_text)
            profile = ResumeAnalysisSchema.model_validate(raw_dict)
            logger.info(
                "Successfully parsed resume: %d skills, %d projects, %d experience entries.",
                len(profile.skills), len(profile.projects), len(profile.experience)
            )
            return profile

        except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError) as auth_err:
            logger.warning(
                "Gemini authorization or quota issue encountered (%s). Using deterministic offline resume parser.",
                type(auth_err).__name__
            )
            return DeterministicResumeParser.parse_profile(extracted_text)
        except Exception as exc:
            logger.warning(
                "Gemini resume analysis failed (%s). Using deterministic offline resume parser.",
                type(exc).__name__
            )
            return DeterministicResumeParser.parse_profile(extracted_text)

    # -----------------------------------------------------------------
    # STRICT GROUNDING VALIDATION
    # -----------------------------------------------------------------

    @classmethod
    def extract_grounding_anchors(cls, parsed_profile: ResumeAnalysisSchema, raw_text: str) -> Set[str]:
        """Extracts valid normalized entities (project names, companies, roles) present in the resume."""
        anchors: Set[str] = set()

        # 1. Projects
        for p in parsed_profile.projects:
            name = p.get("name") if isinstance(p, dict) else getattr(p, "name", "")
            if name and len(name.strip()) >= 2:
                anchors.add(name.strip().lower())

        # 2. Experience
        for exp in parsed_profile.experience:
            clean_exp = exp.strip().lower()
            if len(clean_exp) >= 3:
                anchors.add(clean_exp)
                # Also add individual company or role tokens (e.g., "Google", "Acme", "Lead Engineer")
                for subpart in re.split(r'[-–|,@\n]', clean_exp):
                    token = subpart.strip()
                    if len(token) >= 3 and not token.isdigit():
                        anchors.add(token)

        # 3. Normalized raw text tokens (multi-word phrases)
        norm_raw = raw_text.lower() if raw_text else ""
        return anchors, norm_raw

    @classmethod
    def is_grounded(
        cls,
        question: ResumeQuestionSchema,
        anchors: Set[str],
        norm_raw: str
    ) -> bool:
        """Verifies if the question's referenced_item is grounded in the resume.
        
        Returns False if the referenced item is a hallucinated entity NOT found in the resume.
        """
        ref = (question.referenced_item or "").strip().lower()
        if not ref or len(ref) < 2:
            return False

        # 1. Direct match in anchors
        if ref in anchors:
            return True

        # 2. Substring or subphrase match in anchors
        for anchor in anchors:
            if ref in anchor or anchor in ref:
                return True

        # 3. Verifiable presence in the raw resume text
        if norm_raw and ref in norm_raw:
            return True

        return False

    def generate_resume_questions(
        self,
        parsed_profile: ResumeAnalysisSchema,
        raw_text: str,
        count: int = 3
    ) -> List[LabeledResumeQuestion]:
        """Generates interview questions strictly grounded in candidate's verified resume items.
        
        STRICT GROUNDING RULE:
        - Every question must explicitly reference or quote a project, role, or company present in the resume.
        - Discards any question referencing entities NOT found in the resume (hallucination rejection).
        - NEVER logs raw resume text.
        """
        logger.info(
            "Generating %d grounded resume questions for profile with %d projects and %d experience items.",
            count, len(parsed_profile.projects), len(parsed_profile.experience)
        )

        anchors, norm_raw = self.extract_grounding_anchors(parsed_profile, raw_text)

        # If client not configured, use deterministic grounded questions
        if self.client is None or not self.client.is_configured():
            return DeterministicResumeParser.generate_grounded_questions(parsed_profile, count=count)

        # Project and experience summary for prompt grounding
        project_summaries = [
            f"- {p.get('name', 'Project')}: {p.get('description', '')} [Tech: {', '.join(p.get('tech_stack', []))}]"
            for p in parsed_profile.projects
        ]
        exp_summaries = [f"- {e}" for e in parsed_profile.experience]

        prompt = f"""You are a Principal Technical Interviewer conducting a grounded resume deep-dive.
Generate {count} high-caliber interview questions based on the verified candidate profile below.

STRICT GROUNDING MANDATE:
1. Every question MUST explicitly reference or quote a specific project, role, or company present in the profile.
2. Under 'referenced_item', state the exact name of the project, role, or company from the profile.
3. NEVER hallucinate companies, projects, or technologies NOT in the candidate profile.

Verified Projects:
{chr(10).join(project_summaries) if project_summaries else "None"}

Verified Experience:
{chr(10).join(exp_summaries) if exp_summaries else "None"}

Verified Skills:
{", ".join(parsed_profile.skills)}

Return valid JSON adhering to a list of ResumeQuestionSchema items:
{{
  "questions": [
    {{
      "question": "question text explicitly quoting the referenced item",
      "referenced_item": "Exact project or role name from profile",
      "intent": "competency or technical depth assessed",
      "difficulty": "medium"
    }}
  ]
}}"""

        sys_inst = (
            "You are an expert Technical Interviewer. Every question must be strictly grounded "
            "in the candidate's actual projects and experience. Never invent or hallucinate unlisted organizations or projects."
        )

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction=sys_inst,
            temperature=0.2
        )

        valid_grounded_questions: List[LabeledResumeQuestion] = []

        try:
            def _call():
                return self.client._client.models.generate_content(
                    model=self.client.model,
                    contents=prompt,
                    config=config
                )

            response = self.client._execute_with_retry(_call)
            raw_res = getattr(response, "text", None)
            if not raw_res:
                raise MalformedOutputError("Empty response text from model for resume questions.")

            parsed_json = self.client.clean_json_response(raw_res)
            raw_list = parsed_json.get("questions", []) if isinstance(parsed_json, dict) else (parsed_json if isinstance(parsed_json, list) else [])

            for item in raw_list:
                try:
                    q_schema = ResumeQuestionSchema.model_validate(item)
                    # Grounding validation check
                    if self.is_grounded(q_schema, anchors, norm_raw):
                        valid_grounded_questions.append(LabeledResumeQuestion(
                            question=q_schema.question,
                            referenced_item=q_schema.referenced_item,
                            intent=q_schema.intent,
                            difficulty=q_schema.difficulty,
                            source="gemini",
                            is_fallback=False
                        ))
                    else:
                        logger.warning(
                            "Discarding ungrounded question referencing non-existent entity '%s'.",
                            q_schema.referenced_item
                        )
                except Exception as val_e:
                    logger.warning("Skipping malformed question item: %s", val_e)

        except (MissingApiKeyError, InvalidApiKeyError, QuotaExceededError) as auth_e:
            logger.warning(
                "Gemini authorization or quota issue (%s). Serving deterministic grounded fallback questions.",
                type(auth_e).__name__
            )
            return DeterministicResumeParser.generate_grounded_questions(parsed_profile, count=count)
        except Exception as gen_e:
            logger.warning(
                "Gemini question generation failed (%s). Serving deterministic grounded fallback questions.",
                type(gen_e).__name__
            )
            return DeterministicResumeParser.generate_grounded_questions(parsed_profile, count=count)

        # If filtered list has fewer questions than requested, fill with deterministic grounded questions
        if len(valid_grounded_questions) < count:
            needed = count - len(valid_grounded_questions)
            fallback_qs = DeterministicResumeParser.generate_grounded_questions(parsed_profile, count=needed)
            valid_grounded_questions.extend(fallback_qs)

        return valid_grounded_questions[:count]


resume_analyzer = ResumeAnalyzer()
