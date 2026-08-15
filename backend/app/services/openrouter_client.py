import os
import json
import httpx
from app.core.config import settings
from app.core.logging import logger
from typing import List, Dict, Optional


class OpenRouterClient:
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY") or ""
        self.api_key = settings.OPENROUTER_API_KEY or settings.OPENAI_API_KEY or ""
        self.base_url = "https://openrouter.ai/api/v1"
        self.fallback_models = [
            "deepseek/deepseek-chat",
            "qwen/qwen-2.5-72b-instruct",
            "meta-llama/llama-3.3-70b-instruct"
        ]

    async def _call_gemini_api(
        self,
        gemini_key: str,
        messages: List[Dict],
        model_name: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Optional[Dict]:
        """Call Google Gemini REST API directly using GEMINI_API_KEY."""
        try:
            system_text = ""
            contents = []

            for m in messages:
                role = m.get("role", "user")
                raw_content = m.get("content", "")
                gemini_role = "model" if role == "assistant" else "user"

                parts = []
                if isinstance(raw_content, str):
                    if role == "system":
                        system_text += raw_content + "\n"
                        continue
                    parts.append({"text": raw_content})
                elif isinstance(raw_content, list):
                    for item in raw_content:
                        if isinstance(item, dict):
                            if item.get("type") == "text":
                                if role == "system":
                                    system_text += item.get("text", "") + "\n"
                                else:
                                    parts.append({"text": item.get("text", "")})
                            elif item.get("type") == "image_url":
                                img_url = item.get("image_url", {}).get("url", "")
                                if img_url.startswith("data:"):
                                    try:
                                        header, b64_data = img_url.split(",", 1)
                                        mime_type = header.split(";")[0].replace("data:", "")
                                        parts.append({
                                            "inline_data": {
                                                "mime_type": mime_type,
                                                "data": b64_data
                                            }
                                        })
                                    except Exception:
                                        pass

                if parts:
                    contents.append({"role": gemini_role, "parts": parts})

            if not contents and system_text:
                contents.append({"role": "user", "parts": [{"text": system_text}]})

            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": min(max_tokens, 2048)
                }
            }
            if system_text.strip():
                payload["system_instruction"] = {
                    "parts": [{"text": system_text.strip()}]
                }

            target_models = []
            if model_name and "gemini" in model_name.lower():
                target_models.append(model_name)
            target_models.extend(["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.0-flash", "gemini-pro-latest", "gemini-2.5-pro"])
            target_models = list(dict.fromkeys(target_models))

            for g_model in target_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            text_out = "".join([p.get("text", "") for p in parts if "text" in p])
                            if text_out:
                                logger.info(f"Successfully generated response from Google Gemini model: {g_model}")
                                return {
                                    "choices": [
                                        {
                                            "message": {
                                                "content": text_out
                                            }
                                        }
                                    ]
                                }
                    else:
                        logger.warning(f"Google Gemini model {g_model} returned status {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.warning(f"Google Gemini API call failed: {str(e)}")

        return None

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict:
        # Check Google Gemini API key first
        g_key = self.gemini_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if g_key:
            gemini_res = await self._call_gemini_api(
                gemini_key=g_key,
                messages=messages,
                model_name=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            if gemini_res:
                return gemini_res

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lifeos.app",
            "X-Title": "LifeOS"
        }
        
        models_to_try = [model] if model else self.fallback_models
        
        for attempt_model in models_to_try:
            if not attempt_model:
                continue
            try:
                payload = {
                    "model": attempt_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": min(max_tokens, 1000)
                }
                
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    
                    result = response.json()
                    logger.info(f"Successfully got response from model: {attempt_model}")
                    return result
                    
            except Exception as e:
                logger.warning(f"Model {attempt_model} call failed: {str(e)}")
                continue

        
        # All API models failed / unauthorized / offline -> Return structured agent fallback
        logger.warning("All OpenRouter models failed. Returning fallback intelligent response.")
        
        # Extract last user input message if present
        user_text = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                raw_content = m.get("content", "")
                if isinstance(raw_content, list):
                    text_parts = [item.get("text", "") for item in raw_content if isinstance(item, dict) and item.get("type") == "text"]
                    user_text = " ".join(text_parts)
                elif isinstance(raw_content, str):
                    user_text = raw_content
                break
        
        fallback_reply = "Hello! I am your Redora AI Assistant. I can help you organize daily tasks, create study roadmaps, track habits, set goals, and prepare for interviews. What goal or task would you like to work on today?"
        if any(h in user_text.lower() for h in ["hi", "hello", "hey"]):
            fallback_reply = "Hello! How can I assist you with your tasks, goals, or study plan today?"
        
        fallback_json = json.dumps({
            "response_text": fallback_reply,
            "tasks": [],
            "goals": [],
            "resources": [],
            "practice_questions": [],
            "suggestions": [
                {
                    "type": "tip",
                    "title": "Proactive Redora AI Guidance",
                    "description": "Ask an agent for a study roadmap, coding plan, or expense log to automatically generate tasks and goals!"
                }
            ]
        })

        return {
            "choices": [
                {
                    "message": {
                        "content": fallback_json
                    }
                }
            ]
        }
