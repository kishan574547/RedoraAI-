"""
Flashcard Generator — /tools/flashcards/*
- Deck CRUD (list, create, delete)
- Card CRUD within deck (list, add, delete)
- Auto-generate cards from notes/document via call_llm()
- SM-2 review endpoint (rate a card → update scheduling)
"""
import json
import re
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.flashcard import FlashcardDeck, Flashcard
from app.db.session import get_db
from app.core.deps import get_current_user
from app.agents.base_agent import call_llm
from app.core.logging import logger

router = APIRouter()
MAX_FILE_SIZE_MB = 20


# ── SM-2 algorithm ─────────────────────────────────────────────────────────────

def sm2_update(card: Flashcard, quality: int) -> Flashcard:
    """
    Apply SM-2 algorithm to update a card's ease_factor, interval, and next_review_at.
    quality: 0=Again, 1=Hard, 2=Good, 3=Easy  (mapped from frontend buttons)
    """
    # Map 0-3 quality to SM-2 0-5 scale
    q_map = {0: 0, 1: 2, 2: 4, 3: 5}
    q = q_map.get(quality, 4)

    if q < 3:
        # Failed — reset repetitions, interval stays at 1 day
        card.repetitions = 0
        card.interval_days = 1
    else:
        if card.repetitions == 0:
            card.interval_days = 1
        elif card.repetitions == 1:
            card.interval_days = 6
        else:
            card.interval_days = round(card.interval_days * card.ease_factor)
        card.repetitions += 1

    # Update ease factor: EF = EF + (0.1 − (5−q) × (0.08 + (5−q) × 0.02))
    ef = card.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    card.ease_factor = max(1.3, round(ef, 2))
    card.next_review_at = date.today() + timedelta(days=card.interval_days)
    return card


# ── LLM flashcard generation ───────────────────────────────────────────────────

FLASHCARD_SYSTEM_PROMPT = """
You are an expert educator creating flashcards for spaced repetition study.
Given a piece of study material, extract the most important concepts and create clear, concise Q&A flashcards.

Rules:
- Each flashcard: one focused concept per card (atomic).
- Front: a clear question or incomplete statement.
- Back: a concise, accurate answer (1-3 sentences max).
- Generate between 5 and 20 cards depending on material length.
- Output ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "cards": [
    {"front": "Question or cue", "back": "Answer or completion"},
    ...
  ]
}
""".strip()


async def _generate_cards_from_text(notes: str) -> List[dict]:
    """Use LLM to extract Q&A flashcard pairs from notes text."""
    messages = [
        {"role": "user", "content": f"Please create flashcards from these notes:\n\n{notes[:5000]}"}
    ]
    raw = await call_llm(messages=messages, system_prompt=FLASHCARD_SYSTEM_PROMPT, append_common_prompt=False)

    # Extract JSON
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
        cards = data.get("cards", [])
        return [c for c in cards if c.get("front") and c.get("back")]
    except Exception:
        logger.warning("Failed to parse flashcard JSON from LLM")
        return []


def _extract_text(content: bytes, filename: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf") or content[:4] == b"%PDF":
        try:
            import pypdf, io
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            raise ValueError("Unable to read the PDF file.")
    if name.endswith(".docx") or content[:2] == b"PK":
        try:
            import docx, io
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            raise ValueError("Unable to read the Word file.")
    # Treat as plain text
    try:
        return content.decode("utf-8", errors="replace")
    except Exception:
        raise ValueError("Unable to read the file.")


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class DeckCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)


class CardCreate(BaseModel):
    front_text: str = Field(..., min_length=1)
    back_text: str = Field(..., min_length=1)


class ReviewRequest(BaseModel):
    quality: int = Field(..., ge=0, le=3, description="0=Again,1=Hard,2=Good,3=Easy")


# ── Deck endpoints ─────────────────────────────────────────────────────────────

@router.get("/decks")
async def list_decks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all flashcard decks for the current user."""
    decks = db.query(FlashcardDeck).filter(FlashcardDeck.user_id == current_user.id).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "card_count": len(d.cards),
            "due_count": sum(1 for c in d.cards if c.next_review_at <= date.today()),
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in decks
    ]


@router.post("/decks")
async def create_deck(
    req: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new empty flashcard deck."""
    deck = FlashcardDeck(user_id=current_user.id, title=req.title.strip(), description=req.description)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return {"id": deck.id, "title": deck.title, "description": deck.description, "card_count": 0, "due_count": 0}


@router.delete("/decks/{deck_id}")
async def delete_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a deck and all its cards."""
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    db.delete(deck)
    db.commit()
    return {"detail": "Deck deleted."}


# ── Card endpoints ─────────────────────────────────────────────────────────────

@router.get("/decks/{deck_id}/cards")
async def list_cards(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all cards in a deck."""
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    return [
        {
            "id": c.id,
            "front_text": c.front_text,
            "back_text": c.back_text,
            "ease_factor": c.ease_factor,
            "interval_days": c.interval_days,
            "repetitions": c.repetitions,
            "next_review_at": c.next_review_at.isoformat() if c.next_review_at else None,
            "is_due": c.next_review_at <= date.today() if c.next_review_at else True
        }
        for c in deck.cards
    ]


@router.post("/decks/{deck_id}/cards")
async def add_card(
    deck_id: int,
    req: CardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a single card to a deck."""
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")

    card = Flashcard(
        deck_id=deck_id,
        user_id=current_user.id,
        front_text=req.front_text.strip(),
        back_text=req.back_text.strip(),
        next_review_at=date.today()
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return {"id": card.id, "front_text": card.front_text, "back_text": card.back_text}


@router.delete("/decks/{deck_id}/cards/{card_id}")
async def delete_card(
    deck_id: int,
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single card from a deck."""
    card = db.query(Flashcard).filter(
        Flashcard.id == card_id,
        Flashcard.deck_id == deck_id,
        Flashcard.user_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found.")
    db.delete(card)
    db.commit()
    return {"detail": "Card deleted."}


@router.post("/decks/{deck_id}/cards/{card_id}/review")
async def review_card(
    deck_id: int,
    card_id: int,
    req: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply SM-2 rating to a card and update next review date."""
    card = db.query(Flashcard).filter(
        Flashcard.id == card_id,
        Flashcard.deck_id == deck_id,
        Flashcard.user_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found.")

    card = sm2_update(card, req.quality)
    db.commit()
    db.refresh(card)
    return {
        "id": card.id,
        "ease_factor": card.ease_factor,
        "interval_days": card.interval_days,
        "repetitions": card.repetitions,
        "next_review_at": card.next_review_at.isoformat()
    }


# ── AI Generation ──────────────────────────────────────────────────────────────

@router.post("/decks/{deck_id}/generate")
async def generate_cards(
    deck_id: int,
    notes_text: str = Form(default=""),
    notes_file: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Auto-generate flashcards from pasted notes or an uploaded document via LLM."""
    deck = db.query(FlashcardDeck).filter(
        FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id
    ).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")

    try:
        final_text = notes_text.strip()
        if notes_file and notes_file.filename:
            content = await notes_file.read()
            if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File exceeds 20MB limit.")
            final_text = _extract_text(content, notes_file.filename)

        if not final_text:
            raise HTTPException(status_code=400, detail="Please provide notes text or upload a file.")

        card_pairs = await _generate_cards_from_text(final_text)
        if not card_pairs:
            raise HTTPException(status_code=500, detail="AI could not extract flashcards from the provided material.")

        created = []
        for pair in card_pairs:
            card = Flashcard(
                deck_id=deck_id,
                user_id=current_user.id,
                front_text=pair["front"].strip(),
                back_text=pair["back"].strip(),
                next_review_at=date.today()
            )
            db.add(card)
            created.append({"front_text": pair["front"], "back_text": pair["back"]})

        db.commit()
        return {"generated_count": len(created), "cards": created}

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error generating flashcards")
        raise HTTPException(status_code=500, detail="Failed to generate flashcards. Please try again.")
