import os
import json
import httpx
from typing import List, Dict, Optional, Any
from app.core.config import settings
from app.core.logging import logger


class OpenRouterClient:
    """
    OpenRouter API Client for LLM execution fallback chain.
    Fallback chain order: DeepSeek -> Qwen -> Llama -> Gemma.
    """
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY or settings.OPENAI_API_KEY or os.environ.get("OPENROUTER_API_KEY") or ""
        self.base_url = "https://openrouter.ai/api/v1"
        self.fallback_models = [
            "deepseek/deepseek-chat",
            "qwen/qwen-2.5-72b-instruct",
            "meta-llama/llama-3.3-70b-instruct",
            "google/gemma-2-27b-it"
        ]

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """
        Executes OpenRouter API call attempting candidate models in order.
        Returns OpenAI-standard format with metadata ('provider' and 'model').
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lifeos.app",
            "X-Title": "LifeOS"
        }

        models_to_try = [model] if model else self.fallback_models
        # Remove empty or duplicate models
        models_to_try = [m for m in models_to_try if m]

        for attempt_model in models_to_try:
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
                    if "choices" in result and len(result["choices"]) > 0:
                        content = result["choices"][0]["message"]["content"]
                        logger.info(f"Successfully served LLM call via OpenRouter model: {attempt_model}")
                        return {
                            "choices": [{"message": {"content": content}}],
                            "provider": "OpenRouter",
                            "model": attempt_model,
                            "status": 200
                        }
            except Exception as e:
                logger.warning(f"OpenRouter model {attempt_model} call failed: {str(e)}")
                continue

        # All online OpenRouter models failed -> Return structured intelligent fallback
        logger.warning("All OpenRouter fallback models failed. Returning local intelligent fallback response.")

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
            ],
            "provider": "LocalFallback",
            "model": "local-fallback",
            "status": 200
        }
