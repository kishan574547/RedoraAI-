import time
from typing import Optional, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.models.user import User
from app.core.deps import get_current_user
from app.services.code_runner import get_supported_runtimes, run_code
from app.core.logging import logger

router = APIRouter()

# Simple in-memory rate limiter per user_id: {user_id: [timestamps]}
USER_EXECUTION_TIMESTAMPS: Dict[int, List[float]] = {}
MAX_EXECUTIONS_PER_HOUR = 20
WINDOW_SECONDS = 3600.0


class CodeExecutionRequest(BaseModel):
    language: str
    version: Optional[str] = "*"
    code: str = Field(..., min_length=1)
    stdin: Optional[str] = ""


def check_user_rate_limit(user_id: int):
    """Enforce maximum 20 code executions per hour per user."""
    now = time.time()
    timestamps = USER_EXECUTION_TIMESTAMPS.get(user_id, [])
    # Filter out timestamps older than 1 hour
    recent = [ts for ts in timestamps if now - ts < WINDOW_SECONDS]
    
    if len(recent) >= MAX_EXECUTIONS_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {MAX_EXECUTIONS_PER_HOUR} code executions per hour allowed."
        )
    
    recent.append(now)
    USER_EXECUTION_TIMESTAMPS[user_id] = recent


@router.get("/runtimes")
async def api_get_runtimes():
    """Fetch list of supported programming languages and versions."""
    try:
        runtimes = await get_supported_runtimes()
        return {"runtimes": runtimes}
    except Exception as e:
        logger.error(f"Error fetching runtimes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch supported language runtimes.")


@router.post("/run")
async def api_run_code(
    req: CodeExecutionRequest
):
    """Execute code in sandbox without requiring user login context."""

    try:
        result = await run_code(
            language=req.language,
            version=req.version or "*",
            source_code=req.code,
            stdin=req.stdin or ""
        )
        return result
    except TimeoutError as te:
        raise HTTPException(status_code=408, detail=str(te))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Code execution error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Code execution failed: {str(e)}")
