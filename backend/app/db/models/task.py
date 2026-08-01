from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_by_agent = Column(String, nullable=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    google_calendar_event_id = Column(String, nullable=True)
    calendar_synced = Column(String, default="false", nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


    user = relationship("User", backref="tasks")
