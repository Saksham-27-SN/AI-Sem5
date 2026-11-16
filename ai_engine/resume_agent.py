import re
from typing import Dict, Any, List, Optional
from ai_engine.base import BaseAgent
from ai_engine.gemini_client import gemini_client

class ResumeAgent(BaseAgent):
    """Parses resume text, extracts skills/projects/experience, and generates grounded interview questions."""

    SYSTEM_PROMPT = """You are an expert technical interviewer reviewing resumes.
STRICT ETHICAL & SAFETY DIRECTIVE:
You must NEVER evaluate, judge, score, infer, or comment upon candidate physical appearance, facial expressions, attire, background environment, gender, race, age, accent, or emotional state.
Focus solely on verifiable technical skills, project achievements, and architectural trade-offs."""

    COMMON_SKILLS = [
        # Languages
        "Python", "Java", "Go", "Golang", "C++", "C#", "Rust", "JavaScript", "TypeScript",
        # Frameworks & Libraries
        "React", "Next.js", "Vue", "Angular", "Node.js", "FastAPI", "Django", "Flask", "Spring Boot", "Express.js",
        # Databases & Storage
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB",
        # DevOps & Cloud
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "CI/CD", "Git", "Linux",
        # Messaging & Architecture
        "Kafka", "RabbitMQ", "REST APIs", "GraphQL", "gRPC", "Microservices", "System Design", "DSA",
        # AI/ML & Data Science
        "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy", "NLP", "LLMs", "RAG"
    ]

    def __init__(self):
        super().__init__(name="Resume Interview Agent", role="Profile & Experience Evaluator")

    def extract_profile_from_text(self, text: str) -> Dict[str, Any]:
        """Extracts skills, experience indicators, projects, and education from raw text."""
        lower_text = text.lower()

        # 1. Extract Skills
        extracted_skills = []
        for skill in self.COMMON_SKILLS:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, lower_text):
                extracted_skills.append(skill)

        # 2. Extract Experience Level & Years
        exp_match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience', lower_text)
        exp_level = "entry"
        years_of_experience = 0
        if exp_match:
            years_of_experience = int(exp_match.group(1))
            if years_of_experience >= 7:
                exp_level = "lead/principal"
            elif years_of_experience >= 4:
                exp_level = "senior"
            elif years_of_experience >= 2:
                exp_level = "mid"
        else:
            if any(term in lower_text for term in ["lead", "architect", "principal", "staff"]):
                exp_level = "lead/principal" if any(term in lower_text for term in ["principal", "staff"]) else "senior"
            elif any(term in lower_text for term in ["senior", "sr."]):
                exp_level = "senior"
            elif any(term in lower_text for term in ["intern", "graduate", "student", "junior"]):
                exp_level = "entry"

        # 3. Extract Projects or Action-Driven Accomplishments
        projects = []
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines:
            if re.match(r'^(?:projects?|key projects?)\s*[:\-]', line, re.IGNORECASE):
                projects.append(line)
            elif re.search(r'\b(developed|architected|built|designed|implemented|deployed)\b', line, re.IGNORECASE):
                if 20 < len(line) < 200:
                    cleaned_line = re.sub(r'^[•\-\*\d\.\s]+', '', line).strip()
                    if cleaned_line and cleaned_line not in projects:
                        projects.append(cleaned_line)

        # 4. Extract Education
        education = []
        edu_keywords = ["bachelor", "b.tech", "b.s.", "b.e.", "master", "m.tech", "m.s.", "ph.d.", "computer science", "information technology"]
        for line in lines:
            if any(kw in line.lower() for kw in edu_keywords):
                education.append(line)

        # 5. Detected Domains
        domains = []
        if any(s in extracted_skills for s in ["Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "NLP", "LLMs", "RAG"]):
            domains.append("AI / Machine Learning")
        if any(s in extracted_skills for s in ["FastAPI", "Django", "Spring Boot", "Node.js", "Go", "PostgreSQL"]):
            domains.append("Backend Engineering")
        if any(s in extracted_skills for s in ["React", "Next.js", "Vue", "Angular", "TypeScript"]):
            domains.append("Frontend / Full Stack")
        if any(s in extracted_skills for s in ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"]):
            domains.append("Cloud & DevOps")

        summary = f"Identified {len(extracted_skills)} core technical skills ({', '.join(extracted_skills[:6]) or 'General'}) with {exp_level}-level profile ({years_of_experience} yrs exp)."

        return {
            "skills": extracted_skills,
            "experience_level": exp_level,
            "years_of_experience": years_of_experience,
            "projects": projects[:5],
            "education": education[:2],
            "detected_domains": domains,
            "summary": summary
        }

    def generate_grounded_question(
        self,
        resume_summary: str,
        skills: List[str],
        index: int,
        projects: Optional[List[str]] = None,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """Generates an interview question deeply grounded in candidate projects and skills."""
        diff_clean = (difficulty or "medium").lower().strip()
        target_skill = skills[index % len(skills)] if skills else "System Architecture"
        project_context = f"Project Context: {projects[index % len(projects)]}" if projects else "Project Context: Candidate highlighted scalable backend and production systems."

        prompt = f"""Generate a resume-grounded interview question for a candidate.
STRICT SAFETY DIRECTIVE: Strictly zero evaluation or mention of physical appearance, demographics, or emotion.
Resume Summary: {resume_summary}
Skills listed: {', '.join(skills) if skills else 'Software Engineering'}
Focus Skill/Area: {target_skill}
{project_context}
Difficulty: {diff_clean}

Target a specific engineering trade-off, architecture decision, performance bottleneck, or failure mode.
Return JSON format:
{{
  "question_text": "...",
  "category": "Resume Deep-Dive: {target_skill}",
  "difficulty": "{diff_clean}",
  "expected_criteria": ["...", "..."]
}}"""
        raw = gemini_client.generate_content(self.SYSTEM_PROMPT, prompt)
        res = self.clean_json_response(raw)

        if "question_text" not in res:
            return {
                "question_text": f"In your experience with {target_skill}, walk me through the most complex architectural bottleneck or scalability challenge you encountered and how you resolved it.",
                "category": f"Resume Deep-Dive: {target_skill}",
                "difficulty": diff_clean,
                "expected_criteria": [
                    f"Concrete implementation details using {target_skill}",
                    "Identified performance bottleneck or architectural limitation",
                    "Measurable impact and engineering trade-offs"
                ]
            }

        if "difficulty" not in res or not res["difficulty"]:
            res["difficulty"] = diff_clean
        if "category" not in res or not res["category"]:
            res["category"] = f"Resume Deep-Dive: {target_skill}"
        if "expected_criteria" not in res or not isinstance(res["expected_criteria"], list):
            res["expected_criteria"] = [
                f"Concrete implementation details using {target_skill}",
                "Identified performance bottleneck or architectural limitation",
                "Measurable impact and engineering trade-offs"
            ]
        return res
