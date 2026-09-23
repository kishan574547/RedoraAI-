"""
YouTube Video Summarizer — POST /tools/youtube/summarize
Fetches transcript via youtube-transcript-api (no API key required),
then summarizes it with call_llm() into key points and a concise overview.
"""
import json
import re
from urllib.parse import urlparse, parse_qs
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.models.user import User
from app.core.deps import get_current_user
from app.agents.base_agent import call_llm
from app.core.logging import logger

router = APIRouter()


YOUTUBE_SYSTEM_PROMPT = """
You are an expert content summarizer. Your task is to summarize a YouTube video transcript.

Produce a well-structured summary with:
1. A 2-3 sentence overall summary of what the video covers.
2. 5-10 key points / takeaways as concise bullet points.
3. If timestamps are available in the transcript, note which key point corresponds to which rough timestamp.

Output ONLY valid JSON (no markdown, no extra text):
{
  "title_guess": "Inferred video title or topic",
  "overall_summary": "2-3 sentence overview...",
  "key_points": [
    {"timestamp": "0:00", "point": "Key takeaway..."},
    ...
  ],
  "estimated_read_time": "X min read"
}
""".strip()


def extract_youtube_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats including /live/, /shorts/, /embed/, youtu.be, and /watch."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    
    if "youtu.be" in hostname:
        return parsed.path.lstrip("/").split("/")[0] or None
    
    if "youtube.com" in hostname:
        if parsed.path == "/watch":
            query = parse_qs(parsed.query)
            return query.get("v", [None])[0]
        
        for prefix in ["/live/", "/shorts/", "/embed/"]:
            if parsed.path.startswith(prefix):
                return parsed.path[len(prefix):].split("/")[0] or None
    
    return None


def _fetch_transcript(video_id: str) -> str:
    """
    Fetch transcript text using youtube-transcript-api if available,
    or via YouTube caption tracks.
    """
    # 1. Try youtube-transcript-api if installed
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-US", "en-GB"])
        except Exception:
            ts_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript_obj = ts_list_obj.find_transcript(["en"]) if any(
                t.language_code.startswith("en") for t in ts_list_obj
            ) else next(iter(ts_list_obj))
            transcript_list = transcript_obj.fetch()

        if transcript_list:
            parts = []
            last_ts_mark = -60
            for entry in transcript_list:
                start = entry.get("start", 0)
                text = entry.get("text", "").replace("\n", " ").strip()
                if not text:
                    continue
                if start - last_ts_mark >= 60:
                    mins = int(start // 60)
                    secs = int(start % 60)
                    parts.append(f"\n[{mins}:{secs:02d}]")
                    last_ts_mark = start
                parts.append(text)
            return " ".join(parts).strip()
    except ImportError:
        pass
    except Exception as e:
        err_str = str(e).lower()
        if "disabled" in err_str or "no transcript" in err_str:
            raise ValueError(
                "This video has no available transcript. "
                "Transcripts may be disabled by the uploader, unavailable for live streams, or not yet generated."
            )

    # 2. Fallback: fetch captionTracks from YouTube web response
    try:
        import urllib.request
        import xml.etree.ElementTree as ET
        url = f"https://www.youtube.com/watch?v={video_id}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8")

        m = re.search(r'"captionTracks":(\[.*?\])', html)
        if not m:
            raise ValueError(
                "This video has no available transcript. "
                "Transcripts may be disabled by the uploader, unavailable for live streams, or not yet generated."
            )

        tracks = json.loads(m.group(1))
        if not tracks:
            raise ValueError("No transcript tracks found for this video.")

        track = None
        for t in tracks:
            if t.get("languageCode", "").startswith("en"):
                track = t
                break
        if not track:
            track = tracks[0]

        base_url = track.get("baseUrl")
        if not base_url:
            raise ValueError("Transcript URL not found in caption track.")

        creq = urllib.request.Request(base_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(creq, timeout=10) as cresp:
            xml_content = cresp.read().decode("utf-8")

        if not xml_content.strip():
            raise ValueError(
                "This video has no available transcript. "
                "Transcripts may be disabled by the uploader, unavailable for live streams, or not yet generated."
            )

        root = ET.fromstring(xml_content)
        parts = []
        last_ts = -60
        for elem in root.findall(".//text"):
            start = float(elem.get("start", 0))
            text = (elem.text or "").replace("\n", " ").strip()
            if not text:
                continue
            if start - last_ts >= 60:
                mins = int(start // 60)
                secs = int(start % 60)
                parts.append(f"\n[{mins}:{secs:02d}]")
                last_ts = start
            parts.append(text)

        result = " ".join(parts).strip()
        if not result:
            raise ValueError(
                "This video has no available transcript. "
                "Transcripts may be disabled by the uploader, unavailable for live streams, or not yet generated."
            )
        return result
    except ValueError:
        raise
    except Exception:
        raise ValueError(
            "This video has no available transcript. "
            "Transcripts may be disabled by the uploader, unavailable for live streams, or not yet generated."
        )


class SummarizeRequest(BaseModel):
    url: str = Field(..., min_length=5, description="YouTube video URL")


@router.post("/summarize")
async def api_summarize_youtube(
    req: SummarizeRequest,
    current_user: User = Depends(get_current_user)
):
    """Fetch YouTube transcript and generate a structured summary via LLM."""
    video_id = extract_youtube_video_id(req.url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Could not extract a valid YouTube video ID from the URL."
        )

    try:
        transcript_text = _fetch_transcript(video_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error fetching YouTube transcript")
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcript: {str(e)}")

    try:
        # Truncate to ~12,000 chars to stay within token limits
        truncated = transcript_text[:12000]
        if len(transcript_text) > 12000:
            truncated += "\n[... transcript truncated for length ...]"

        messages = [
            {
                "role": "user",
                "content": (
                    f"YouTube Video URL: {req.url}\n"
                    f"Video ID: {video_id}\n\n"
                    f"TRANSCRIPT:\n{truncated}\n\n"
                    "Please summarize this video."
                )
            }
        ]

        raw = await call_llm(
            messages=messages,
            system_prompt=YOUTUBE_SYSTEM_PROMPT,
            append_common_prompt=False
        )

        # Parse JSON
        cleaned = raw.strip()
        m = re.search(r"```(?:json)?\s*(\{[\s\S]+\})\s*```", cleaned)
        if m:
            cleaned = m.group(1)
        else:
            s, e = cleaned.find("{"), cleaned.rfind("}")
            if s != -1 and e != -1:
                cleaned = cleaned[s:e+1]

        try:
            data = json.loads(cleaned)
        except Exception:
            # Fallback: return raw text
            data = {
                "title_guess": f"YouTube Video ({video_id})",
                "overall_summary": raw.strip(),
                "key_points": [],
                "estimated_read_time": "—"
            }

        data["video_id"] = video_id
        data["video_url"] = f"https://www.youtube.com/watch?v={video_id}"
        data["transcript_length"] = len(transcript_text)

        return data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error summarizing YouTube video")
        raise HTTPException(status_code=500, detail=f"Failed to summarize video: {str(e)}")
