import os
import httpx
from typing import Dict, Any
from app.config import settings
from app.core.logging import logger

EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send"


async def send_otp_via_emailjs(to_email: str, otp_code: str) -> Dict[str, Any]:
    """
    Send OTP email securely from Python backend using EmailJS REST API.
    """
    service_id = settings.EMAILJS_SERVICE_ID or os.getenv("EMAILJS_SERVICE_ID")
    template_id = settings.EMAILJS_TEMPLATE_ID or os.getenv("EMAILJS_TEMPLATE_ID")
    public_key = settings.EMAILJS_PUBLIC_KEY or os.getenv("EMAILJS_PUBLIC_KEY")
    private_key = settings.EMAILJS_PRIVATE_KEY or os.getenv("EMAILJS_PRIVATE_KEY")

    if not service_id or not template_id or not public_key:
        logger.info(f"EmailJS keys not fully configured. Simulated OTP {otp_code} to {to_email}")
        return {
            "sent": True,
            "simulated": True,
            "message": f"Simulated OTP {otp_code} to {to_email}"
        }

    payload = {
        "service_id": service_id.strip(),
        "template_id": template_id.strip(),
        "user_id": public_key.strip(),
        "template_params": {
            "to_email": to_email.strip(),
            "otp_code": otp_code.strip()
        }
    }

    if private_key:
        payload["accessToken"] = private_key.strip()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(EMAILJS_API_URL, json=payload)
            if resp.status_code == 200:
                logger.info(f"EmailJS OTP successfully sent to {to_email}")
                return {"sent": True, "provider": "emailjs"}
            else:
                logger.warn(f"EmailJS API returned HTTP {resp.status_code}: {resp.text}")
                return {"sent": False, "error": resp.text}
    except Exception as e:
        logger.error(f"Failed to send email via EmailJS API: {str(e)}")
        return {"sent": False, "error": str(e)}
