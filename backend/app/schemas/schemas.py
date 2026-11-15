from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

# --- Profile Schemas ---
class ProfileUpdate(BaseModel):
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    experience_level: Optional[str] = "entry"
    skills: Optional[List[str]] = []

class ProfileResponse(BaseModel):
    id: str
    user_id: str
    target_role: Optional[str]
    target_company: Optional[str]
    experience_level: str
    skills: List[str]
    resume_filename: Optional[str]
    resume_summary: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class ResumeUploadResponse(BaseModel):
    filename: str
    extracted_skills: List[str]
    experience_level: str
    summary: str
    raw_text_length: int

# --- Question & Answer Schemas ---
class QuestionResponse(BaseModel):
    id: str
    order_index: int
    round_type: str
    category: str
    difficulty: str
    question_text: str
    is_follow_up: bool
    parent_question_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SpeechMetrics(BaseModel):
    words_per_minute: Optional[float] = None
    pause_count: Optional[int] = None
    filler_words_count: Optional[int] = None

class SubmitAnswerRequest(BaseModel):
    question_id: str
    answer_text: str
    duration_seconds: Optional[int] = 0
    speech_metrics: Optional[SpeechMetrics] = None

class QuestionEvaluation(BaseModel):
    question_id: str
    question_text: str
    answer_text: str
    score: float
    relevance_score: float
    clarity_score: float
    technical_depth_score: float
    feedback: str
    strengths: List[str]
    improvements: List[str]

class SubmitAnswerResponse(BaseModel):
    answer_id: str
    next_action: str  # "next_question", "follow_up", "completed"
    next_question: Optional[QuestionResponse] = None
    progress: Dict[str, int]
    interim_feedback: Optional[str] = None

# --- Interview Session Schemas ---
class InterviewCreate(BaseModel):
    interview_type: str = "hr"  # hr, technical, aptitude, resume, comprehensive
    domain: str = "Software Engineering"
    target_role: str = "Software Engineer"
    difficulty: str = "medium"
    total_questions: int = Field(default=5, ge=1, le=15)
    custom_topics: Optional[List[str]] = []
    enable_voice: bool = True
    enable_video: bool = False

class InterviewResponse(BaseModel):
    id: str
    user_id: str
    interview_type: str
    domain: str
    target_role: str
    difficulty: str
    status: str
    current_question_index: int
    total_questions: int
    enable_voice: bool
    enable_video: bool
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    overall_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Comprehensive Evaluation Schemas ---
class ImprovementItem(BaseModel):
    topic: str
    recommendation: str

class EvaluationReportResponse(BaseModel):
    interview_id: str
    status: str
    overall_score: float
    round_scores: Dict[str, float]
    question_evaluations: List[QuestionEvaluation]
    overall_strengths: List[str]
    critical_weaknesses: List[str]
    improvement_plan: List[ImprovementItem]
    pdf_report_url: Optional[str] = None

# --- Aptitude Schemas ---
class AptitudeMCQ(BaseModel):
    id: str
    category: str
    difficulty: str
    question: str
    options: Dict[str, str]

class AptitudeSubmitRequest(BaseModel):
    test_id: Optional[str] = "aptitude_default"
    answers: Dict[str, Optional[str]] = Field(default_factory=dict)
    time_spent_seconds: Optional[int] = 0

class AptitudeResultItem(BaseModel):
    question_id: str
    question: str
    user_answer: Optional[str] = None
    correct_answer: str
    is_correct: bool
    explanation: str

class AptitudeSubmitResponse(BaseModel):
    total_questions: int
    correct_count: int
    score_percentage: float
    category_scores: Dict[str, float]
    results: List[AptitudeResultItem]
    percentile: Optional[float] = None

# --- Media & Consent Schemas ---
class MediaConsentRequest(BaseModel):
    interview_id: Optional[str] = None
    has_consent: bool = True

class MediaConsentResponse(BaseModel):
    interview_id: Optional[str] = None
    has_recording_consent: bool
    consent_given_at: Optional[datetime] = None
