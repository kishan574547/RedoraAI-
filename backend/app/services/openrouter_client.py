import json
import httpx
from app.core.config import settings
from app.core.logging import logger
from typing import List, Dict, Optional


class OpenRouterClient:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY or settings.OPENAI_API_KEY or ""
        self.base_url = "https://openrouter.ai/api/v1"
        self.fallback_models = [
            "deepseek/deepseek-chat",
            "qwen/qwen-2.5-72b-instruct",
            "google/gemini-2.5-flash",
            "meta-llama/llama-3.3-70b-instruct"
        ]

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lifeos.app",
            "X-Title": "LifeOS"
        }
        
        models_to_try = [model] if model else self.fallback_models
        
        for attempt_model in models_to_try:
            try:
                payload = {
                    "model": attempt_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
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
