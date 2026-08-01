from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ActivityLogBase(BaseModel):
    agent_name: str
    action_description: str
    related_task_id: Optional[int] = None
    related_goal_id: Optional[int] = None
    related_conversation_id: Optional[int] = None


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLogResponse(ActivityLogBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
