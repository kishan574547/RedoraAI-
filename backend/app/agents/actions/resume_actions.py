from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.db.models.session_document import SessionDocument
from app.services.resume_ats_checker import (
    extract_resume_text,
    rule_based_checks,
    keyword_match_score,
    ai_qualitative_feedback,
)


def _get_target_document(db: Session, session_id: Optional[int], file_id: Optional[int] = None) -> Optional[SessionDocument]:
    """Retrieve SessionDocument by file_id or get most recent uploaded document in session."""
    if file_id:
        doc = db.query(SessionDocument).filter(SessionDocument.id == file_id).first()
        if doc:
            return doc
    if session_id:
        doc = db.query(SessionDocument).filter(SessionDocument.session_id == session_id).order_by(SessionDocument.uploaded_at.desc()).first()
        return doc
    return None


async def check_resume_action(
    db: Session,
    session_id: Optional[int] = None,
    file_id: Optional[int] = None,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Check uploaded resume document against job description for ATS match score, rule checks, and qualitative feedback.
    """
    doc = _get_target_document(db, session_id, file_id)
    
    if not doc or not doc.extracted_text:
        return {
            "success": False,
            "message": "No resume document found in session. Please upload a resume file (PDF or DOCX) in chat to check ATS score."
        }

    resume_text = doc.extracted_text
    jd_text = (job_description or "").strip()

    # Rule-based checks & Keyword match
    rule_res = rule_based_checks(resume_text)
    keyword_res = keyword_match_score(resume_text, jd_text)
    ai_feedback = await ai_qualitative_feedback(resume_text, jd_text)

    # Score calculation
    rule_score = rule_res["score"]
    if keyword_res.get("match_percentage") is not None:
        overall_score = round((rule_score * 0.6) + (keyword_res["match_percentage"] * 0.4))
    else:
        overall_score = round(rule_score)
    overall_score = min(100, max(0, overall_score))

    feedback_bullets = "\n".join([f"- {b}" for b in ai_feedback])
    matched_kw_str = ", ".join(keyword_res.get("matched_keywords", [])) if keyword_res.get("matched_keywords") else "N/A"
    missing_kw_str = ", ".join(keyword_res.get("missing_keywords", [])) if keyword_res.get("missing_keywords") else "None"

    return {
        "success": True,
        "overall_score": overall_score,
        "word_count": rule_res["word_count"],
        "filename": doc.filename,
        "matched_keywords": keyword_res.get("matched_keywords", []),
        "missing_keywords": keyword_res.get("missing_keywords", []),
        "ai_feedback": ai_feedback,
        "message": (
            f"📄 **Resume ATS Analysis Results for '{doc.filename}'**\n"
            f"- **Overall ATS Score**: **{overall_score}/100**\n"
            f"- **Word Count**: {rule_res['word_count']} words\n"
            f"- **Matched Keywords**: {matched_kw_str}\n"
            f"- **Missing Keywords**: {missing_kw_str}\n\n"
            f"💡 **AI Recommendations:**\n{feedback_bullets}"
        )
    }
