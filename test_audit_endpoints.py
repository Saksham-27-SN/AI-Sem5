import requests
import json

BASE = "http://localhost:8000/api"

# 1. Login or register demo candidate
reg_data = {
    "email": "audit_test@candidate.ai",
    "password": "SecurePassword2026!",
    "full_name": "Audit Candidate"
}
try:
    r = requests.post(f"{BASE}/auth/register", json=reg_data)
    print("Register status:", r.status_code)
except Exception as e:
    print("Register exception:", e)

login_data = {"email": "audit_test@candidate.ai", "password": "SecurePassword2026!"}
r = requests.post(f"{BASE}/auth/login", json=login_data)
print("Login status:", r.status_code)
res = r.json()
token = res.get("token")
print("Retrieved Token:", token[:15] if token else None)
headers = {"Authorization": f"Bearer {token}"}

# 2. Create interview session
sess_data = {
    "target_role": "Senior Full Stack Engineer",
    "interview_type": "behavioral",
    "difficulty": "medium",
    "total_questions": 3
}
r = requests.post(f"{BASE}/interviews", json=sess_data, headers=headers)
print("Interview create status:", r.status_code)
session = r.json()
session_id = session.get("id")
print("Session ID:", session_id)

# 3. Start interview so evaluation/report can be generated
r_start = requests.post(f"{BASE}/interviews/{session_id}/start", headers=headers)
print("Interview start status:", r_start.status_code)

# 4. Test PDF download via query parameter
r_pdf = requests.get(f"{BASE}/interviews/{session_id}/report.pdf?token={token}")
print("PDF download status (via query token):", r_pdf.status_code, "Content-Type:", r_pdf.headers.get("content-type"), "Bytes:", len(r_pdf.content))

# 5. Test PDF download via Authorization Bearer header
r_pdf_header = requests.get(f"{BASE}/interviews/{session_id}/report.pdf", headers=headers)
print("PDF download status (via auth header):", r_pdf_header.status_code, "Bytes:", len(r_pdf_header.content))

# 6. Test GDPR purge endpoint
r_purge = requests.delete(f"{BASE}/media/recordings/all", headers=headers)
print("GDPR purge all status:", r_purge.status_code, r_purge.json())

# 7. Save PDF to verify validity
if r_pdf.status_code == 200 and len(r_pdf.content) > 0:
    import os
    os.makedirs("InterviewGenie-AI/reports", exist_ok=True)
    with open("InterviewGenie-AI/reports/audit_verified_report.pdf", "wb") as f:
        f.write(r_pdf.content)
    print("SUCCESS: Saved valid PDF report to InterviewGenie-AI/reports/audit_verified_report.pdf")
