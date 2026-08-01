from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class GoalStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(GoalStatus), default=GoalStatus.NOT_STARTED, nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=True)
    created_by_agent = Column(String, nullable=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    is_template = Column(String, default="false", nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


    user = relationship("User", backref="goals")
    resources = relationship("ResourceLink", back_populates="goal", cascade="all, delete-orphan")
    practice_questions = relationship("PracticeQuestion", back_populates="goal", cascade="all, delete-orphan")
