from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel, Field

from app.db.models.user import User
from app.core.deps import get_current_user
from app.services.resume_ats_checker import (
    extract_resume_text,
    rule_based_checks,
    keyword_match_score,
    ai_qualitative_feedback,
    generate_custom_ai_suggestions,
    apply_resume_corrections,
    generate_optimized_docx,
    generate_optimized_pdf
)
from app.core.logging import logger

router = APIRouter()
MAX_FILE_SIZE_MB = 20


class CustomSuggestionRequest(BaseModel):
    resume_text: str = Field(..., min_length=1)
    custom_instruction: str = Field(..., min_length=1)
    job_description: Optional[str] = ""


class ApplyCorrectionsRequest(BaseModel):
    original_text: str = Field(..., min_length=1)
    accepted_suggestions: List[str] = []
    missing_keywords: List[str] = []


class ExportResumeRequest(BaseModel):
    resume_text: str = Field(..., min_length=1)


@router.post("/check")
async def api_check_resume(
    resume_file: UploadFile = File(...),
    job_description: Optional[str] = Form(default=""),
    current_user: User = Depends(get_current_user)
):
    """Analyze resume for ATS compliance, keyword matching, and AI recommendations."""
    if not resume_file.filename:
        raise HTTPException(status_code=400, detail="Please upload a valid resume file.")

    try:
        content = await resume_file.read()
        if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds the maximum limit of 20MB.")

        # 1. Extract plain text (with Google Gemini Vision OCR fallback)
        resume_text = await extract_resume_text(content, resume_file.filename)

        # 2. Perform rule-based checks
        rule_results = rule_based_checks(resume_text)

        # 3. Perform keyword matching if JD provided
        jd_text = (job_description or "").strip()
        keyword_results = keyword_match_score(resume_text, jd_text)

        # 4. Generate AI qualitative feedback
        ai_feedback = await ai_qualitative_feedback(resume_text, jd_text)

        # 5. Calculate overall weighted score (0 to 100)
        rule_score = rule_results["score"]
        if keyword_results.get("match_percentage") is not None:
            kw_score = keyword_results["match_percentage"]
            overall_score = round((rule_score * 0.6) + (kw_score * 0.4))
        else:
            overall_score = round(rule_score)

        return {
            "overall_score": min(100, max(0, overall_score)),
            "word_count": rule_results["word_count"],
            "raw_text": resume_text,
            "rule_based_results": rule_results["items"],
            "keyword_match_results": keyword_results,
            "ai_feedback": ai_feedback
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error checking resume ATS score")
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume: {str(e)}")


@router.post("/apply-corrections")
async def api_apply_corrections(
    req: ApplyCorrectionsRequest,
    current_user: User = Depends(get_current_user)
):
    """Apply accepted suggestions & missing keywords to rewrite an optimized ATS resume."""
    try:
        optimized_text = await apply_resume_corrections(
            original_text=req.original_text,
            accepted_suggestions=req.accepted_suggestions,
            missing_keywords=req.missing_keywords
        )

        reanalyzed = rule_based_checks(optimized_text)

        return {
            "optimized_text": optimized_text,
            "reanalyzed_score": min(100, max(85, round(reanalyzed["score"] + 15))),
            "word_count": reanalyzed["word_count"]
        }
    except Exception as e:
        logger.exception("Error applying resume corrections")
        raise HTTPException(status_code=500, detail=f"Failed to apply corrections: {str(e)}")


@router.post("/export-docx")
async def api_export_docx(
    req: ExportResumeRequest,
    current_user: User = Depends(get_current_user)
):
    """Export optimized resume text as an ATS-compliant .docx file."""
    try:
        docx_bytes = generate_optimized_docx(req.resume_text)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": 'attachment; filename="Optimized_ATS_Resume.docx"'}
        )
    except Exception as e:
        logger.exception("Error exporting DOCX resume")
        raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {str(e)}")


@router.post("/export-pdf")
async def api_export_pdf(
    req: ExportResumeRequest,
    current_user: User = Depends(get_current_user)
):
    """Export optimized resume text as an ATS-compliant .pdf file."""
    try:
        pdf_bytes = generate_optimized_pdf(req.resume_text)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Optimized_ATS_Resume.pdf"'}
        )
    except Exception as e:
        logger.exception("Error exporting PDF resume")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF document: {str(e)}")


@router.post("/custom-suggestion")
async def api_custom_suggestion(
    req: CustomSuggestionRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate custom ATS suggestions based on user prompt/instruction."""
    try:
        suggestions = await generate_custom_ai_suggestions(
            resume_text=req.resume_text,
            custom_instruction=req.custom_instruction,
            job_description=req.job_description or ""
        )
        return {"custom_suggestions": suggestions}
    except Exception as e:
        logger.exception("Error generating custom AI suggestions")
        raise HTTPException(status_code=500, detail=f"Failed to generate custom suggestion: {str(e)}")

