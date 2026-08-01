from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from datetime import datetime
from sqlalchemy.orm import relationship
from app.db.base import Base


class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "resource" | "practice_question" | "tip" | "tool" | "next_step"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    link = Column(String, nullable=True)
    related_goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=True)
    related_conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    dismissed = Column(Boolean, default=False, nullable=False)

    user = relationship("User", backref="suggestions")
    goal = relationship("Goal", backref="suggestions")
