"""
LinkedIn Profile Optimizer — POST /tools/linkedin/optimize
Accepts LinkedIn About text / headline / summary + target role,
returns improved versions with reasoning via call_llm().
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.models.user import User
from app.core.deps import get_current_user
from app.agents.base_agent import call_llm
from app.core.logging import logger

router = APIRouter()


LINKEDIN_SYSTEM_PROMPT = """
You are a professional LinkedIn profile coach and personal branding expert.
Your task is to rewrite and optimize LinkedIn profile sections to maximize visibility,
recruiter appeal, and keyword relevance for the target role.

Output your response as JSON with this exact structure:
{
  "optimized_headline": "...",
  "optimized_about": "...",
  "optimized_summary": "...",
  "key_improvements": ["improvement 1", "improvement 2", ...],
  "keywords_added": ["keyword 1", "keyword 2", ...],
  "reasoning": "Brief explanation of the strategy used"
}

Rules:
- Headline: max 220 characters, keyword-rich, includes target role.
- About: 3-5 paragraphs, starts with a hook, uses first-person voice, ends with CTA.
- Summary: 2-3 sentences suitable for the "Summary" card, concise and impactful.
- Always preserve authentic voice while improving clarity and impact.
- Focus on the target role's industry keywords.
""".strip()


class LinkedInOptimizeRequest(BaseModel):
    current_headline: str = Field(default="", description="Current LinkedIn headline")
    current_about: str = Field(default="", description="Current LinkedIn About section")
    target_role: str = Field(..., min_length=2, max_length=200, description="Target job role or title")
    industry: str = Field(default="", description="Industry or domain (optional)")


@router.post("/optimize")
async def api_optimize_linkedin(
    req: LinkedInOptimizeRequest,
    current_user: User = Depends(get_current_user)
):
    """Optimize LinkedIn profile sections for a specific target role."""
    try:
        if not req.current_headline.strip() and not req.current_about.strip():
            raise HTTPException(
                status_code=400,
                detail="Please provide at least your current headline or About section."
            )

        user_content = f"TARGET ROLE: {req.target_role.strip()}\n"
        if req.industry.strip():
            user_content += f"INDUSTRY: {req.industry.strip()}\n"
        if req.current_headline.strip():
            user_content += f"\nCURRENT HEADLINE:\n{req.current_headline.strip()[:500]}\n"
        if req.current_about.strip():
            user_content += f"\nCURRENT ABOUT SECTION:\n{req.current_about.strip()[:3000]}\n"

        messages = [{"role": "user", "content": user_content + "\nPlease optimize my LinkedIn profile sections."}]

        raw = await call_llm(
            messages=messages,
            system_prompt=LINKEDIN_SYSTEM_PROMPT,
            append_common_prompt=False
        )

        # Parse JSON response
        import json, re
        cleaned = raw.strip()
        # Extract JSON block if wrapped in markdown
        m = re.search(r"```(?:json)?\s*(\{[\s\S]+\})\s*```", cleaned)
        if m:
            cleaned = m.group(1)
        else:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end+1]

        try:
            data = json.loads(cleaned)
        except Exception:
            # Fallback: return raw text in a structured wrapper
            data = {
                "optimized_headline": "",
                "optimized_about": raw.strip(),
                "optimized_summary": "",
                "key_improvements": [],
                "keywords_added": [],
                "reasoning": "Response returned as plain text."
            }

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error optimizing LinkedIn profile")
        raise HTTPException(status_code=500, detail="Failed to optimize LinkedIn profile. Please try again.")
