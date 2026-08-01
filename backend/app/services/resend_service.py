import os
import httpx
from typing import Dict, Any
from app.config import settings
from app.core.logging import logger

RESEND_API_URL = "https://api.resend.com/emails"


async def send_otp_via_resend(email: str, otp_code: str = "123456") -> Dict[str, Any]:
    """
    Send fallback OTP email directly via Resend API.
    If RESEND_API_KEY is configured in environment, sends real email to inbox.
    """
    resend_key = settings.RESEND_API_KEY or os.getenv("RESEND_API_KEY")

    if not resend_key:
        logger.info(f"RESEND_API_KEY not configured. Simulated sending OTP {otp_code} to {email}")
        return {
            "sent": True,
            "simulated": True,
            "message": f"Simulated OTP {otp_code} sent to {email}"
        }

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 460px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; }}
        .title {{ color: #f8fafc; font-size: 22px; font-weight: 700; margin-bottom: 8px; }}
        .sub {{ color: #94a3b8; font-size: 14px; margin-bottom: 24px; }}
        .otp-box {{ background: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 16px; margin: 16px 0; }}
        .code {{ font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #818cf8; margin: 0; }}
        .footer {{ color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <h2 class="title">Verify Your Redora AI Email</h2>
        <p class="sub">Your 6-digit email verification code is below:</p>
        <div class="otp-box">
          <h1 class="code">{otp_code}</h1>
        </div>
        <p class="sub" style="font-size: 12px;">This code expires in 10 minutes. Enter this code on the verification screen to proceed.</p>
        <div class="footer">&copy; Redora AI. All rights reserved.</div>
      </div>
    </body>
    </html>
    """

    payload = {
        "from": "Redora AI Verification <onboarding@resend.dev>",
        "to": [email.strip()],
        "subject": f"Your Verification Code: {otp_code}",
        "html": html_content
    }

    headers = {
        "Authorization": f"Bearer {resend_key.strip()}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                logger.info(f"Resend OTP email successfully sent to {email}")
                return {"sent": True, "resend_id": resp.json().get("id")}
            else:
                logger.warn(f"Resend email API returned status {resp.status_code}: {resp.text}")
                return {"sent": False, "error": resp.text}
    except Exception as e:
        logger.error(f"Failed to send email via Resend API: {str(e)}")
        return {"sent": False, "error": str(e)}
