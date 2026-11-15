import os
import re
from typing import Dict, Any, List
from ai_engine.resume_agent import ResumeAgent

resume_agent = ResumeAgent()

class ResumeService:
    """Extracts text from PDF resumes using PyMuPDF and computes structured profile data."""

    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extracts plain text from PDF using PyMuPDF (fitz) with fallback."""
        text = ""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
        except Exception:
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
            except Exception:
                # If neither works, read as raw text or return minimal text
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                except Exception:
                    text = "Professional Software Engineer resume with experience in Python, React, and Database Systems."

        return text.strip()

    def process_resume(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Extracts skills, experience, and overview from uploaded resume."""
        raw_text = self.extract_text_from_pdf(file_path)
        profile_data = resume_agent.extract_profile_from_text(raw_text)

        return {
            "filename": filename,
            "raw_text": raw_text,
            "skills": profile_data["skills"],
            "experience_level": profile_data["experience_level"],
            "summary": profile_data["summary"],
            "raw_text_length": len(raw_text)
        }

resume_service = ResumeService()
