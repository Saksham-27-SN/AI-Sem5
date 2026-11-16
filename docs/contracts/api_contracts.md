# InterviewGenie AI — REST API Contracts & Data Specification
Version: 1.0.0
Author: Master Orchestrator (CTO / Principal Architect)

## Base URL
`/api`

---

## 1. Authentication & Users
- **POST `/api/auth/register`**
  - Request: `{ "email": "candidate@example.com", "password": "SecurePassword123!", "full_name": "Jane Doe" }`
  - Response: `201 Created` -> `{ "user": { "id": "uuid", "email": "string", "full_name": "string" }, "token": "jwt_token" }`
- **POST `/api/auth/login`**
  - Request: `{ "email": "candidate@example.com", "password": "SecurePassword123!" }`
  - Response: `200 OK` -> `{ "user": { "id": "uuid", "email": "string", "full_name": "string" }, "token": "jwt_token" }`
- **GET `/api/auth/me`**
  - Headers: `Authorization: Bearer <token>`
  - Response: `200 OK` -> `{ "id": "uuid", "email": "string", "full_name": "string", "created_at": "iso_timestamp" }`

---

## 2. Candidate Profiles & Resume
- **GET `/api/profile`**
  - Response: `200 OK` -> User profile data (skills, target_role, bio, experience_level, resume_metadata)
- **PUT `/api/profile`**
  - Request: `{ "target_role": "Full Stack Engineer", "skills": ["React", "FastAPI", "Python"], "experience_level": "Mid-Level" }`
  - Response: `200 OK` -> Updated profile
- **POST `/api/profile/resume/upload`**
  - Content-Type: `multipart/form-data`
  - Body: `file: <resume.pdf>`
  - Response: `200 OK` -> `{ "filename": "resume.pdf", "extracted_skills": ["Python", "Docker", "FastAPI"], "experience_years": 3, "summary": "Software engineer with 3 years...", "raw_text_length": 2500 }`

---

## 3. Interview Session Orchestration
- **POST `/api/interviews`**
  - Create a new interview session.
  - Request:
    ```json
    {
      "interview_type": "hr" | "technical" | "aptitude" | "resume" | "comprehensive",
      "domain": "Software Engineering" | "Web Development" | "AI/ML" | "Data Science",
      "target_role": "Full Stack Developer",
      "difficulty": "easy" | "medium" | "hard",
      "total_questions": 5,
      "custom_topics": ["FastAPI", "React", "System Design"],
      "enable_voice": true
    }
    ```
  - Response: `201 Created` -> Interview session object with status `"configured"`.
- **POST `/api/interviews/{id}/start`**
  - Initializes state machine to `"in_progress"`.
  - Response: `200 OK` -> `{ "session_id": "...", "status": "in_progress", "first_question": { "id": "q1", "order_index": 1, "text": "...", "category": "...", "audio_hint_url": null } }`
- **GET `/api/interviews/{id}/current-question`**
  - Response: `200 OK` -> Current active question details and progress metrics.
- **POST `/api/interviews/{id}/submit-answer`**
  - Request:
    ```json
    {
      "question_id": "q1",
      "answer_text": "In my previous project, I designed a microservice...",
      "duration_seconds": 45,
      "speech_metrics": {
        "words_per_minute": 130,
        "pause_count": 2,
        "filler_words_count": 1
      }
    }
    ```
  - Response: `200 OK` ->
    ```json
    {
      "answer_id": "ans_123",
      "next_action": "next_question" | "follow_up" | "completed",
      "next_question": {
        "id": "q2",
        "order_index": 2,
        "text": "Could you elaborate on how you handled database contention?",
        "is_follow_up": true,
        "follow_up_to": "q1"
      },
      "progress": { "current": 2, "total": 5 }
    }
    ```
- **POST `/api/interviews/{id}/repeat-question`**
  - Returns the current question text and audio prompt again.
- **POST `/api/interviews/{id}/end`**
  - Concludes interview early or marks as completed; transitions state to `"evaluating"`.
- **GET `/api/interviews/{id}/evaluation`**
  - Deterministic evaluation report + rubric scores.
  - Response:
    ```json
    {
      "interview_id": "...",
      "status": "completed",
      "overall_score": 82.5,
      "round_scores": {
        "technical_accuracy": 85.0,
        "communication_clarity": 80.0,
        "structure_and_depth": 82.0,
        "relevance": 83.0
      },
      "question_evaluations": [
        {
          "question_id": "q1",
          "question_text": "...",
          "answer_text": "...",
          "score": 84,
          "strengths": ["Clear STAR structure", "Specific technical examples"],
          "weaknesses": ["Could have mentioned monitoring tools"],
          "actionable_tip": "Include concrete latency metrics in your response."
        }
      ],
      "overall_strengths": ["Solid system architecture understanding"],
      "improvement_plan": [
        { "topic": "Concurrency control", "recommendation": "Review database isolation levels." }
      ]
    }
    ```
- **GET `/api/interviews/{id}/report.pdf`**
  - Returns binary PDF download of the comprehensive evaluation report.

---

## 4. Aptitude Assessment
- **GET `/api/aptitude/test?category=all&count=10`**
  - Returns timed MCQ set without answer keys exposed.
- **POST `/api/aptitude/submit`**
  - Request: `{ "test_id": "...", "answers": { "q1": "B", "q2": "A" }, "time_spent_seconds": 320 }`
  - Response: Deterministic score, correct answers, explanations, percentile.

---

## 5. Media & Consent
- **POST `/api/media/consent`**
  - Logs user explicit consent for audio/video recording with timestamp and IP/session.
- **GET `/api/media/status`**
  - Checks if user has active consent and media storage quota.
- **DELETE `/api/media/recordings/{interview_id}`**
  - Completely purges all audio/video artifacts for privacy compliance.
