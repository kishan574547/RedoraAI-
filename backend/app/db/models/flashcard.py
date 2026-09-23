from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class FlashcardDeck(Base):
    """A named collection of flashcards owned by a user."""
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", backref="flashcard_decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")


class Flashcard(Base):
    """
    Individual flashcard with SM-2 spaced repetition metadata.

    SM-2 fields:
    - ease_factor  : starts at 2.5, adjusted per rating
    - interval_days: days until next review (starts at 1)
    - repetitions  : number of successful consecutive reviews
    - next_review_at: the date this card should next be shown
    """
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    front_text = Column(Text, nullable=False)
    back_text = Column(Text, nullable=False)

    # SM-2 spaced repetition state
    ease_factor = Column(Float, default=2.5, nullable=False)
    interval_days = Column(Integer, default=1, nullable=False)
    repetitions = Column(Integer, default=0, nullable=False)
    next_review_at = Column(Date, default=date.today, nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    deck = relationship("FlashcardDeck", back_populates="cards")
    user = relationship("User", backref="flashcards")
