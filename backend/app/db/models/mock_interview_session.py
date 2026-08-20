from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from datetime import datetime
from sqlalchemy.orm import relationship
from app.db.base import Base


class MockInterviewSession(Base):
    __tablename__ = "mock_interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_description = Column(Text, nullable=False)
    persona_name = Column(String, nullable=False)
    persona_role = Column(String, nullable=False)
    persona_trait = Column(String, nullable=False)
    difficulty_level = Column(String, default="Mid-Level", nullable=False)
    interview_type = Column(String, default="Full Interview (Mixed)", nullable=False)
    questions_and_answers = Column(JSON, nullable=False, default=list)
    status = Column(String, default="active", nullable=False)  # "active" or "completed"
    summary_feedback = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="mock_interview_sessions")
