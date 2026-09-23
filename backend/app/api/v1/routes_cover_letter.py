"""
Cover Letter Generator — POST /tools/cover-letter/generate
Accepts resume text/file + job description, returns a tailored cover letter via call_llm().
Optionally exports as PDF (plain text → reportlab).
"""
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel, Field

from app.db.models.user import User
from app.db.models.activity_log import ActivityLog
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.core.deps import get_current_user
from app.agents.base_agent import call_llm
from app.core.logging import logger

router = APIRouter()
MAX_FILE_SIZE_MB = 20


# ── helpers ────────────────────────────────────────────────────────────────────

def _extract_text_from_bytes(content: bytes, filename: str) -> str:
    """Extract plain text from PDF or DOCX bytes (best-effort, no vision OCR)."""
    name = (filename or "").lower()

    if name.endswith(".pdf") or content[:4] == b"%PDF":
        try:
            import pypdf, io
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception:
            raise ValueError("Unable to read the PDF file. Please paste your resume text instead.")

    if name.endswith(".docx") or content[:2] == b"PK":
        try:
            import docx, io
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception:
            raise ValueError("Unable to read the Word file. Please paste your resume text instead.")

    raise ValueError("Unsupported file type. Please upload a PDF or .docx file.")


def _cover_letter_to_pdf(text: str) -> bytes:
    """Render plain-text cover letter to a clean A4 PDF using reportlab."""
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4
    import io, textwrap

    page_w, page_h = A4
    margin = 72
    line_h = 15
    font_size = 11

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica", font_size)

    y = page_h - margin
    max_chars = int((page_w - 2 * margin) / (font_size * 0.55))

    for raw_line in text.splitlines():
        wrapped = textwrap.wrap(raw_line, width=max_chars) if raw_line.strip() else [""]
        for wl in wrapped:
            if y < margin + line_h:
                c.showPage()
                c.setFont("Helvetica", font_size)
                y = page_h - margin
            c.drawString(margin, y, wl)
            y -= line_h

    c.save()
    return buf.getvalue()


# ── endpoints ──────────────────────────────────────────────────────────────────

COVER_LETTER_SYSTEM_PROMPT = """
You are an expert career coach and professional writer. Your task is to write a tailored, compelling cover letter.

Instructions:
- Address the letter to "Hiring Manager" unless a specific name is known.
- Open with a strong, personalized hook referencing the specific role.
- Highlight 2-3 key experiences from the resume that directly match the job requirements.
- Use specific, quantified achievements wherever possible.
- Close with a confident call to action.
- Keep the letter to 3-4 short paragraphs (~300-400 words).
- Use a professional but warm tone.
- Output ONLY the cover letter text itself — no preamble, no JSON, no markdown headers.
""".strip()


class GenerateRequest(BaseModel):
    resume_text: str = Field(default="", description="Pasted resume text (if no file uploaded)")
    job_description: str = Field(..., min_length=20, description="Job description text")


@router.post("/generate")
async def api_generate_cover_letter(
    job_description: str = Form(...),
    resume_text: str = Form(default=""),
    resume_file: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a tailored cover letter from resume + job description."""
    try:
        # Resolve resume text
        final_resume = resume_text.strip()
        if resume_file and resume_file.filename:
            content = await resume_file.read()
            if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Resume file exceeds 20MB limit.")
            final_resume = _extract_text_from_bytes(content, resume_file.filename)

        if not final_resume:
            raise HTTPException(status_code=400, detail="Please provide resume text or upload a resume file.")
        if not job_description.strip():
            raise HTTPException(status_code=400, detail="Please provide a job description.")

        jd = job_description.strip()[:4000]
        resume_snippet = final_resume[:4000]

        messages = [
            {
                "role": "user",
                "content": (
                    f"RESUME:\n{resume_snippet}\n\n"
                    f"JOB DESCRIPTION:\n{jd}\n\n"
                    "Please write a tailored cover letter for this position."
                )
            }
        ]

        cover_letter = await call_llm(
            messages=messages,
            system_prompt=COVER_LETTER_SYSTEM_PROMPT,
            append_common_prompt=False
        )

        # Log Activity
        try:
            activity = ActivityLog(
                user_id=current_user.id,
                agent_name="career",
                action_description="Generated tailored cover letter"
            )
            db.add(activity)
            db.commit()
        except Exception:
            pass

        return {"cover_letter": cover_letter.strip()}

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error generating cover letter")
        raise HTTPException(status_code=500, detail="Failed to generate cover letter. Please try again.")


@router.post("/export-pdf")
async def api_export_cover_letter_pdf(
    cover_letter_text: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Export cover letter text as a clean A4 PDF."""
    try:
        if not cover_letter_text.strip():
            raise HTTPException(status_code=400, detail="Cover letter text cannot be empty.")
        pdf_bytes = _cover_letter_to_pdf(cover_letter_text)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Cover_Letter.pdf"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error exporting cover letter PDF")
        raise HTTPException(status_code=500, detail="Failed to export PDF.")
