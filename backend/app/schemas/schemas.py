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
class InterviewQuestionSchema(BaseModel):
    question: str = Field(..., description="The interview question text.")
    intent: str = Field(..., description="The core intent or competency being tested.")
    difficulty: str = Field(..., description="Difficulty tier: 'easy' | 'medium' | 'hard'.")
    expected_points: List[str] = Field(default_factory=list, description="Key expected points for a strong answer.")

class QuizQuestionSchema(BaseModel):
    stem: str = Field(..., description="The question statement or prompt.")
    options: List[str] = Field(..., description="Exactly 4 unique options.")
    correct_index: int = Field(..., description="0-based index of the correct answer (0 <= correct_index < 4).")
    explanation: str = Field(..., description="Explanation of why the correct option is right.")
    topic: str = Field(..., description="Topic of the quiz question.")
    difficulty: str = Field("medium", description="Difficulty tier: 'easy' | 'medium' | 'hard'.")

class ResumeAnalysisSchema(BaseModel):
    skills: List[str] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)

class ResumeQuestionSchema(BaseModel):
    question: str
    referenced_item: str
    intent: str
    difficulty: str = "medium"

class CriterionEvaluationSchema(BaseModel):
    criterion_name: str
    score: float
    max_score: float = 100.0
    justification: str

class AnswerEvaluationSchema(BaseModel):
    criteria: List[CriterionEvaluationSchema]
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)

class EvaluationReportSchema(BaseModel):
    round_scores: Dict[str, float]
    overall_score: float
    tier: str
    feedback_summary: str
    improvement_plan: List[str] = Field(default_factory=list)

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

# --- Transcript Schemas ---
class TranscriptTurn(BaseModel):
    order_index: int
    round_type: str
    category: Optional[str] = None
    question_text: str
    answer_text: Optional[str] = None
    evaluation_score: Optional[float] = None
    duration_seconds: Optional[int] = 0
    words_per_minute: Optional[float] = None
    is_follow_up: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewTranscriptResponse(BaseModel):
    interview_id: str
    target_role: str
    domain: str
    interview_type: str
    status: str
    total_questions: int
    transcript_text: str
    dialogue: List[TranscriptTurn]
    dialogue_json: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

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

class MediaCleanupResponse(BaseModel):
    status: str
    message: str
    purged_sessions_cleaned: int = 0
    orphaned_files_removed: int = 0
    freed_bytes: int = 0
    freed_mb: float = 0.0

    model_config = ConfigDict(from_attributes=True)

# --- Analytics Schemas ---
class ScoreTrendItem(BaseModel):
    date: str
    score: float
    interview_type: str

    model_config = ConfigDict(from_attributes=True)

class ScoreProgressionPoint(BaseModel):
    session_id: str
    session_number: int
    date: str
    interview_type: str
    role: str
    overall_score: float
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    problem_solving_score: Optional[float] = None

class RoundComparisonItem(BaseModel):
    round: str
    interview_type: str
    average_score: float
    sessions_count: int
    benchmark: float

class CompetencyRadarItem(BaseModel):
    competency: str
    candidate_score: float
    benchmark_score: float
    full_mark: float = 100.0

class AnalyticsSummary(BaseModel):
    total_interviews: int
    average_score: float
    highest_score: float
    completion_rate: float
    total_practice_minutes: int
    readiness_status: str
    readiness_percentage: float

class AnalyticsResponse(BaseModel):
    total_interviews_completed: int = 0
    average_score: float = 0.0
    readiness_score: float = Field(default=0.0, ge=0.0, le=100.0)
    score_trends: List[ScoreTrendItem] = Field(default_factory=list)
    round_averages: Dict[str, float] = Field(default_factory=dict)
    top_strengths: List[str] = Field(default_factory=list)
    key_improvement_areas: List[str] = Field(default_factory=list)

    # Extended dashboard objects
    summary: Optional[AnalyticsSummary] = None
    score_progression: Optional[List[ScoreProgressionPoint]] = None
    round_comparison: Optional[List[RoundComparisonItem]] = None
    competencies: Optional[List[CompetencyRadarItem]] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    recommended_next_action: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

