from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class SpeakingPracticeSession(Base):
    __tablename__ = "speaking_practice_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=False, default="Free Talk")
    transcript = Column(JSON, nullable=True)
    duration = Column(Integer, default=0)
    language = Column(String, default="en-US")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", backref="speaking_practice_sessions")
