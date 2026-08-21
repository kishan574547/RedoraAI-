from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json

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


@router.post("/respond")
@router.post("/respond/")
async def api_speaking_practice_respond(req: SpeakingPracticeRequest):
    """
    Dedicated endpoint for Redora Speak (English & Multilingual Speaking Practice).
    Receives user spoken text, contacts Gemini/OpenRouter LLM, and returns { ai_response, feedback_note }.
    """
    user_input = (req.user_text or req.user_speech or req.message or "").strip()
    if not user_input:
        logger.warning("[SpeakingPractice API] Empty user input provided.")
        raise HTTPException(status_code=400, detail="User input text cannot be empty.")

    logger.info(f"[SpeakingPractice API] Received request for topic '{req.topic}' (lang='{req.language}'): '{user_input}'")

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
