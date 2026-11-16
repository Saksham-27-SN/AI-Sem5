# InterviewGenie AI — Database Architecture & Schema Specification
Database Engine: SQLite (Local Development) / PostgreSQL Compatible
ORM: SQLAlchemy 2.0 + Pydantic v2 Models

---

## Entity Relationship Overview

```
[User] 1 ──── 1 [Profile]
  │
  ├────── 0..* [InterviewSession]
  │                 │
  │                 ├────── 1..* [Question]
  │                 │               │
  │                 │               └────── 0..1 [Answer]
  │                 │
  │                 ├────── 0..1 [EvaluationReport]
  │                 │
  │                 └────── 0..1 [MediaRecording]
  │
  └────── 0..* [AptitudeSubmission]
```

---

## Table Definitions

### 1. `users`
- `id`: String(36), Primary Key (UUIDv4)
- `email`: String(255), Unique, Indexed, Not Null
- `hashed_password`: String(255), Not Null
- `full_name`: String(120), Not Null
- `is_active`: Boolean, Default True
- `created_at`: DateTime, Default UTC now
- `updated_at`: DateTime, Default UTC now

### 2. `profiles`
- `id`: String(36), Primary Key (UUIDv4)
- `user_id`: String(36), Foreign Key (`users.id`), Unique, Indexed
- `target_role`: String(100), Nullable
- `target_company`: String(100), Nullable
- `experience_level`: String(50), Default "entry" (entry, mid, senior)
- `skills_json`: Text (JSON Array of strings), Nullable
- `resume_filename`: String(255), Nullable
- `resume_extracted_text`: Text, Nullable
- `resume_summary`: Text, Nullable
- `created_at`: DateTime, Default UTC now
- `updated_at`: DateTime, Default UTC now

### 3. `interview_sessions`
- `id`: String(36), Primary Key (UUIDv4)
- `user_id`: String(36), Foreign Key (`users.id`), Indexed
- `interview_type`: String(50), Not Null (hr, technical, aptitude, resume, comprehensive)
- `domain`: String(100), Not Null
- `target_role`: String(100), Not Null
- `difficulty`: String(20), Default "medium" (easy, medium, hard, adaptive)
- `status`: String(30), Default "configured" (configured, in_progress, paused, completed, cancelled)
- `current_question_index`: Integer, Default 0
- `total_questions`: Integer, Default 5
- `enable_voice`: Boolean, Default True
- `enable_video`: Boolean, Default False
- `started_at`: DateTime, Nullable
- `completed_at`: DateTime, Nullable
- `overall_score`: Float, Nullable (0.0 to 100.0)
- `created_at`: DateTime, Default UTC now

### 4. `questions`
- `id`: String(36), Primary Key (UUIDv4)
- `interview_id`: String(36), Foreign Key (`interview_sessions.id`), Indexed
- `order_index`: Integer, Not Null
- `round_type`: String(50), Not Null (hr, technical, coding, resume)
- `category`: String(100), Not Null
- `difficulty`: String(20), Not Null
- `question_text`: Text, Not Null
- `expected_criteria`: Text, Nullable (JSON list of criteria)
- `is_follow_up`: Boolean, Default False
- `parent_question_id`: String(36), Foreign Key (`questions.id`), Nullable
- `created_at`: DateTime, Default UTC now

### 5. `answers`
- `id`: String(36), Primary Key (UUIDv4)
- `question_id`: String(36), Foreign Key (`questions.id`), Unique, Indexed
- `interview_id`: String(36), Foreign Key (`interview_sessions.id`), Indexed
- `transcript_text`: Text, Not Null
- `duration_seconds`: Integer, Default 0
- `words_per_minute`: Float, Nullable
- `evaluation_score`: Float, Nullable (0.0 to 100.0)
- `relevance_score`: Float, Nullable
- `clarity_score`: Float, Nullable
- `technical_depth_score`: Float, Nullable
- `feedback_text`: Text, Nullable
- `strengths_json`: Text, Nullable (JSON array)
- `improvements_json`: Text, Nullable (JSON array)
- `created_at`: DateTime, Default UTC now

### 6. `evaluation_reports`
- `id`: String(36), Primary Key (UUIDv4)
- `interview_id`: String(36), Foreign Key (`interview_sessions.id`), Unique, Indexed
- `user_id`: String(36), Foreign Key (`users.id`), Indexed
- `overall_score`: Float, Not Null
- `technical_score`: Float, Nullable
- `communication_score`: Float, Nullable
- `problem_solving_score`: Float, Nullable
- `round_breakdown_json`: Text, Not Null (JSON)
- `key_strengths_json`: Text, Not Null (JSON)
- `critical_weaknesses_json`: Text, Not Null (JSON)
- `personalized_study_plan_json`: Text, Not Null (JSON)
- `pdf_report_path`: String(255), Nullable
- `created_at`: DateTime, Default UTC now

### 7. `aptitude_questions`
- `id`: String(36), Primary Key (UUIDv4)
- `category`: String(50), Not Null (quantitative, logical, verbal)
- `difficulty`: String(20), Not Null (easy, medium, hard)
- `question`: Text, Not Null
- `options_json`: Text, Not Null (JSON map `{"A": "...", "B": "..."}`)
- `correct_option`: String(5), Not Null
- `explanation`: Text, Not Null

### 8. `media_consents_and_recordings`
- `id`: String(36), Primary Key (UUIDv4)
- `interview_id`: String(36), Foreign Key (`interview_sessions.id`), Unique, Indexed
- `user_id`: String(36), Foreign Key (`users.id`), Indexed
- `has_recording_consent`: Boolean, Default False
- `consent_given_at`: DateTime, Nullable
- `recording_file_path`: String(255), Nullable
- `recording_duration_seconds`: Integer, Default 0
- `is_deleted`: Boolean, Default False
- `created_at`: DateTime, Default UTC now
