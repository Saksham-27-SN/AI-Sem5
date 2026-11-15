import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_optional_user_id
from backend.app.models.models import AptitudeQuestion
from backend.app.schemas.schemas import (
    AptitudeMCQ, AptitudeSubmitRequest, AptitudeSubmitResponse, AptitudeResultItem
)
from ai_engine.aptitude_agent import AptitudeAgent

router = APIRouter(prefix="/aptitude", tags=["Aptitude Assessment"])
aptitude_agent = AptitudeAgent()

@router.get("/test", response_model=List[AptitudeMCQ])
def get_aptitude_test(
    category: Optional[str] = Query("all", description="Category filter: 'all', 'quantitative', 'logical', 'verbal'"),
    count: int = Query(5, ge=1, le=50, description="Number of questions to retrieve"),
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    """
    Returns timed aptitude questions without revealing correct answer keys or explanations.
    """
    # Attempt to query from database first
    query = db.query(AptitudeQuestion)
    if category and category.lower() != "all":
        query = query.filter(AptitudeQuestion.category.ilike(f"%{category}%"))
    db_questions = query.limit(count).all()

    if db_questions:
        response_list: List[AptitudeMCQ] = []
        for q in db_questions:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            response_list.append(
                AptitudeMCQ(
                    id=q.id,
                    category=q.category,
                    difficulty=q.difficulty,
                    question=q.question,
                    options=opts
                )
            )
        return response_list

    # Fallback to verified bank from AptitudeAgent
    bank = aptitude_agent.VERIFIED_APTITUDE_BANK
    if category and category.lower() != "all":
        bank = [q for q in bank if category.lower() in q["category"].lower()]

    selected = bank[:count]
    return [
        AptitudeMCQ(
            id=q["id"],
            category=q["category"],
            difficulty=q["difficulty"],
            question=q["question"],
            options=q["options"]
        )
        for q in selected
    ]

@router.post("/submit", response_model=AptitudeSubmitResponse)
def submit_aptitude_test(
    payload: AptitudeSubmitRequest,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    """
    Deterministically grades submitted MCQ answers against verified answer keys,
    returning score percentage, category breakdowns, and explanations.
    """
    # Normalize answers dictionary to handle IDs with or without "apt_" prefix
    normalized_answers = {}
    for k, v in payload.answers.items():
        normalized_answers[k] = v
        if k.startswith("q") and not k.startswith("apt_q"):
            normalized_answers[f"apt_{k}"] = v
        elif k.startswith("apt_q"):
            normalized_answers[k.replace("apt_", "")] = v

    # Fetch reference questions from database if available
    db_questions = db.query(AptitudeQuestion).all()
    if db_questions:
        bank_dict = {}
        for q in db_questions:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            bank_dict[q.id] = {
                "id": q.id,
                "category": q.category,
                "difficulty": q.difficulty,
                "question": q.question,
                "options": opts,
                "correct_option": q.correct_option,
                "explanation": q.explanation
            }
            # Also index by short id (e.g. q1)
            if q.id.startswith("apt_"):
                bank_dict[q.id.replace("apt_", "")] = bank_dict[q.id]
    else:
        bank_dict = {}
        for q in aptitude_agent.VERIFIED_APTITUDE_BANK:
            bank_dict[q["id"]] = q
            if q["id"].startswith("apt_"):
                bank_dict[q["id"].replace("apt_", "")] = q

    # Determine unique questions to grade against
    # If the user submitted specific question IDs, ensure those questions are graded.
    # Otherwise, grade against all distinct verified questions in the bank.
    unique_questions = {}
    for q_id, q_data in bank_dict.items():
        canonical_id = q_data["id"]
        if canonical_id not in unique_questions:
            unique_questions[canonical_id] = q_data

    # If submitted answers only belong to a subset, and test is not full default
    submitted_canonicals = set()
    for submitted_id in payload.answers.keys():
        if submitted_id in bank_dict:
            submitted_canonicals.add(bank_dict[submitted_id]["id"])

    # If all submitted answers correspond to a subset of the bank (and not all)
    # grade against that subset if requested, otherwise full bank
    if 0 < len(submitted_canonicals) < len(unique_questions) and payload.test_id != "all":
        grading_set = [unique_questions[cid] for cid in submitted_canonicals]
    else:
        grading_set = list(unique_questions.values())

    correct_count = 0
    total = len(grading_set)
    category_stats = {}
    results = []

    for q_data in grading_set:
        q_id = q_data["id"]
        # Look up user answer using canonical id or alternative representations
        user_choice = normalized_answers.get(q_id)
        if user_choice is None and q_id.startswith("apt_"):
            user_choice = normalized_answers.get(q_id.replace("apt_", ""))

        is_correct = bool(
            user_choice and user_choice.strip().upper() == q_data["correct_option"].strip().upper()
        )
        if is_correct:
            correct_count += 1

        cat = q_data["category"]
        if cat not in category_stats:
            category_stats[cat] = {"correct": 0, "total": 0}
        category_stats[cat]["total"] += 1
        if is_correct:
            category_stats[cat]["correct"] += 1

        results.append(
            AptitudeResultItem(
                question_id=q_id,
                question=q_data["question"],
                user_answer=user_choice,
                correct_answer=q_data["correct_option"],
                is_correct=is_correct,
                explanation=q_data["explanation"]
            )
        )

    score_pct = round((correct_count / total) * 100.0, 1) if total > 0 else 0.0
    category_scores = {
        cat: round((data["correct"] / data["total"]) * 100.0, 1)
        for cat, data in category_stats.items()
    }

    return AptitudeSubmitResponse(
        total_questions=total,
        correct_count=correct_count,
        score_percentage=score_pct,
        category_scores=category_scores,
        results=results
    )
