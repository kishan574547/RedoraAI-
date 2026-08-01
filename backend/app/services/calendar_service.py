import urllib.parse
from datetime import datetime, timedelta
from typing import Optional

def generate_google_calendar_url(
    title: str,
    description: Optional[str] = None,
    due_date_str: Optional[str] = None,
    start_time_str: Optional[str] = "09:00",
    duration_minutes: int = 60
) -> str:
    """
    Generate a direct Google Calendar event creation URL (free Google Calendar API template link).
    """
    base_url = "https://calendar.google.com/calendar/render"
    
    # Parse or default due date
    if due_date_str:
        try:
            date_obj = datetime.strptime(due_date_str, "%Y-%m-%d")
        except ValueError:
            date_obj = datetime.now() + timedelta(days=1)
    else:
        date_obj = datetime.now() + timedelta(days=1)

    # Parse start time
    try:
        time_parts = start_time_str.split(":") if start_time_str else [9, 0]
        hour, minute = int(time_parts[0]), int(time_parts[1])
    except Exception:
        hour, minute = 9, 0

    start_dt = date_obj.replace(hour=hour, minute=minute, second=0)
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    # Format ISO string for Google Calendar API: YYYYMMDDTHHMMSSZ (UTC or local format)
    dates_param = f"{start_dt.strftime('%Y%m%dT%H%M00')}/{end_dt.strftime('%Y%m%dT%H%M00')}"

    params = {
        "action": "TEMPLATE",
        "text": title,
        "details": description or f"Task scheduled via Redora AI Personal Assistant.\nTitle: {title}",
        "dates": dates_param,
    }

    return f"{base_url}?{urllib.parse.urlencode(params)}"
