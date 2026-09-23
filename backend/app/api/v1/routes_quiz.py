"""
AI Quiz Generator — POST /tools/quiz/generate
Accepts a topic, pasted notes, or uploaded document.
Generates multiple-choice questions with correct answers and explanations via call_llm().
"""
import json
import re
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException

from app.db.models.user import User
from app.core.deps import get_current_user
from app.agents.base_agent import call_llm
from app.core.logging import logger

router = APIRouter()
MAX_FILE_SIZE_MB = 20


QUIZ_SYSTEM_PROMPT = """
You are an expert educator and quiz writer. Generate high-quality multiple-choice quiz questions based on the provided material.

Rules:
- Generate exactly the requested number of questions (or as many as the material supports, min 3).
- Each question has exactly 4 options labeled A, B, C, D.
- Exactly one option is correct.
- Include a clear explanation for why the correct answer is right.
- Questions should test understanding, not just memorization of exact phrases.
- Vary difficulty from conceptual to applied questions.

Output ONLY valid JSON (no markdown, no extra text):
{
  "questions": [
    {
      "question": "...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct_answer": "A",
      "explanation": "..."
    }
  ]
}
""".strip()


def _extract_text(content: bytes, filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf") or content[:4] == b"%PDF":
        try:
            import pypdf, io
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            raise ValueError("Unable to read the PDF file.")
    if name.endswith(".docx") or content[:2] == b"PK":
        try:
            import docx, io
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            raise ValueError("Unable to read the Word file.")
    try:
        return content.decode("utf-8", errors="replace")
    except Exception:
        raise ValueError("Unable to read the file.")


@router.post("/generate")
async def api_generate_quiz(
    topic: str = Form(default=""),
    notes_text: str = Form(default=""),
    num_questions: int = Form(default=10),
    notes_file: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(get_current_user)
):
    """Generate a multiple-choice quiz from a topic, notes, or uploaded file."""
    try:
        # Determine source material
        material = notes_text.strip()
        if notes_file and notes_file.filename:
            content = await notes_file.read()
            if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File exceeds 20MB limit.")
            material = _extract_text(content, notes_file.filename)

        topic_str = topic.strip()
        if not material and not topic_str:
            raise HTTPException(status_code=400, detail="Please provide a topic, notes, or upload a file.")

        num_questions = max(3, min(30, num_questions))

        if material:
            user_content = (
                f"Create {num_questions} multiple-choice quiz questions from this material:\n\n"
                f"{material[:5000]}"
            )
            if topic_str:
                user_content = f"TOPIC: {topic_str}\n\n" + user_content
        else:
            user_content = f"Create {num_questions} multiple-choice quiz questions about: {topic_str}"

        messages = [{"role": "user", "content": user_content}]
        raw = await call_llm(messages=messages, system_prompt=QUIZ_SYSTEM_PROMPT, append_common_prompt=False)

        # Parse JSON
        cleaned = raw.strip()
        m = re.search(r"```(?:json)?\s*(\{[\s\S]+\})\s*```", cleaned)
        if m:
            cleaned = m.group(1)
        else:
            s, e = cleaned.find("{"), cleaned.rfind("}")
            if s != -1 and e != -1:
                cleaned = cleaned[s:e+1]

        try:
            data = json.loads(cleaned)
            questions = data.get("questions", [])
        except Exception:
            raise HTTPException(status_code=500, detail="AI returned an unexpected format. Please try again.")

        if not questions:
            raise HTTPException(status_code=500, detail="AI could not generate questions from the provided material.")

        # Validate/sanitize
        valid = []
        for q in questions:
            if (
                q.get("question") and
                isinstance(q.get("options"), dict) and
                len(q["options"]) == 4 and
                q.get("correct_answer") in ("A", "B", "C", "D")
            ):
                valid.append({
                    "question": q["question"],
                    "options": q["options"],
                    "correct_answer": q["correct_answer"],
                    "explanation": q.get("explanation", "")
                })

        if not valid:
            raise HTTPException(status_code=500, detail="AI returned malformed questions. Please try again.")

        return {
            "topic": topic_str or "Custom Material",
            "total_questions": len(valid),
            "questions": valid
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error generating quiz")
        raise HTTPException(status_code=500, detail="Failed to generate quiz. Please try again.")
