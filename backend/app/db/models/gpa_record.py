from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class GpaRecord(Base):
    __tablename__ = "gpa_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    semester_label = Column(String, nullable=False)
    subjects = Column(JSON, nullable=False)  # List of {name: str, credits: float, grade_point: float}
    calculated_gpa = Column(Float, nullable=False)
    total_credits = Column(Float, nullable=False, default=0.0)
    scale = Column(Float, nullable=False, default=10.0)  # 10.0 or 4.0 scale
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    user = relationship("User", backref="gpa_records")
