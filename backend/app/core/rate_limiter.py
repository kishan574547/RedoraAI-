import time
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status
from app.core.config import settings
from app.core.logging import logger

# In-memory sliding window store: { "key": [timestamp1, timestamp2, ...] }
_RATE_LIMIT_STORE: Dict[str, List[float]] = {}


def clean_old_timestamps(timestamps: List[float], window_seconds: float, now: float) -> List[float]:
    cutoff = now - window_seconds
    return [ts for ts in timestamps if ts > cutoff]


def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: float = 60.0,
    error_message: Optional[str] = None
) -> None:
    """
    Enforce in-memory sliding window rate limiting.
    Raises HTTPException 429 if the request limit is exceeded within window_seconds.
    """
    now = time.time()
    existing = _RATE_LIMIT_STORE.get(key, [])
    valid_timestamps = clean_old_timestamps(existing, window_seconds, now)

    if len(valid_timestamps) >= max_requests:
        retry_after = int(window_seconds - (now - valid_timestamps[0])) + 1
        msg = error_message or f"Rate limit exceeded. Maximum {max_requests} requests per {int(window_seconds)}s allowed."
        logger.warning(f"Rate limit exceeded for key='{key}'. Requests: {len(valid_timestamps)}/{max_requests}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg,
            headers={"Retry-After": str(max(1, retry_after))}
        )

    valid_timestamps.append(now)
    _RATE_LIMIT_STORE[key] = valid_timestamps


def get_client_ip(request: Request) -> str:
    """Extract client IP handling reverse proxy headers."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


async def limit_auth_endpoint(request: Request):
    """Rate limit authentication attempts (login / register) per client IP."""
    ip = get_client_ip(request)
    key = f"auth_ip:{ip}"
    check_rate_limit(
        key=key,
        max_requests=settings.RATE_LIMIT_AUTH_PER_MINUTE,
        window_seconds=60.0,
        error_message="Too many authentication attempts. Please wait a minute and try again."
    )


async def limit_ai_endpoint(request: Request):
    """Rate limit expensive AI generation endpoints per client IP."""
    ip = get_client_ip(request)
    key = f"ai_ip:{ip}"
    check_rate_limit(
        key=key,
        max_requests=settings.RATE_LIMIT_AI_PER_MINUTE,
        window_seconds=60.0,
        error_message="AI request rate limit reached. Please wait a moment before sending more requests."
    )
