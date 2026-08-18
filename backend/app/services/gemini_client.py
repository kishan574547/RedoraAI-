import os
import time
import httpx
from typing import List, Dict, Optional, Any
from app.core.config import settings
from app.core.logging import logger


class GeminiCircuitBreaker:
    """
    In-memory circuit breaker and rolling failure tracker for Google Gemini API.
    
    If Gemini fails repeatedly (e.g., 3 consecutive failures within a short window due to quota/429/auth errors),
    it enters a cooldown state for `cooldown_seconds` (default: 300s / 5 minutes) during which requests immediately
    route to the OpenRouter fallback chain without wasting latency on Gemini attempts.
    """
    def __init__(self, failure_threshold: int = 3, cooldown_seconds: int = 300):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.consecutive_failures = 0
        self.cooldown_until = 0.0
        self.total_successes = 0
        self.total_failures = 0
        self.last_failure_reason = ""
        self.last_failure_time = 0.0

    def is_available(self) -> bool:
        """Returns True if Gemini is healthy or cooldown period has elapsed."""
        now = time.time()
        if self.consecutive_failures >= self.failure_threshold:
            if now < self.cooldown_until:
                remaining = int(self.cooldown_until - now)
                logger.info(
                    f"Gemini Circuit Breaker OPEN: In cooldown for next {remaining}s "
                    f"due to {self.consecutive_failures} consecutive failures. Skipping Gemini."
                )
                return False
            else:
                # Cooldown period expired, allow half-open retry
                logger.info("Gemini Circuit Breaker HALF-OPEN: Cooldown expired. Testing Gemini retry...")
        return True

    def record_success(self, model_name: str = "") -> None:
        """Record successful Gemini API call and reset failure counters."""
        self.total_successes += 1
        if self.consecutive_failures > 0:
            logger.info(f"Gemini Circuit Breaker CLOSED: Recovered after {self.consecutive_failures} previous failures.")
        self.consecutive_failures = 0
        self.cooldown_until = 0.0

    def record_failure(self, reason: str = "") -> None:
        """Record Gemini API failure and enter cooldown if threshold reached."""
        self.total_failures += 1
        self.consecutive_failures += 1
        self.last_failure_reason = reason
        self.last_failure_time = time.time()

        logger.warning(
            f"Gemini API failure recorded ({self.consecutive_failures}/{self.failure_threshold}). Reason: {reason}"
        )

        if self.consecutive_failures >= self.failure_threshold:
            self.cooldown_until = time.time() + self.cooldown_seconds
            logger.warning(
                f"Gemini failure threshold reached ({self.consecutive_failures} consecutive failures). "
                f"Entering {self.cooldown_seconds}s cooldown window. Fallback chain will handle requests."
            )


# Global Circuit Breaker Singleton Instance
gemini_circuit_breaker = GeminiCircuitBreaker(failure_threshold=3, cooldown_seconds=300)


class GeminiClient:
    """
    Direct Google Gemini REST API Client targeting gemini-2.0-flash and gemini-1.5-flash.
    """
    def __init__(self):
        self.circuit_breaker = gemini_circuit_breaker

    def get_gemini_keys(self) -> List[str]:
        """Fetch all configured Gemini API keys from settings and environment."""
        keys = [
            settings.GEMINI_API_KEY,
            os.environ.get("GEMINI_API_KEY"),
            settings.OPENAI_API_KEY if (settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("AIza")) else None,
        ]
        valid_keys = [k.strip() for k in keys if k and k.strip()]
        # Unique ordered list
        return list(dict.fromkeys(valid_keys))

    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict[str, Any]:
        """
        Execute Gemini REST API call with model fallback order (gemini-2.0-flash -> gemini-1.5-flash).
        Raises Exception if all Gemini attempts fail.
        """
        if not self.circuit_breaker.is_available():
            raise Exception("Gemini Circuit Breaker is active (in cooldown state).")

        keys = self.get_gemini_keys()
        if not keys:
            self.circuit_breaker.record_failure("No valid GEMINI_API_KEY configured in environment or settings.")
            raise Exception("No valid GEMINI_API_KEY found.")

        # Determine target models (Gemini Primary requirement)
        target_models = []
        if model and "gemini" in model.lower():
          target_models.append(model)
        target_models.extend(["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"])
        target_models = list(dict.fromkeys(target_models))

        # Format messages into Gemini REST API format
        system_text = (system_prompt or "").strip()
        contents = []

        for m in messages:
            role = m.get("role", "user")
            raw_content = m.get("content", "")
            if role == "system":
                system_text += "\n" + (raw_content if isinstance(raw_content, str) else str(raw_content))
                continue

            gemini_role = "model" if role == "assistant" else "user"
            parts = []

            if isinstance(raw_content, str):
                if raw_content.strip():
                    parts.append({"text": raw_content})
            elif isinstance(raw_content, list):
                for item in raw_content:
                    if isinstance(item, dict):
                        if item.get("type") == "text":
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

        # Merge consecutive same-role messages
        merged_contents = []
        for item in contents:
            if merged_contents and merged_contents[-1]["role"] == item["role"]:
                merged_contents[-1]["parts"].extend(item["parts"])
            else:
                merged_contents.append(item)

        if not merged_contents:
            merged_contents.append({"role": "user", "parts": [{"text": system_text or "Hello"}]})

        payload: Dict[str, Any] = {
            "contents": merged_contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": min(max_tokens, 2048)
            }
        }
        if system_text.strip():
            payload["system_instruction"] = {
                "parts": [{"text": system_text.strip()}]
            }

        last_error = ""

        # Try API keys and models
        for g_key in keys:
            for g_model in target_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={g_key}"
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        response = await client.post(url, json=payload)
                        if response.status_code == 200:
                            data = response.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                text_out = "".join([p.get("text", "") for p in parts if "text" in p])
                                if text_out:
                                    self.circuit_breaker.record_success(model_name=g_model)
                                    return {
                                        "content": text_out,
                                        "provider": "Gemini",
                                        "model": g_model,
                                        "status": 200
                                    }
                            last_error = f"Gemini model {g_model} returned empty candidates."
                        else:
                            last_error = f"Gemini HTTP {response.status_code}: {response.text[:200]}"
                            logger.warning(f"Google Gemini model {g_model} returned status {response.status_code}: {response.text[:150]}")
                except Exception as e:
                    last_error = f"Gemini request exception for {g_model}: {str(e)}"
                    logger.warning(f"Google Gemini API attempt failed ({g_model}): {str(e)}")

        self.circuit_breaker.record_failure(last_error)
        raise Exception(f"All Gemini API attempts failed. Last error: {last_error}")
