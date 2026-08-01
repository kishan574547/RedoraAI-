from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from sqlalchemy.orm import relationship
from app.db.base import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    action_description = Column(Text, nullable=False)
    related_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    related_goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    related_conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", backref="activity_logs")
    task = relationship("Task", foreign_keys=[related_task_id])
    goal = relationship("Goal", foreign_keys=[related_goal_id])
    conversation = relationship("Conversation", foreign_keys=[related_conversation_id])
