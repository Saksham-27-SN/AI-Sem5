import os
import re
import io
import logging
from typing import Dict, Any, List, Optional, Union
from fastapi import HTTPException, status

try:
    import pymupdf as fitz
except ImportError:
    import fitz

from backend.app.ai.resume_analyzer import resume_analyzer

logger = logging.getLogger("interviewgenie.resume_service")

# 10 MB strict limit
MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024


class ResumeService:
    """
    Enterprise-grade PDF resume extraction service using PyMuPDF (fitz).
    
    Guarantees:
    - High-fidelity per-page text extraction and whitespace/formatting cleaning.
    - Strict validation: .pdf extension, application/pdf MIME type, 10MB file size limit, %PDF- header.
    - Strict Privacy: Zero raw text logging in console, logs, or error reports (metadata only).
    - AI Integration: Calls ai_dev's ResumeAnalyzer for structured profiles and grounded questions.
    """

    @staticmethod
    def clean_extracted_text(text: str) -> str:
        """
        Cleans whitespace, line breaks, and formatting from extracted PDF text.
        - Standardizes line breaks
        - Strips zero-width and non-breaking spaces
        - Collapses repeated horizontal whitespace
        - Limits consecutive blank lines to at most two
        """
        if not text:
            return ""

        # Normalize line endings
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        # Strip invisible characters and non-breaking spaces
        normalized = normalized.replace("\xa0", " ").replace("\u200b", " ").replace("\ufeff", "")

        # Clean each line's horizontal whitespace
        cleaned_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in normalized.split("\n")]
        recombined = "\n".join(cleaned_lines)

        # Collapse excessive blank lines
        cleaned_text = re.sub(r"\n{3,}", "\n\n", recombined).strip()
        return cleaned_text

    def extract_text_from_pdf(self, file_path_or_bytes: Union[str, bytes, io.BytesIO]) -> str:
        """
        Extracts plain text per page from PDF using PyMuPDF (fitz) and cleans formatting.
        
        PRIVACY DIRECTIVE: NEVER log raw resume text content.
        Only logs document metadata (character count, page count).
        """
        doc = None
        pages_text: List[str] = []
        page_count = 0

        try:
            if isinstance(file_path_or_bytes, bytes):
                doc = fitz.open(stream=file_path_or_bytes, filetype="pdf")
            elif isinstance(file_path_or_bytes, io.BytesIO):
                doc = fitz.open(stream=file_path_or_bytes.getvalue(), filetype="pdf")
            else:
                doc = fitz.open(file_path_or_bytes)

            page_count = len(doc)
            for page in doc:
                raw_page = page.get_text("text") or ""
                cleaned_page = self.clean_extracted_text(raw_page)
                if cleaned_page:
                    pages_text.append(cleaned_page)

            extracted_text = "\n\n".join(pages_text).strip()

            # PRIVACY RULE: Log only metadata, NEVER raw text
            logger.info(
                "PyMuPDF extracted %d characters across %d pages (non-empty pages: %d).",
                len(extracted_text),
                page_count,
                len(pages_text)
            )
            return extracted_text

        except Exception as exc:
            # Metadata-only logging on extraction errors
            logger.warning(
                "PyMuPDF text extraction encountered an issue (%s). Attempting fallback reader.",
                type(exc).__name__
            )
            # Safe fallback using pypdf
            try:
                import pypdf
                if isinstance(file_path_or_bytes, bytes):
                    stream = io.BytesIO(file_path_or_bytes)
                elif isinstance(file_path_or_bytes, io.BytesIO):
                    stream = file_path_or_bytes
                else:
                    stream = open(file_path_or_bytes, "rb")

                reader = pypdf.PdfReader(stream)
                for page in reader.pages:
                    t = page.extract_text() or ""
                    cleaned = self.clean_extracted_text(t)
                    if cleaned:
                        pages_text.append(cleaned)

                if not isinstance(file_path_or_bytes, (bytes, io.BytesIO)):
                    stream.close()

                fallback_text = "\n\n".join(pages_text).strip()
                logger.info("Fallback PDF reader extracted %d characters.", len(fallback_text))
                return fallback_text
            except Exception as fb_exc:
                logger.warning("Fallback PDF extraction also failed (%s).", type(fb_exc).__name__)
                return ""
        finally:
            if doc:
                try:
                    doc.close()
                except Exception:
                    pass

    def validate_resume_file(
        self,
        filename: Optional[str],
        content: bytes,
        content_type: Optional[str] = None
    ) -> None:
        """
        Strict file type, size, MIME type, and header validation.
        Rejects non-PDFs or oversized files (> 10MB) with HTTP 400 Bad Request.
        """
        # 1. Filename extension validation
        if not filename or not filename.lower().endswith(".pdf"):
            logger.warning("Resume validation rejected: non-PDF extension (filename='%s').", filename or "none")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF resume documents are supported (.pdf file extension required)."
            )

        # 2. File size validation (10 MB limit)
        file_size = len(content)
        if file_size > MAX_RESUME_FILE_SIZE:
            logger.warning(
                "Resume validation rejected: file size %d bytes exceeds 10MB limit for '%s'.",
                file_size, filename
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of 10MB (file size: {file_size} bytes)."
            )

        # 3. MIME type validation if supplied
        if content_type:
            allowed_mimes = ["application/pdf", "application/x-pdf", "binary/octet-stream"]
            if content_type.lower() not in allowed_mimes:
                logger.warning(
                    "Resume validation rejected: invalid MIME type '%s' for '%s'.",
                    content_type, filename
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only PDF resume documents are supported (invalid MIME type '{content_type}')."
                )

        # 4. PDF header signature validation
        if not content.startswith(b"%PDF-"):
            logger.warning(
                "Resume validation rejected: missing %%PDF- signature in header for '%s'.",
                filename
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF resume documents are supported (file header does not match %PDF signature)."
            )

    @staticmethod
    def determine_experience_level(experience_entries: List[str], text: str) -> str:
        """Computes candidate seniority tier using experience history and regex patterns."""
        lower_text = text.lower()
        exp_match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience', lower_text)
        if exp_match:
            years = int(exp_match.group(1))
            if years >= 7:
                return "lead/principal"
            elif years >= 4:
                return "senior"
            elif years >= 2:
                return "mid"
            return "entry"

        for exp in experience_entries:
            exp_l = exp.lower()
            if any(term in exp_l for term in ["principal", "staff", "director", "head"]):
                return "lead/principal"
            if any(term in exp_l for term in ["senior", "lead", "architect"]):
                return "senior"
            if any(term in exp_l for term in ["mid", "intermediate", "software engineer ii"]):
                return "mid"
            if any(term in exp_l for term in ["intern", "junior", "associate", "graduate"]):
                return "entry"

        if any(term in lower_text for term in ["principal", "staff"]):
            return "lead/principal"
        elif any(term in lower_text for term in ["senior", "architect"]):
            return "senior"
        return "mid"

    def process_resume(
        self,
        file_path_or_bytes: Union[str, bytes, io.BytesIO],
        filename: str,
        file_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Full resume extraction pipeline:
        1. Extracts text per page using PyMuPDF and cleans formatting.
        2. Logs strictly metadata (zero raw text logging).
        3. Integrates with ai_dev's resume analyzer in backend/app/ai/resume_analyzer.py.
        4. Returns clean structured JSON with profile, skills, projects, and grounded questions.
        """
        # Determine file size metadata
        if file_size is None:
            if isinstance(file_path_or_bytes, bytes):
                file_size = len(file_path_or_bytes)
            elif isinstance(file_path_or_bytes, io.BytesIO):
                file_size = file_path_or_bytes.getbuffer().nbytes
            elif os.path.exists(file_path_or_bytes):
                file_size = os.path.getsize(file_path_or_bytes)
            else:
                file_size = 0

        # 1. PyMuPDF text extraction
        cleaned_text = self.extract_text_from_pdf(file_path_or_bytes)

        # 2. Privacy Rule: Log ONLY metadata, never raw text!
        logger.info(
            "Resume parsing initiated: filename='%s', file_size=%d bytes, char_length=%d.",
            filename,
            file_size,
            len(cleaned_text)
        )

        # 3. Call ai_dev's ResumeAnalyzer
        parsed_profile = resume_analyzer.analyze_resume(cleaned_text)
        grounded_questions = resume_analyzer.generate_resume_questions(parsed_profile, cleaned_text, count=3)

        # Seniority & summary calculation
        exp_level = self.determine_experience_level(parsed_profile.experience, cleaned_text)
        summary = (
            f"Evaluated {len(parsed_profile.skills)} technical skills and {len(parsed_profile.projects)} projects "
            f"at {exp_level} level."
        )

        # Format questions for JSON response
        formatted_questions = [
            {
                "question": q.question,
                "referenced_item": q.referenced_item,
                "intent": q.intent,
                "difficulty": q.difficulty,
                "source": getattr(q, "source", "offline_bank"),
                "is_fallback": getattr(q, "is_fallback", True)
            }
            for q in grounded_questions
        ]

        # Serialized project records
        projects_data = [
            p.model_dump() if hasattr(p, "model_dump") else (p if isinstance(p, dict) else {"name": str(p), "tech_stack": [], "description": ""})
            for p in parsed_profile.projects
        ]

        extracted_profile_dict = {
            "skills": parsed_profile.skills,
            "projects": projects_data,
            "experience": parsed_profile.experience,
            "education": parsed_profile.education,
            "gaps": parsed_profile.gaps
        }

        logger.info(
            "Resume parsing completed for '%s': %d skills, %d projects, %d questions generated.",
            filename,
            len(parsed_profile.skills),
            len(projects_data),
            len(formatted_questions)
        )

        return {
            "filename": filename,
            "extracted_skills": parsed_profile.skills,
            "skills": parsed_profile.skills,  # backward compatibility alias
            "experience_level": exp_level,
            "summary": summary,
            "raw_text_length": len(cleaned_text),
            "raw_text": cleaned_text,  # for DB storage in Profile model
            "projects": projects_data,
            "experience": parsed_profile.experience,
            "education": parsed_profile.education,
            "gaps": parsed_profile.gaps,
            "grounded_questions": formatted_questions,
            "extracted_profile": extracted_profile_dict
        }


resume_service = ResumeService()
