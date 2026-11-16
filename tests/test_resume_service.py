import io
import re
import uuid
import logging
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

try:
    import pymupdf as fitz
except ImportError:
    import fitz

from backend.app.services.resume_service import resume_service, MAX_RESUME_FILE_SIZE
from backend.app.main import app

test_client = TestClient(app)


def create_sample_pdf(text_pages: list[str]) -> bytes:
    """Helper to generate an in-memory PDF using PyMuPDF."""
    doc = fitz.open()
    for page_text in text_pages:
        page = doc.new_page()
        # insert_text expects Point or (x, y) coordinates
        page.insert_text((50, 72), page_text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# =====================================================================
# 1. PYMUPDF TEXT EXTRACTION & FORMATTING CLEANING
# =====================================================================

def test_pdf_extraction_with_pymupdf():
    """Verify PyMuPDF extracts text page-by-page and cleans formatting/whitespace."""
    page_1 = (
        "Alice Smith   \n"
        "Senior Cloud Architect\n\n"
        "Summary:\n"
        "Architect with 8+ years experience designing distributed backends using Python, Go, and AWS."
    )
    page_2 = (
        "Key Projects:\n"
        "- CloudMesh: Scalable service mesh built in Go and Kubernetes handling 100k rps.\n\n"
        "Education:\n"
        "Master of Science in Computer Science, Carnegie Mellon University"
    )

    pdf_bytes = create_sample_pdf([page_1, page_2])
    extracted = resume_service.extract_text_from_pdf(pdf_bytes)

    assert "Alice Smith" in extracted
    assert "Senior Cloud Architect" in extracted
    assert "CloudMesh" in extracted
    assert "Carnegie Mellon University" in extracted

    # Formatting checks: no trailing line whitespace and no excessive blank lines
    lines = extracted.split("\n")
    for line in lines:
        assert line == line.rstrip(), "Line should not contain trailing whitespace"
    assert "\n\n\n" not in extracted, "Consecutive blank lines should be collapsed"


def test_clean_extracted_text_whitespace_normalization():
    """Verify clean_extracted_text normalizes irregular whitespace, tabs, and non-breaking spaces."""
    raw_messy = "  Line 1   with\t\textra   spaces   \n\n\n\n\n  Line 2\xa0with\u200bnbsp  \n\n"
    cleaned = resume_service.clean_extracted_text(raw_messy)

    assert "Line 1 with extra spaces" in cleaned
    assert "Line 2 with nbsp" in cleaned
    assert "\n\n\n" not in cleaned


# =====================================================================
# 2. FILE SIZE LIMIT VALIDATION (> 10MB REJECTION)
# =====================================================================

def test_file_size_limit_rejection_over_10mb():
    """Verify service rejects files exceeding 10MB limit with HTTP 400."""
    oversized_size = MAX_RESUME_FILE_SIZE + 512
    oversized_bytes = b"%PDF-1.4\n" + b"0" * oversized_size

    with pytest.raises(HTTPException) as exc_info:
        resume_service.validate_resume_file(
            filename="large_resume.pdf",
            content=oversized_bytes,
            content_type="application/pdf"
        )

    assert exc_info.value.status_code == 400
    assert "exceeds maximum allowed limit of 10MB" in exc_info.value.detail


def test_api_endpoint_rejects_oversized_file(client, registered_user):
    """Verify API endpoint returns HTTP 400 for uploads exceeding 10MB."""
    oversized_bytes = b"%PDF-1.4\n" + b"A" * (MAX_RESUME_FILE_SIZE + 1024)
    files = {"file": ("oversized.pdf", io.BytesIO(oversized_bytes), "application/pdf")}

    res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)
    assert res.status_code == 400
    assert "exceeds maximum allowed limit of 10MB" in res.json()["detail"]


# =====================================================================
# 3. NON-PDF REJECTION (.exe, .txt, .docx, bad header)
# =====================================================================

@pytest.mark.parametrize("bad_filename,bad_content,mime", [
    ("payload.exe", b"MZ\x90\x00\x03\x00executable", "application/x-msdownload"),
    ("notes.txt", b"Plain text notes about experience", "text/plain"),
    ("resume.docx", b"PK\x03\x04 fake docx document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ("script.sh", b"#!/bin/bash\necho hello", "application/x-sh"),
    ("fake.pdf.exe", b"MZ sneaky executable", "application/octet-stream"),
    ("no_extension", b"%PDF-1.4 but no extension", "application/pdf"),
])
def test_non_pdf_rejection_service_level(bad_filename, bad_content, mime):
    """Verify service rejects non-PDF extensions with HTTP 400."""
    with pytest.raises(HTTPException) as exc_info:
        resume_service.validate_resume_file(
            filename=bad_filename,
            content=bad_content,
            content_type=mime
        )
    assert exc_info.value.status_code == 400
    assert "Only PDF resume documents are supported" in exc_info.value.detail


def test_invalid_pdf_header_signature_rejected():
    """Verify service rejects file with .pdf extension but missing %PDF- header."""
    fake_pdf = b"NOT_A_REAL_PDF_HEADER_BYTES"
    with pytest.raises(HTTPException) as exc_info:
        resume_service.validate_resume_file(
            filename="fake.pdf",
            content=fake_pdf,
            content_type="application/pdf"
        )
    assert exc_info.value.status_code == 400
    assert "Only PDF resume documents are supported" in exc_info.value.detail


def test_api_endpoint_rejects_non_pdf_files(client, registered_user):
    """Verify API endpoint returns HTTP 400 for non-PDF files."""
    files = {"file": ("malicious.exe", io.BytesIO(b"MZ executable"), "application/x-msdownload")}
    res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)
    assert res.status_code == 400
    assert "Only PDF resume documents are supported" in res.json()["detail"]


# =====================================================================
# 4. STRICT ZERO RAW TEXT LOGGING (PRIVACY RULE)
# =====================================================================

def test_zero_raw_text_logging_in_service(caplog):
    """
    Verify that raw resume text and PII are NEVER output into console or system logs.
    Only metadata (filename, file size, character count) may appear.
    """
    sensitive_token = "CONFIDENTIAL_PII_SSN_999-00-1234_SECRET_PATENT_KEY"
    resume_content = (
        f"Candidate Secret Profile\n"
        f"Sensitive Identifier: {sensitive_token}\n"
        f"Skills: Python, FastAPI, Docker, PostgreSQL\n"
        f"Projects:\n"
        f"- CitadelVault: Secure cryptographic vault designed in Python and Docker."
    )
    pdf_bytes = create_sample_pdf([resume_content])

    with caplog.at_level(logging.DEBUG):
        result = resume_service.process_resume(pdf_bytes, filename="classified_resume.pdf")

    # Assert raw text parsed properly
    assert "Python" in result["extracted_skills"]
    assert result["raw_text_length"] > 0

    # Strict Privacy Check: Sentinel token must NEVER appear in logs
    assert sensitive_token not in caplog.text, "CRITICAL PRIVACY VIOLATION: Raw resume text leaked into logs!"
    assert "Sensitive Identifier" not in caplog.text

    # Verify metadata is logged safely
    assert "classified_resume.pdf" in caplog.text
    assert "char_length=" in caplog.text or "characters" in caplog.text


def test_zero_raw_text_logging_via_api(client, registered_user, caplog):
    """Verify end-to-end API upload never leaks raw resume text into logs."""
    sensitive_marker = "PATIENT_HEALTH_RECORD_HIPAA_SENSITIVE_5678"
    resume_body = (
        f"John Healthcare Developer\n"
        f"Confidential Marker: {sensitive_marker}\n"
        f"Skills: Python, React, PostgreSQL\n"
        f"Projects:\n"
        f"- HealthPortal: Microservices platform built in Python and React."
    )
    pdf_bytes = create_sample_pdf([resume_body])
    files = {"file": ("patient_dev_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    with caplog.at_level(logging.DEBUG):
        res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)

    assert res.status_code == 200
    assert sensitive_marker not in caplog.text, "CRITICAL: Raw text marker leaked into logs during API upload!"


# =====================================================================
# 5. INTEGRATION WITH AI RESUME ANALYZER (PROFILE, SKILLS, PROJECTS, QUESTIONS)
# =====================================================================

def test_resume_processing_integration_and_grounded_questions():
    """Verify integration returns profile, skills, projects, and grounded questions."""
    resume_text = (
        "Bob Builder\n"
        "Lead Backend Engineer\n\n"
        "Summary:\n"
        "Lead engineer with 7+ years building high-scale backends using Python, PostgreSQL, Kafka, and Docker.\n\n"
        "Projects:\n"
        "- DataIngestor: High-throughput Kafka pipeline in Python consuming 200,000 events/sec.\n"
        "- AuthShield: Zero-trust authentication service built with FastAPI and Redis.\n\n"
        "Experience:\n"
        "- Principal Engineer at Nexus Distributed Tech (2020 - Present): Designed scalable microservices.\n\n"
        "Education:\n"
        "Bachelor of Science in Computer Science"
    )
    pdf_bytes = create_sample_pdf([resume_text])

    parsed = resume_service.process_resume(pdf_bytes, filename="bob_resume.pdf")

    # 1. Profile metadata
    assert parsed["filename"] == "bob_resume.pdf"
    assert parsed["experience_level"] in ("senior", "lead/principal")
    assert parsed["raw_text_length"] > 100

    # 2. Extracted skills
    skills = parsed["extracted_skills"]
    assert "Python" in skills
    assert "PostgreSQL" in skills
    assert "Kafka" in skills

    # 3. Projects
    projects = parsed["projects"]
    assert len(projects) >= 1
    proj_names = [p["name"] for p in projects if isinstance(p, dict)]
    assert any("DataIngestor" in name or "AuthShield" in name for name in proj_names)

    # 4. Grounded questions
    questions = parsed["grounded_questions"]
    assert len(questions) >= 1
    for q in questions:
        assert "question" in q
        assert "referenced_item" in q
        assert "intent" in q
        assert q["difficulty"] in ("easy", "medium", "hard")
        # Ensure grounded in candidate project/role
        ref = q["referenced_item"].lower()
        assert any(term in ref for term in ["dataingestor", "authshield", "nexus", "backend", "python", "engineer"])

    # 5. Extracted profile dictionary
    profile = parsed["extracted_profile"]
    assert "skills" in profile
    assert "projects" in profile
    assert "experience" in profile


def test_api_endpoint_returns_clean_structured_json(client, registered_user):
    """Verify /api/profile/resume/upload returns clean JSON with all required fields."""
    resume_body = (
        "Carol Danvers\n"
        "Senior Software Engineer\n"
        "Skills: Python, Go, Docker, Kubernetes, PostgreSQL\n"
        "Projects:\n"
        "- OrbitRouter: Distributed proxy service built in Go and Kubernetes.\n"
        "Experience:\n"
        "- Senior Backend Engineer at SpaceFlight Labs (2021 - Present)\n"
    )
    pdf_bytes = create_sample_pdf([resume_body])
    files = {"file": ("carol_resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)
    assert res.status_code == 200
    data = res.json()

    # Core required fields
    assert data["filename"] == "carol_resume.pdf"
    assert isinstance(data["extracted_skills"], list)
    assert "Python" in data["extracted_skills"]
    assert data["experience_level"] in ("senior", "lead/principal", "mid")
    assert isinstance(data["summary"], str)
    assert data["raw_text_length"] > 0

    # Extended structured fields
    assert "projects" in data
    assert isinstance(data["projects"], list)
    assert "grounded_questions" in data
    assert isinstance(data["grounded_questions"], list)
    assert len(data["grounded_questions"]) >= 1
    assert "extracted_profile" in data
