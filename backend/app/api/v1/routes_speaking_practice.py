from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.speaking_practice_session import SpeakingPracticeSession
from app.core.deps import get_current_user
from app.agents.base_agent import call_llm, extract_clean_response_text
from app.core.logging import logger

router = APIRouter()


class SpeakingPracticeRequest(BaseModel):
    user_text: Optional[str] = None
    user_speech: Optional[str] = None
    message: Optional[str] = None
    topic: Optional[str] = "Free Talk"
    language: Optional[str] = "en-US"
    conversation_history: Optional[List[Dict[str, Any]]] = []


class SaveSpeakingSessionRequest(BaseModel):
    topic: Optional[str] = "Free Talk"
    transcript: Optional[List[Dict[str, Any]]] = []
    duration: Optional[int] = 0
    language: Optional[str] = "en-US"


@router.post("/respond")
@router.post("/respond/")
async def api_speaking_practice_respond(
    req: SpeakingPracticeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dedicated endpoint for Redora Speak (English & Multilingual Speaking Practice).
    Receives user spoken text, contacts LLM, and returns { ai_response, feedback_note }.
    Authenticated per current_user.
    """
    user_input = (req.user_text or req.user_speech or req.message or "").strip()
    if not user_input:
        logger.warning("[SpeakingPractice API] Empty user input provided.")
        raise HTTPException(status_code=400, detail="User input text cannot be empty.")

    logger.info(f"[SpeakingPractice API] User {current_user.id} requested topic '{req.topic}' (lang='{req.language}'): '{user_input}'")

    lang_map = {
        'te-IN': 'Telugu',
        'ta-IN': 'Tamil',
        'hi-IN': 'Hindi',
        'en-US': 'English'
    }
    lang_code = req.language or 'en-US'
    target_lang_name = lang_map.get(lang_code, 'English')
    lang_instruction = ""
    if target_lang_name != 'English':
        lang_instruction = f"\n3. LANGUAGE INSTRUCTION: The user selected {target_lang_name} ({lang_code}). Respond and provide feedback in clear, natural {target_lang_name} native script."

    system_prompt = f"""You are Redora Speak, an encouraging, friendly, and expert speech coach.
The user is practicing speech under the topic context: "{req.topic}".

INSTRUCTIONS:
1. Respond to the user naturally in 2 to 4 conversational sentences so they can practice listening and keep the dialogue going.
2. In a separate short feedback note (1-2 sentences), provide constructive, supportive feedback on their phrasing, grammar, or vocabulary, or applaud their clarity.{lang_instruction}

Output your final response as valid JSON matching this exact structure:
```json
{{
  "ai_response": "Your conversational response to speak aloud to the user...",
  "feedback_note": "Short feedback on their usage or pronunciation..."
}}
```
Do NOT include any extra formatting or text outside the JSON.
"""

    messages = [{"role": "user", "content": user_input}]
    if req.conversation_history:
        messages = req.conversation_history + messages

    try:
        raw_output = await call_llm(messages=messages, system_prompt=system_prompt, append_common_prompt=False)
        logger.info(f"[SpeakingPractice API] Raw LLM output received: {raw_output[:200]}...")

        # Parse structured response
        ai_response = ""
        feedback_note = ""

        try:
            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end + 1]
            parsed = json.loads(cleaned)

            ai_response = parsed.get("ai_response") or parsed.get("response_text") or ""
            feedback_note = parsed.get("feedback_note") or ""
        except Exception as parse_err:
            logger.warning(f"[SpeakingPractice API] Failed to parse JSON response: {parse_err}. Extracting plain text.")

        if not ai_response:
            ai_response = extract_clean_response_text(raw_output)

        if not ai_response:
            ai_response = "Great effort! That was clearly spoken. Keep going and try another sentence!"

        if not feedback_note:
            feedback_note = "Good vocal clarity and rhythm. Keep practicing!"

        response_payload = {
            "ai_response": ai_response,
            "feedback_note": feedback_note
        }

        logger.info(f"[SpeakingPractice API] Endpoint returning payload: {response_payload}")
        return response_payload

    except Exception as e:
        logger.exception(f"[SpeakingPractice API Error] Exception during LLM generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Speaking agent failure: {str(e)}"
        )


@router.post("/sessions")
@router.post("/sessions/")
async def save_speaking_practice_session(
    req: SaveSpeakingSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a completed speaking practice session for the current user.
    """
    session = SpeakingPracticeSession(
        user_id=current_user.id,
        topic=req.topic or "Free Talk",
        transcript=req.transcript or [],
        duration=req.duration or 0,
        language=req.language or "en-US"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info(f"[SpeakingPractice API] Saved practice session {session.id} for user {current_user.id}")
    return {
        "id": session.id,
        "topic": session.topic,
        "duration": session.duration,
        "language": session.language,
        "created_at": session.created_at,
        "message": "Speaking practice session saved successfully."
    }


@router.get("/sessions")
@router.get("/sessions/")
@router.get("/history")
@router.get("/history/")
async def get_speaking_practice_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List past speaking practice sessions for current user, ordered by date descending.
    """
    sessions = (
        db.query(SpeakingPracticeSession)
        .filter(SpeakingPracticeSession.user_id == current_user.id)
        .order_by(SpeakingPracticeSession.created_at.desc())
        .all()
    )
    return {
        "sessions": [
            {
                "id": s.id,
                "topic": s.topic,
                "duration": s.duration,
                "language": s.language,
                "transcript": s.transcript or [],
                "exchanges_count": len([m for m in (s.transcript or []) if isinstance(m, dict) and m.get("role") == "user"]),
                "created_at": s.created_at
            }
            for s in sessions
        ]
    }


@router.get("/sessions/{session_id}")
@router.get("/sessions/{session_id}/")
async def get_speaking_practice_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch full detail of a specific practice session for current user.
    """
    session = (
        db.query(SpeakingPracticeSession)
        .filter(
            SpeakingPracticeSession.id == session_id,
            SpeakingPracticeSession.user_id == current_user.id
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaking practice session not found."
        )

    return {
        "id": session.id,
        "topic": session.topic,
        "duration": session.duration,
        "language": session.language,
        "transcript": session.transcript or [],
        "created_at": session.created_at
    }
