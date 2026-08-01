from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class HabitBase(BaseModel):
    name: str
    frequency: Optional[str] = "daily"
    streak_count: Optional[int] = 0
    last_completed_at: Optional[datetime] = None


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    streak_count: Optional[int] = None
    last_completed_at: Optional[datetime] = None


class HabitResponse(HabitBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
