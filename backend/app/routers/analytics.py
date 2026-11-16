import json
from collections import Counter, defaultdict
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_id
from backend.app.models.models import InterviewSession, EvaluationReport, Answer
from backend.app.schemas.schemas import (
    AnalyticsResponse,
    ScoreTrendItem,
    AnalyticsSummary,
    ScoreProgressionPoint,
    RoundComparisonItem,
    CompetencyRadarItem,
)

router = APIRouter(prefix="/analytics", tags=["Performance Analytics"])


def compute_user_analytics(user_id: str, db: Session) -> AnalyticsResponse:
    """
    Computes aggregate performance statistics for the authenticated candidate:
    - total interviews completed
    - average score
    - readiness score (0-100)
    - score trends over time (date, score, interview_type)
    - round averages
    - top strengths
    - key improvement areas
    """
    # Query all completed interview sessions for user
    completed_sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == user_id,
            (InterviewSession.status == "completed") | (InterviewSession.completed_at.isnot(None))
        )
        .order_by(InterviewSession.completed_at.asc(), InterviewSession.created_at.asc())
        .all()
    )

    total_completed = len(completed_sessions)

    # All sessions count (for completion rate calculations)
    all_sessions_count = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .count()
    )

    if total_completed == 0:
        completion_rate = 0.0
        return AnalyticsResponse(
            total_interviews_completed=0,
            average_score=0.0,
            readiness_score=0.0,
            score_trends=[],
            round_averages={},
            top_strengths=[],
            key_improvement_areas=[],
            summary=AnalyticsSummary(
                total_interviews=all_sessions_count,
                average_score=0.0,
                highest_score=0.0,
                completion_rate=completion_rate,
                total_practice_minutes=0,
                readiness_status="Awaiting Simulation" if all_sessions_count == 0 else "In Progress",
                readiness_percentage=0.0,
            ),
            score_progression=[],
            round_comparison=[],
            competencies=[],
            strengths=[],
            weaknesses=[],
            recommended_next_action=(
                "Launch your first interview simulation to calibrate baseline performance."
                if all_sessions_count == 0
                else "Complete an ongoing simulation to generate performance analytics."
            )
        )

    # Fetch evaluation reports for completed sessions
    session_ids = [s.id for s in completed_sessions]
    reports = {
        r.interview_id: r
        for r in db.query(EvaluationReport).filter(EvaluationReport.interview_id.in_(session_ids)).all()
    }

    # Extract score trends, round scores, strengths, and improvement areas
    score_trends: List[ScoreTrendItem] = []
    progression: List[ScoreProgressionPoint] = []
    all_scores: List[float] = []
    by_round: Dict[str, List[float]] = defaultdict(list)
    rubric_scores: Dict[str, List[float]] = defaultdict(list)
    all_strengths: List[str] = []
    all_weaknesses: List[str] = []

    sum_tech = 0.0
    sum_comm = 0.0
    sum_prob = 0.0
    count_evals = 0

    for idx, s in enumerate(completed_sessions, start=1):
        report = reports.get(s.id)

        # Determine overall score for session
        score = s.overall_score
        if score is None and report and report.overall_score is not None:
            score = report.overall_score
        if score is None:
            # Fallback to answer evaluation scores
            answers = db.query(Answer).filter(Answer.interview_id == s.id).all()
            valid_scores = [a.evaluation_score for a in answers if a.evaluation_score is not None]
            score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

        final_score = round(float(score), 1)
        all_scores.append(final_score)

        dt = s.completed_at or s.created_at
        date_str = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)

        score_trends.append(
            ScoreTrendItem(
                date=date_str,
                score=final_score,
                interview_type=s.interview_type
            )
        )

        itype = s.interview_type.lower()
        by_round[itype].append(final_score)

        # Detailed rubric scores
        tech_score = report.technical_score if report and report.technical_score is not None else final_score
        comm_score = report.communication_score if report and report.communication_score is not None else final_score
        prob_score = report.problem_solving_score if report and report.problem_solving_score is not None else final_score

        if tech_score is not None:
            sum_tech += tech_score
            rubric_scores["technical_accuracy"].append(float(tech_score))
        if comm_score is not None:
            sum_comm += comm_score
            rubric_scores["communication_clarity"].append(float(comm_score))
        if prob_score is not None:
            sum_prob += prob_score
            rubric_scores["problem_solving"].append(float(prob_score))
        count_evals += 1

        progression.append(
            ScoreProgressionPoint(
                session_id=s.id,
                session_number=idx,
                date=s.created_at.strftime("%b %d") if s.created_at else f"Session #{idx}",
                interview_type=s.interview_type,
                role=s.target_role or "Full Stack Engineer",
                overall_score=final_score,
                technical_score=round(float(tech_score), 1) if tech_score is not None else None,
                communication_score=round(float(comm_score), 1) if comm_score is not None else None,
                problem_solving_score=round(float(prob_score), 1) if prob_score is not None else None,
            )
        )

        if report:
            if report.round_breakdown_json:
                try:
                    breakdown = json.loads(report.round_breakdown_json)
                    if isinstance(breakdown, dict):
                        for k, v in breakdown.items():
                            if isinstance(v, (int, float)):
                                rubric_scores[k].append(float(v))
                except (json.JSONDecodeError, TypeError):
                    pass

            if report.key_strengths_json:
                try:
                    items = json.loads(report.key_strengths_json)
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, str) and item.strip():
                                all_strengths.append(item.strip())
                except (json.JSONDecodeError, TypeError):
                    pass

            if report.critical_weaknesses_json:
                try:
                    items = json.loads(report.critical_weaknesses_json)
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, str) and item.strip():
                                all_weaknesses.append(item.strip())
                except (json.JSONDecodeError, TypeError):
                    pass

            if report.personalized_study_plan_json:
                try:
                    plan = json.loads(report.personalized_study_plan_json)
                    if isinstance(plan, list):
                        for p in plan:
                            if isinstance(p, dict) and p.get("topic"):
                                all_weaknesses.append(p["topic"].strip())
                            elif isinstance(p, str) and p.strip():
                                all_weaknesses.append(p.strip())
                except (json.JSONDecodeError, TypeError):
                    pass

    # Extract additional strengths and improvement areas from Answers
    user_answers = (
        db.query(Answer)
        .filter(Answer.interview_id.in_(session_ids))
        .all()
    )
    for ans in user_answers:
        if ans.strengths_json:
            try:
                items = json.loads(ans.strengths_json)
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, str) and item.strip():
                            all_strengths.append(item.strip())
            except (json.JSONDecodeError, TypeError):
                pass

        if ans.improvements_json:
            try:
                items = json.loads(ans.improvements_json)
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, str) and item.strip():
                            all_weaknesses.append(item.strip())
            except (json.JSONDecodeError, TypeError):
                pass

    # Compute aggregate stats
    avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0
    high_score = round(max(all_scores), 1) if all_scores else 0.0
    readiness_score = max(0.0, min(100.0, avg_score))

    # Round averages (interview types + rubric breakdown)
    round_averages: Dict[str, float] = {}
    for r_type, scores in by_round.items():
        if scores:
            round_averages[r_type] = round(sum(scores) / len(scores), 1)

    for dim, scores in rubric_scores.items():
        if scores and dim not in round_averages:
            round_averages[dim] = round(sum(scores) / len(scores), 1)

    # Top strengths and key improvement areas
    top_strengths = [item for item, _ in Counter(all_strengths).most_common(5)]
    key_improvement_areas = [item for item, _ in Counter(all_weaknesses).most_common(5)]

    # Extended dashboard elements
    completion_rate = round((total_completed / all_sessions_count * 100), 1) if all_sessions_count > 0 else 100.0
    est_practice_minutes = total_completed * 22

    if avg_score >= 85:
        readiness_status = "Senior / Interview Ready"
    elif avg_score >= 75:
        readiness_status = "Proficient / Polishing"
    elif avg_score >= 60:
        readiness_status = "Developing / More Practice Needed"
    else:
        readiness_status = "Foundational / Keep Training"

    round_labels = {
        "hr": ("HR & Behavioral", 75.0),
        "technical": ("Technical & Coding", 72.0),
        "aptitude": ("Aptitude & Logic", 70.0),
        "resume": ("Resume Deep Dive", 74.0),
    }

    round_comparison: List[RoundComparisonItem] = []
    for key, (label, benchmark) in round_labels.items():
        r_scores = by_round.get(key, [])
        avg_round = round(sum(r_scores) / len(r_scores), 1) if r_scores else 0.0
        round_comparison.append(
            RoundComparisonItem(
                round=label,
                interview_type=key,
                average_score=avg_round,
                sessions_count=len(r_scores),
                benchmark=benchmark
            )
        )

    avg_tech = round(sum_tech / count_evals, 1) if count_evals > 0 else avg_score
    avg_comm = round(sum_comm / count_evals, 1) if count_evals > 0 else avg_score
    avg_prob = round(sum_prob / count_evals, 1) if count_evals > 0 else avg_score
    avg_star = round((avg_comm * 0.6 + avg_prob * 0.4), 1)
    avg_arch = round((avg_tech * 0.7 + avg_prob * 0.3), 1)
    avg_cadence = round((avg_comm * 0.7 + avg_tech * 0.3), 1)

    competencies = [
        CompetencyRadarItem(competency="Technical Depth", candidate_score=avg_tech, benchmark_score=78.0),
        CompetencyRadarItem(competency="Communication Clarity", candidate_score=avg_comm, benchmark_score=75.0),
        CompetencyRadarItem(competency="STAR Structure", candidate_score=avg_star, benchmark_score=72.0),
        CompetencyRadarItem(competency="Problem Solving", candidate_score=avg_prob, benchmark_score=76.0),
        CompetencyRadarItem(competency="Architectural Maturity", candidate_score=avg_arch, benchmark_score=70.0),
        CompetencyRadarItem(competency="Confidence & Cadence", candidate_score=avg_cadence, benchmark_score=74.0),
    ]

    return AnalyticsResponse(
        total_interviews_completed=total_completed,
        average_score=avg_score,
        readiness_score=readiness_score,
        score_trends=score_trends,
        round_averages=round_averages,
        top_strengths=top_strengths,
        key_improvement_areas=key_improvement_areas,
        summary=AnalyticsSummary(
            total_interviews=all_sessions_count,
            average_score=avg_score,
            highest_score=high_score,
            completion_rate=completion_rate,
            total_practice_minutes=est_practice_minutes,
            readiness_status=readiness_status,
            readiness_percentage=avg_score,
        ),
        score_progression=progression,
        round_comparison=round_comparison,
        competencies=competencies,
        strengths=top_strengths,
        weaknesses=key_improvement_areas,
        recommended_next_action="Rehearse domain concepts and maintain interview consistency."
    )


@router.get("", response_model=AnalyticsResponse)
@router.get("/", response_model=AnalyticsResponse, include_in_schema=False)
def get_analytics(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Computes comprehensive aggregate performance statistics for candidate.
    """
    return compute_user_analytics(user_id=user_id, db=db)


@router.get("/summary", response_model=AnalyticsSummary)
@router.get("/summary/", response_model=AnalyticsSummary, include_in_schema=False)
def get_analytics_summary(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retrieves high-level summary KPI metrics for dashboard.
    When candidate has zero sessions, returns clean zero aggregates.
    """
    analytics = compute_user_analytics(user_id=user_id, db=db)
    return analytics.summary


@router.get("/progression", response_model=List[ScoreProgressionPoint])
@router.get("/progression/", response_model=List[ScoreProgressionPoint], include_in_schema=False)
def get_analytics_progression(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retrieves chronological interview progression score data points.
    When candidate has zero sessions, returns clean empty list [].
    """
    analytics = compute_user_analytics(user_id=user_id, db=db)
    return analytics.score_progression or []


@router.get("/skills-radar", response_model=List[CompetencyRadarItem])
@router.get("/skills-radar/", response_model=List[CompetencyRadarItem], include_in_schema=False)
@router.get("/radar", response_model=List[CompetencyRadarItem], include_in_schema=False)
@router.get("/radar/", response_model=List[CompetencyRadarItem], include_in_schema=False)
def get_analytics_skills_radar(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Retrieves competency radar metrics for skills evaluation visualization.
    When candidate has zero sessions, returns clean empty list [].
    """
    analytics = compute_user_analytics(user_id=user_id, db=db)
    return analytics.competencies or []
