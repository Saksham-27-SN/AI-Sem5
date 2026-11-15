import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interviews = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    evaluations = relationship("EvaluationReport", back_populates="user", cascade="all, delete-orphan")
    consents = relationship("MediaConsent", back_populates="user", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    target_role = Column(String(100), nullable=True)
    target_company = Column(String(100), nullable=True)
    experience_level = Column(String(50), default="entry")
    skills_json = Column(Text, nullable=True, default="[]")
    resume_filename = Column(String(255), nullable=True)
    resume_extracted_text = Column(Text, nullable=True)
    resume_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="profile")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    interview_type = Column(String(50), nullable=False)  # hr, technical, aptitude, resume, comprehensive
    domain = Column(String(100), nullable=False)
    target_role = Column(String(100), nullable=False)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard, adaptive
    status = Column(String(30), default="configured")  # configured, in_progress, paused, completed, cancelled
    current_question_index = Column(Integer, default=0)
    total_questions = Column(Integer, default=5)
    enable_voice = Column(Boolean, default=True)
    enable_video = Column(Boolean, default=False)
    custom_topics_json = Column(Text, default="[]")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    overall_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="interviews")
    questions = relationship("Question", back_populates="interview", cascade="all, delete-orphan", order_by="Question.order_index")
    answers = relationship("Answer", back_populates="interview", cascade="all, delete-orphan")
    evaluation = relationship("EvaluationReport", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    media_recording = relationship("MediaConsent", back_populates="interview", uselist=False, cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    interview_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    order_index = Column(Integer, nullable=False)
    round_type = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    difficulty = Column(String(20), nullable=False)
    question_text = Column(Text, nullable=False)
    expected_criteria_json = Column(Text, nullable=True, default="[]")
    is_follow_up = Column(Boolean, default=False)
    parent_question_id = Column(String(36), ForeignKey("questions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    interview = relationship("InterviewSession", back_populates="questions")
    answer = relationship("Answer", back_populates="question", uselist=False, cascade="all, delete-orphan")

class Answer(Base):
    __tablename__ = "answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    interview_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    transcript_text = Column(Text, nullable=False)
    duration_seconds = Column(Integer, default=0)
    words_per_minute = Column(Float, nullable=True)
    evaluation_score = Column(Float, nullable=True)
    relevance_score = Column(Float, nullable=True)
    clarity_score = Column(Float, nullable=True)
    technical_depth_score = Column(Float, nullable=True)
    feedback_text = Column(Text, nullable=True)
    strengths_json = Column(Text, nullable=True, default="[]")
    improvements_json = Column(Text, nullable=True, default="[]")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    question = relationship("Question", back_populates="answer")
    interview = relationship("InterviewSession", back_populates="answers")

class EvaluationReport(Base):
    __tablename__ = "evaluation_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    interview_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    overall_score = Column(Float, nullable=False)
    technical_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    problem_solving_score = Column(Float, nullable=True)
    round_breakdown_json = Column(Text, nullable=False, default="{}")
    key_strengths_json = Column(Text, nullable=False, default="[]")
    critical_weaknesses_json = Column(Text, nullable=False, default="[]")
    personalized_study_plan_json = Column(Text, nullable=False, default="[]")
    pdf_report_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    interview = relationship("InterviewSession", back_populates="evaluation")
    user = relationship("User", back_populates="evaluations")

class AptitudeQuestion(Base):
    __tablename__ = "aptitude_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(50), nullable=False)  # quantitative, logical, verbal
    difficulty = Column(String(20), nullable=False)
    question = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False)
    correct_option = Column(String(5), nullable=False)
    explanation = Column(Text, nullable=False)

class MediaConsent(Base):
    __tablename__ = "media_consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    interview_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    has_recording_consent = Column(Boolean, default=False)
    consent_given_at = Column(DateTime, nullable=True)
    recording_file_path = Column(String(255), nullable=True)
    recording_duration_seconds = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    interview = relationship("InterviewSession", back_populates="media_recording")
    user = relationship("User", back_populates="consents")
