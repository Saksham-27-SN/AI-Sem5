import os
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id
from backend.app.models.models import (
    InterviewSession, Question, Answer, EvaluationReport, Profile, User
)
from backend.app.schemas.schemas import (
    InterviewCreate, InterviewResponse, QuestionResponse,
    SubmitAnswerRequest, SubmitAnswerResponse, EvaluationReportResponse, QuestionEvaluation
)
from ai_engine.coordinator_agent import coordinator_agent
from ai_engine.evaluation_agent import EvaluationAgent
from backend.app.services.pdf_report_service import pdf_report_service

router = APIRouter(prefix="/interviews", tags=["Interview Sessions"])
evaluation_agent = EvaluationAgent()

@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def create_interview(
    data: InterviewCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Initializes a new interview simulation session."""
    session = InterviewSession(
        user_id=user_id,
        interview_type=data.interview_type,
        domain=data.domain,
        target_role=data.target_role,
        difficulty=data.difficulty,
        total_questions=data.total_questions,
        enable_voice=data.enable_voice,
        enable_video=data.enable_video,
        custom_topics_json=json.dumps(data.custom_topics or []),
        status="configured"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("", response_model=List[InterviewResponse])
def list_interviews(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieves all past and ongoing interview sessions for user."""
    return db.query(InterviewSession).filter(
        InterviewSession.user_id == user_id
    ).order_by(InterviewSession.created_at.desc()).all()

@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieves single interview session metadata."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")
    return session

@router.post("/{interview_id}/start")
def start_interview(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Transitions state machine to in_progress and retrieves initial question."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    resume_summary = profile.resume_summary if profile else None
    skills = json.loads(profile.skills_json) if profile and profile.skills_json else []

    session.status = "in_progress"
    session.started_at = datetime.now(timezone.utc)

    # Check if first question already exists
    first_q = db.query(Question).filter(
        Question.interview_id == session.id,
        Question.order_index == 1
    ).first()

    if not first_q:
        q_data = coordinator_agent.get_initial_question(
            interview_type=session.interview_type,
            domain=session.domain,
            difficulty=session.difficulty,
            resume_summary=resume_summary,
            skills=skills
        )
        first_q = Question(
            interview_id=session.id,
            order_index=1,
            round_type=session.interview_type,
            category=q_data.get("category", "General"),
            difficulty=q_data.get("difficulty", session.difficulty),
            question_text=q_data.get("question_text", "Could you please introduce yourself?"),
            expected_criteria_json=json.dumps(q_data.get("expected_criteria", [])),
            is_follow_up=False
        )
        db.add(first_q)
        session.current_question_index = 1

    db.commit()
    db.refresh(first_q)

    return {
        "session_id": session.id,
        "status": session.status,
        "current_question": QuestionResponse.model_validate(first_q),
        "progress": {"current": 1, "total": session.total_questions}
    }

@router.get("/{interview_id}/current-question", response_model=QuestionResponse)
def get_current_question(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Retrieves the active question requiring candidate answer."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    q = db.query(Question).filter(
        Question.interview_id == session.id,
        Question.order_index == session.current_question_index
    ).first()

    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active question available.")
    return QuestionResponse.model_validate(q)

@router.post("/{interview_id}/submit-answer", response_model=SubmitAnswerResponse)
def submit_answer(
    interview_id: str,
    payload: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Submits candidate answer, executes evaluation, and orchestrates next question or completion."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    question = db.query(Question).filter(Question.id == payload.question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    resume_summary = profile.resume_summary if profile else None
    skills = json.loads(profile.skills_json) if profile and profile.skills_json else []

    # Process turn through multi-agent coordinator
    expected_crit = json.loads(question.expected_criteria_json) if question.expected_criteria_json else []
    turn_result = coordinator_agent.process_turn(
        interview_type=session.interview_type,
        domain=session.domain,
        current_question_index=session.current_question_index,
        total_questions=session.total_questions,
        current_question={
            "question_text": question.question_text,
            "category": question.category,
            "expected_criteria": expected_crit,
            "is_follow_up": question.is_follow_up
        },
        answer_text=payload.answer_text,
        resume_summary=resume_summary,
        skills=skills
    )

    eval_data = turn_result["evaluation"]
    score = eval_data.get("score", 75.0)

    # Persist candidate answer and score
    answer = Answer(
        question_id=question.id,
        interview_id=session.id,
        transcript_text=payload.answer_text,
        duration_seconds=payload.duration_seconds or 0,
        words_per_minute=payload.speech_metrics.words_per_minute if payload.speech_metrics else None,
        evaluation_score=score,
        relevance_score=eval_data.get("relevance_score", score),
        clarity_score=eval_data.get("clarity_score", score),
        technical_depth_score=eval_data.get("technical_depth_score", score),
        feedback_text=eval_data.get("feedback", ""),
        strengths_json=json.dumps(eval_data.get("strengths", [])),
        improvements_json=json.dumps(eval_data.get("improvements", []))
    )
    db.add(answer)

    next_action = turn_result["next_action"]
    next_q_response = None

    if next_action in ("next_question", "follow_up") and turn_result.get("next_question"):
        next_q_info = turn_result["next_question"]
        new_index = session.current_question_index if next_action == "follow_up" else session.current_question_index + 1
        
        # If it's a follow-up, keep current question order index or order_index + 1
        created_next_q = Question(
            interview_id=session.id,
            order_index=new_index if next_action != "follow_up" else session.current_question_index + 1,
            round_type=session.interview_type,
            category=next_q_info.get("category", question.category),
            difficulty=next_q_info.get("difficulty", question.difficulty),
            question_text=next_q_info["question_text"],
            expected_criteria_json=json.dumps(next_q_info.get("expected_criteria", [])),
            is_follow_up=(next_action == "follow_up"),
            parent_question_id=question.id if next_action == "follow_up" else None
        )
        db.add(created_next_q)
        db.flush()
        session.current_question_index = created_next_q.order_index
        next_q_response = QuestionResponse.model_validate(created_next_q)
    else:
        # Completed
        session.status = "completed"
        session.completed_at = datetime.now(timezone.utc)
        # Compute final overall score
        all_answers = db.query(Answer).filter(Answer.interview_id == session.id).all()
        if all_answers:
            session.overall_score = round(sum(a.evaluation_score for a in all_answers) / len(all_answers), 1)

    db.commit()
    db.refresh(session)

    return {
        "answer_id": answer.id,
        "next_action": next_action,
        "next_question": next_q_response,
        "progress": {"current": session.current_question_index, "total": session.total_questions},
        "interim_feedback": eval_data.get("feedback")
    }

@router.post("/{interview_id}/repeat-question")
def repeat_question(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Returns active question text again for TTS re-play."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    q = db.query(Question).filter(
        Question.interview_id == session.id,
        Question.order_index == session.current_question_index
    ).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active question.")
    
    return {"question_text": q.question_text, "order_index": q.order_index}

@router.post("/{interview_id}/end")
def end_interview(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Concludes session early and marks ready for evaluation."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)

    all_answers = db.query(Answer).filter(Answer.interview_id == session.id).all()
    if all_answers:
        session.overall_score = round(sum(a.evaluation_score for a in all_answers) / len(all_answers), 1)

    db.commit()
    return {"message": "Interview session ended successfully.", "status": "completed"}

@router.get("/{interview_id}/evaluation", response_model=EvaluationReportResponse)
def get_evaluation_report(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Aggregates all question answers and returns detailed rubric report."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    answers = db.query(Answer).filter(Answer.interview_id == session.id).all()
    question_evals = []

    for a in answers:
        q = db.query(Question).filter(Question.id == a.question_id).first()
        question_evals.append({
            "question_id": a.question_id,
            "question_text": q.question_text if q else "Question",
            "answer_text": a.transcript_text,
            "score": a.evaluation_score or 70.0,
            "relevance_score": a.relevance_score or 75.0,
            "clarity_score": a.clarity_score or 70.0,
            "technical_depth_score": a.technical_depth_score or 70.0,
            "feedback": a.feedback_text or "Answer evaluated.",
            "strengths": json.loads(a.strengths_json) if a.strengths_json else [],
            "improvements": json.loads(a.improvements_json) if a.improvements_json else []
        })

    eval_summary = evaluation_agent.aggregate_evaluation(question_evals)

    # Persist or update evaluation report in db
    report = db.query(EvaluationReport).filter(EvaluationReport.interview_id == session.id).first()
    if not report:
        report = EvaluationReport(
            interview_id=session.id,
            user_id=user_id,
            overall_score=eval_summary["overall_score"],
            technical_score=eval_summary["round_scores"]["technical_accuracy"],
            communication_score=eval_summary["round_scores"]["communication_clarity"],
            problem_solving_score=eval_summary["round_scores"]["structure_and_depth"],
            round_breakdown_json=json.dumps(eval_summary["round_scores"]),
            key_strengths_json=json.dumps(eval_summary["overall_strengths"]),
            critical_weaknesses_json=json.dumps(eval_summary["critical_weaknesses"]),
            personalized_study_plan_json=json.dumps(eval_summary["improvement_plan"])
        )
        db.add(report)
        db.commit()

    return {
        "interview_id": session.id,
        "status": session.status,
        "overall_score": eval_summary["overall_score"],
        "round_scores": eval_summary["round_scores"],
        "question_evaluations": question_evals,
        "overall_strengths": eval_summary["overall_strengths"],
        "critical_weaknesses": eval_summary["critical_weaknesses"],
        "improvement_plan": eval_summary["improvement_plan"],
        "pdf_report_url": f"/api/interviews/{session.id}/report.pdf"
    }

@router.get("/{interview_id}/report.pdf")
def download_pdf_report(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Generates and downloads binary PDF evaluation report."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == interview_id,
        InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    user = db.query(User).filter(User.id == user_id).first()
    candidate_name = user.full_name if user else "Candidate"

    # Fetch evaluation data
    eval_resp = get_evaluation_report(interview_id=interview_id, user_id=user_id, db=db)

    pdf_filename = f"InterviewGenie_Report_{session.id[:8]}.pdf"
    pdf_path = os.path.join("./reports", pdf_filename)

    pdf_report_service.generate_interview_report(
        output_path=pdf_path,
        interview_data={"target_role": session.target_role, "interview_type": session.interview_type},
        evaluation_data=eval_resp,
        candidate_name=candidate_name
    )

    return FileResponse(
        path=pdf_path,
        filename=pdf_filename,
        media_type="application/pdf"
    )
