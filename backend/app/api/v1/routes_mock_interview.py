from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Form, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.mock_interview_session import MockInterviewSession
from app.db.models.user import User
from app.core.deps import get_current_user
from app.agents.mock_interview_agent import mock_interview_agent
from app.services.document_scanner import document_scanner
from app.core.logging import logger

router = APIRouter()


class AnswerRequest(BaseModel):
    session_id: int
    answer_text: str


@router.post("/start")
async def start_mock_interview(
    request: Request,
    job_description: Optional[str] = Form(None),
    difficulty_level: Optional[str] = Form("Mid-Level"),
    interview_type: Optional[str] = Form("Full Interview (Mixed)"),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new Mock Interview session.
    Accepts job description text OR uploaded document, along with difficulty_level and interview_type.
    """
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                job_description = body.get("job_description") or job_description
                difficulty_level = body.get("difficulty_level") or difficulty_level
                interview_type = body.get("interview_type") or interview_type
            except Exception:
                pass

        jd_text = (job_description or "").strip()
        diff_level = (difficulty_level or "Mid-Level").strip()
        int_type = (interview_type or "Full Interview (Mixed)").strip()

        if file and file.filename:
            file_bytes = await file.read()
            if len(file_bytes) > 15 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 15MB.")

            scan_result = await document_scanner.extract_content(
                file_bytes=file_bytes,
                filename=file.filename,
                content_type=file.content_type or ""
            )
            extracted_text = scan_result.get("extracted_text", "")
            if extracted_text.strip():
                jd_text = f"{jd_text}\n\n[Uploaded Document ({file.filename})]:\n{extracted_text}".strip()

        if not jd_text:
            raise HTTPException(status_code=400, detail="Please provide a job description text or upload a job description document.")

        logger.info(f"[MockInterview API] Starting session for user {current_user.id} (Difficulty: {diff_level}, Type: {int_type})...")

        persona_data = await mock_interview_agent.start_session(
            job_description=jd_text,
            difficulty_level=diff_level,
            interview_type=int_type
        )

        initial_qa = [
            {
                "question_num": 1,
                "question": persona_data["first_question"],
                "user_answer": None
            }
        ]

        session = MockInterviewSession(
            user_id=current_user.id,
            job_description=jd_text,
            persona_name=persona_data["persona_name"],
            persona_role=persona_data["persona_role"],
            persona_trait=persona_data["persona_trait"],
            difficulty_level=diff_level,
            interview_type=int_type,
            questions_and_answers=initial_qa,
            status="active"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        return {
            "session_id": session.id,
            "persona_name": session.persona_name,
            "persona_role": session.persona_role,
            "persona_trait": session.persona_trait,
            "difficulty_level": session.difficulty_level,
            "interview_type": session.interview_type,
            "first_question": persona_data["first_question"],
            "current_question_num": 1,
            "total_questions": 7,
            "status": "active"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[MockInterview API Error] Failed to start interview session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start mock interview: {str(e)}")


@router.post("/answer")
async def answer_mock_interview_question(
    body: AnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits user answer for current interview question, records response, and generates next question or completes session.
    """
    try:
        session = db.query(MockInterviewSession).filter(
            MockInterviewSession.id == body.session_id,
            MockInterviewSession.user_id == current_user.id
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Mock interview session not found.")

        if session.status == "completed":
            return {
                "is_complete": True,
                "session_id": session.id,
                "summary_feedback": session.summary_feedback,
                "questions_and_answers": session.questions_and_answers
            }

        qa_list = list(session.questions_and_answers or [])
        if not qa_list:
            raise HTTPException(status_code=500, detail="Invalid session state: no questions found.")

        current_qa = qa_list[-1]
        current_qa["user_answer"] = body.answer_text.strip()
        qa_list[-1] = current_qa

        current_question_num = current_qa["question_num"]
        total_questions = 7

        persona = {
            "persona_name": session.persona_name,
            "persona_role": session.persona_role,
            "persona_trait": session.persona_trait
        }
        diff_level = getattr(session, "difficulty_level", "Mid-Level")
        int_type = getattr(session, "interview_type", "Full Interview (Mixed)")

        if current_question_num >= total_questions:
            session.questions_and_answers = qa_list
            summary = await mock_interview_agent.generate_summary(
                job_description=session.job_description,
                persona=persona,
                qa_history=qa_list,
                difficulty_level=diff_level,
                interview_type=int_type
            )
            session.summary_feedback = summary
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(session)

            return {
                "is_complete": True,
                "session_id": session.id,
                "summary_feedback": summary,
                "questions_and_answers": session.questions_and_answers,
                "acknowledgment": "Interview complete! Generating your comprehensive performance summary..."
            }

        next_result = await mock_interview_agent.generate_next_question(
            job_description=session.job_description,
            persona=persona,
            qa_history=qa_list,
            current_question_index=current_question_num,
            total_questions=total_questions,
            difficulty_level=diff_level,
            interview_type=int_type
        )

        if next_result.get("is_complete"):
            summary = await mock_interview_agent.generate_summary(
                job_description=session.job_description,
                persona=persona,
                qa_history=qa_list,
                difficulty_level=diff_level,
                interview_type=int_type
            )
            session.questions_and_answers = qa_list
            session.summary_feedback = summary
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            db.commit()
            db.refresh(session)

            return {
                "is_complete": True,
                "session_id": session.id,
                "summary_feedback": summary,
                "questions_and_answers": session.questions_and_answers
            }

        next_q_num = current_question_num + 1
        qa_list.append({
            "question_num": next_q_num,
            "question": next_result["next_question"],
            "user_answer": None
        })

        session.questions_and_answers = qa_list
        db.commit()
        db.refresh(session)

        return {
            "is_complete": False,
            "session_id": session.id,
            "current_question_num": next_q_num,
            "total_questions": total_questions,
            "acknowledgment": next_result.get("acknowledgment", "Thank you."),
            "next_question": next_result["next_question"],
            "persona_name": session.persona_name,
            "persona_role": session.persona_role
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[MockInterview API Error] Failed to submit answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process answer: {str(e)}")


@router.get("/history")
async def get_mock_interview_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List past Mock Interview sessions for the authenticated user, ordered by date descending.
    """
    sessions = db.query(MockInterviewSession).filter(
        MockInterviewSession.user_id == current_user.id
    ).order_by(MockInterviewSession.created_at.desc()).all()

    results = []
    for s in sessions:
        # Extract job title preview from job description
        jd_preview = s.job_description.split("\n")[0][:80]
        results.append({
            "session_id": s.id,
            "job_title_preview": jd_preview,
            "persona_role": s.persona_role,
            "persona_trait": s.persona_trait,
            "difficulty_level": getattr(s, "difficulty_level", "Mid-Level"),
            "interview_type": getattr(s, "interview_type", "Full Interview (Mixed)"),
            "status": s.status,
            "questions_count": len(s.questions_and_answers or []),
            "readiness_score": s.summary_feedback.get("readiness_score") if s.summary_feedback else None,
            "readiness_note": s.summary_feedback.get("readiness_note") if s.summary_feedback else None,
            "created_at": s.created_at,
            "completed_at": s.completed_at
        })

    return {"sessions": results}


@router.get("/{session_id}")
@router.get("/{session_id}/summary")
async def get_mock_interview_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch full session detail including Q&A transcript and feedback summary.
    """
    session = db.query(MockInterviewSession).filter(
        MockInterviewSession.id == session_id,
        MockInterviewSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Mock interview session not found.")

    return {
        "session_id": session.id,
        "persona_name": session.persona_name,
        "persona_role": session.persona_role,
        "persona_trait": session.persona_trait,
        "difficulty_level": getattr(session, "difficulty_level", "Mid-Level"),
        "interview_type": getattr(session, "interview_type", "Full Interview (Mixed)"),
        "status": session.status,
        "job_description": session.job_description,
        "summary_feedback": session.summary_feedback,
        "questions_and_answers": session.questions_and_answers,
        "created_at": session.created_at,
        "completed_at": session.completed_at
    }
