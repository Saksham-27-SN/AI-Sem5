# API Contracts Specification — InterviewGenie AI

> Authoritative REST interface definition between Frontend client, Backend FastAPI services, and AI Agent subsystems.
> Base URL Prefix: `/api`

## 1. Global Protocol Standards

- **Base URL**: `/api` (Production: `https://api.interviewgenie.ai/api`, Development: `http://localhost:8000/api`)
- **Protocol**: HTTP/1.1 over TLS (Production) / HTTP (Local Development)
- **Data Serialization**: JSON (`application/json`) with UTF-8 encoding
- **Multipart Uploads**: `multipart/form-data` for resume documents and audio blobs
- **Authentication**: Bearer Token in `Authorization` header (`Bearer <JWT_TOKEN>`)
- **Standard Error Payload**:
  ```json
  {
    "detail": "Descriptive human-readable error explanation or validation issue"
  }
  ```

---

## 2. Authentication & Identity Router (`routers/auth.py`)

### 2.1 Register Candidate
- **Endpoint**: `POST /api/auth/register`
- **Status Code**: `201 Created`
- **Auth Required**: No
- **Request Body** (`UserRegister`):
  ```json
  {
    "email": "candidate@example.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Doe"
  }
  ```
- **Success Response** (`AuthResponse`):
  ```json
  {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "candidate@example.com",
      "full_name": "Jane Doe",
      "is_active": true,
      "created_at": "2026-11-16T20:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```
- **Error Codes**: `400 Bad Request` (Email already registered), `422 Unprocessable Entity` (Password < 8 chars or invalid email format).

### 2.2 Login Candidate
- **Endpoint**: `POST /api/auth/login`
- **Status Code**: `200 OK`
- **Auth Required**: No
- **Request Body** (`UserLogin`):
  ```json
  {
    "email": "candidate@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response** (`AuthResponse`):
  ```json
  {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "candidate@example.com",
      "full_name": "Jane Doe",
      "is_active": true,
      "created_at": "2026-11-16T20:00:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
  ```
- **Error Codes**: `401 Unauthorized` (Incorrect email or password).

### 2.3 Get Current User Session
- **Endpoint**: `GET /api/auth/me`
- **Status Code**: `200 OK`
- **Auth Required**: Yes (`Bearer <token>`)
- **Success Response** (`UserResponse`):
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "candidate@example.com",
    "full_name": "Jane Doe",
    "is_active": true,
    "created_at": "2026-11-16T20:00:00Z"
  }
  ```
- **Error Codes**: `401 Unauthorized` (Invalid, expired, or missing JWT).

---

## 3. Candidate Profile Router (`routers/profile.py`)

### 3.1 Get Profile
- **Endpoint**: `GET /api/profile`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response** (`ProfileResponse`):
  ```json
  {
    "id": "d3b07384-d113-460d-9b19-f5254924c585",
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "target_role": "Full Stack Engineer",
    "target_company": "Google",
    "experience_level": "mid",
    "skills": ["Python", "FastAPI", "React", "TypeScript", "Docker"],
    "resume_filename": "candidate_resume.pdf",
    "resume_summary": "Experienced software engineer specializing in distributed full-stack systems...",
    "created_at": "2026-11-16T20:00:00Z",
    "updated_at": "2026-11-16T20:00:00Z"
  }
  ```

### 3.2 Update Profile
- **Endpoint**: `PUT /api/profile`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Request Body** (`ProfileUpdate`):
  ```json
  {
    "target_role": "Lead Architect",
    "target_company": "DeepMind",
    "experience_level": "senior",
    "skills": ["Python", "PyTorch", "Kubernetes", "Distributed Systems"]
  }
  ```
- **Success Response** (`ProfileResponse`): Updated profile entity.

### 3.3 Upload & Analyze Resume
- **Endpoint**: `POST /api/profile/resume/upload`
- **Aliases**: `POST /api/profile/resumes/upload`, `POST /api/resumes/upload`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Content-Type**: `multipart/form-data`
- **Request Form**: `file` (binary PDF, max 10MB)
- **Success Response** (`ResumeAnalysisResponse`):
  ```json
  {
    "filename": "candidate_resume.pdf",
    "candidate_name": "Jane Doe",
    "skills": ["React", "FastAPI", "SQLAlchemy", "PostgreSQL", "TailwindCSS"],
    "experience_years": 4,
    "projects": [
      {
        "title": "InterviewGenie Platform",
        "technologies": ["FastAPI", "React", "Gemini API"],
        "description": "Deterministic multi-agent interview assessment platform"
      }
    ],
    "suggested_interview_focus": ["Async Python APIs", "Component Architecture", "STAR Leadership"],
    "raw_text_length": 3420
  }
  ```

---

## 4. Interview Session Lifecycle Router (`routers/interviews.py`)

### 4.1 Create Interview Session
- **Endpoint**: `POST /api/interviews`
- **Status Code**: `201 Created`
- **Auth Required**: Yes
- **Request Body** (`InterviewCreate`):
  ```json
  {
    "interview_type": "technical",
    "domain": "Software Engineering",
    "target_role": "Backend Engineer",
    "difficulty": "medium",
    "total_questions": 5,
    "enable_voice": true,
    "enable_video": false
  }
  ```
- **Success Response** (`InterviewResponse`):
  ```json
  {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "interview_type": "technical",
    "domain": "Software Engineering",
    "target_role": "Backend Engineer",
    "difficulty": "medium",
    "status": "configured",
    "current_question_index": 0,
    "total_questions": 5,
    "enable_voice": true,
    "enable_video": false,
    "created_at": "2026-11-16T20:10:00Z",
    "completed_at": null,
    "overall_score": null
  }
  ```

### 4.2 List Interview Sessions
- **Endpoint**: `GET /api/interviews`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response**: `List[InterviewResponse]`

### 4.3 Get Interview Session Detail
- **Endpoint**: `GET /api/interviews/{interview_id}`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response**: `InterviewResponse`

### 4.4 Start Interview Session
- **Endpoint**: `POST /api/interviews/{interview_id}/start`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response**:
  ```json
  {
    "status": "in_progress",
    "session_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "current_question_index": 0,
    "current_question": {
      "id": "q1-uuid",
      "order_index": 0,
      "round_type": "technical",
      "category": "Data Structures",
      "difficulty": "medium",
      "question_text": "Explain how hash maps handle collisions and contrast chaining with open addressing.",
      "expected_criteria": ["Chaining with linked lists/trees", "Open addressing probing", "Load factor thresholds"]
    }
  }
  ```

### 4.5 Get Current Question
- **Endpoint**: `GET /api/interviews/{interview_id}/current-question`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response** (`QuestionResponse`):
  ```json
  {
    "id": "q1-uuid",
    "interview_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "order_index": 0,
    "round_type": "technical",
    "category": "System Design",
    "difficulty": "medium",
    "question_text": "How would you design a distributed rate limiter for high-throughput APIs?",
    "expected_criteria": ["Token bucket / Leaky bucket algorithm", "Redis atomic operations", "Sliding window logs"],
    "is_follow_up": false
  }
  ```

### 4.6 Submit Answer
- **Endpoint**: `POST /api/interviews/{interview_id}/submit-answer`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Request Body** (`SubmitAnswerRequest`):
  ```json
  {
    "question_id": "q1-uuid",
    "transcript_text": "I would use a Redis token bucket algorithm with Lua scripts for atomic increments...",
    "speech_metrics": {
      "duration_seconds": 45,
      "words_per_minute": 132.5
    }
  }
  ```
- **Success Response** (`SubmitAnswerResponse`):
  ```json
  {
    "question_id": "q1-uuid",
    "evaluation_score": 8.5,
    "feedback": "Strong explanation of atomic Lua script execution in Redis.",
    "strengths": ["Clear algorithm selection", "Identified concurrency hazards"],
    "improvements": ["Could discuss sliding window logs as an alternative"],
    "is_interview_completed": false,
    "next_question_index": 1,
    "adaptive_difficulty": "hard"
  }
  ```

### 4.7 Repeat Question
- **Endpoint**: `POST /api/interviews/{interview_id}/repeat-question`
- **Status Code**: `200 OK`
- **Success Response**: `{ "question_text": "...", "order_index": 0 }`

### 4.8 End Interview
- **Endpoint**: `POST /api/interviews/{interview_id}/end`
- **Status Code**: `200 OK`
- **Success Response**: `{ "message": "Interview session ended successfully", "status": "completed" }`

### 4.9 Get Diagnostic Evaluation Report
- **Endpoint**: `GET /api/interviews/{interview_id}/evaluation`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response** (`EvaluationReportResponse`):
  ```json
  {
    "id": "rep-uuid",
    "interview_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "overall_score": 83.5,
    "technical_score": 86.0,
    "communication_score": 81.0,
    "problem_solving_score": 83.5,
    "round_breakdown": {
      "technical": 86.0,
      "behavioral": 81.0
    },
    "key_strengths": ["Precise technical vocabulary", "Clear STAR structuring"],
    "critical_weaknesses": ["Pacing was slightly accelerated during architecture explanations"],
    "personalized_study_plan": [
      {
        "area": "Distributed Rate Limiting",
        "action": "Review Redis sliding window logs and token bucket concurrency limits.",
        "resources": ["Designing Data-Intensive Applications, Chapter 5"]
      }
    ],
    "pdf_report_path": "/reports/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d.pdf",
    "created_at": "2026-11-16T20:25:00Z"
  }
  ```

### 4.10 Get Interview Transcript
- **Endpoint**: `GET /api/interviews/{interview_id}/transcript`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response** (`InterviewTranscriptResponse`):
  ```json
  {
    "interview_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "status": "completed",
    "total_turns": 5,
    "turns": [
      {
        "order_index": 0,
        "round_type": "technical",
        "question_text": "Explain how hash maps handle collisions...",
        "candidate_answer": "I would use a Redis token bucket...",
        "score": 8.5,
        "feedback": "Strong explanation..."
      }
    ]
  }
  ```

### 4.11 Download PDF Diagnostic Report
- **Endpoint**: `GET /api/interviews/{interview_id}/report.pdf`
- **Status Code**: `200 OK`
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename=interviewgenie-report-{interview_id}.pdf`

---

## 5. Aptitude Assessment Router (`routers/aptitude.py`)

### 5.1 Retrieve Aptitude Questions
- **Endpoint**: `GET /api/aptitude/test?count=5`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response**: `List[AptitudeMCQ]`
  ```json
  [
    {
      "id": "apt-q1",
      "category": "quantitative",
      "difficulty": "medium",
      "question": "A train passes a 120-meter station platform in 15 seconds. If the train speed is 72 km/h, what is the train length?",
      "options": {
        "A": "180 m",
        "B": "200 m",
        "C": "220 m",
        "D": "240 m"
      }
    }
  ]
  ```

### 5.2 Submit Aptitude Answers
- **Endpoint**: `POST /api/aptitude/submit`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Request Body** (`AptitudeSubmitRequest`):
  ```json
  {
    "answers": {
      "apt-q1": "A",
      "apt-q2": "C"
    }
  }
  ```
- **Success Response** (`AptitudeSubmitResponse`):
  ```json
  {
    "total_questions": 2,
    "correct_answers": 2,
    "score_percentage": 100.0,
    "category_scores": {
      "quantitative": 100.0
    },
    "results": [
      {
        "id": "apt-q1",
        "selected_option": "A",
        "correct_option": "A",
        "is_correct": true,
        "explanation": "Speed = 72 * (5/18) = 20 m/s. Distance in 15s = 300m. Length = 300 - 120 = 180m."
      }
    ]
  }
  ```

---

## 6. Media & Privacy Router (`routers/media.py`)

### 6.1 Set Recording Consent
- **Endpoint**: `POST /api/media/consent`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Request Body** (`MediaConsentRequest`):
  ```json
  {
    "interview_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "has_recording_consent": true
  }
  ```
- **Success Response** (`MediaConsentResponse`):
  ```json
  {
    "interview_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "has_recording_consent": true,
    "consent_given_at": "2026-11-16T20:00:00Z"
  }
  ```

### 6.2 Get Media Consent Status
- **Endpoint**: `GET /api/media/status`
- **Status Code**: `200 OK`
- **Success Response**: `{ "status": "active", "has_consent": true }`

### 6.3 Delete Interview Recording
- **Endpoint**: `DELETE /api/media/recordings/{interview_id}`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response**: `{ "status": "success", "message": "Recording successfully deleted." }`

### 6.4 Clean Up Purged Media
- **Endpoint**: `POST /api/media/cleanup`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response** (`MediaCleanupResponse`):
  ```json
  {
    "deleted_files_count": 4,
    "reclaimed_bytes": 14502800,
    "status": "completed"
  }
  ```

---

## 7. Analytics & Telemetry Router (`routers/analytics.py`)

### 7.1 Aggregate Candidate Analytics
- **Endpoint**: `GET /api/analytics`
- **Status Code**: `200 OK`
- **Auth Required**: Yes
- **Success Response** (`AnalyticsResponse`):
  ```json
  {
    "summary": {
      "total_interviews": 10,
      "average_score": 82.4,
      "highest_score": 94.0,
      "completed_interviews": 8
    },
    "score_progression": [
      { "date": "2026-11-01", "score": 74.0, "round_type": "technical" },
      { "date": "2026-11-10", "score": 86.5, "round_type": "technical" }
    ],
    "skills_radar": [
      { "competency": "Technical Depth", "score": 85.0 },
      { "competency": "Communication", "score": 80.0 },
      { "competency": "Problem Solving", "score": 88.0 },
      { "competency": "System Design", "score": 76.0 },
      { "competency": "Behavioral Alignment", "score": 90.0 }
    ]
  }
  ```

### 7.2 Analytics Sub-Endpoints
- `GET /api/analytics/summary` -> `AnalyticsSummary`
- `GET /api/analytics/progression` -> `List[ScoreProgressionPoint]`
- `GET /api/analytics/skills-radar` -> `List[CompetencyRadarItem]`

---

## 8. Root & Health Router (`backend/app/main.py`)

| Endpoint | Method | Status | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | `200` | `{ "name": "InterviewGenie AI", "status": "online" }` | Root status metadata |
| `/api/health` | `GET` | `200` | `{ "status": "healthy", "version": "1.0.0", "timestamp": "..." }` | Standard API health probe |
| `/health` | `GET` | `200` | `{ "status": "healthy", "version": "1.0.0", "timestamp": "..." }` | Root alias for load balancers |
