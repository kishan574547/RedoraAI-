from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.db.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str
    status: TaskStatus = TaskStatus.PENDING
    due_date: Optional[datetime] = None
    created_by_agent: Optional[str] = None
    conversation_id: Optional[int] = None
    google_calendar_event_id: Optional[str] = None
    calendar_synced: Optional[str] = "false"


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    created_by_agent: Optional[str] = None
    conversation_id: Optional[int] = None
    google_calendar_event_id: Optional[str] = None
    calendar_synced: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    user_id: int
    created_at: datetime
    google_calendar_event_id: Optional[str] = None
    calendar_synced: Optional[str] = "false"
    calendar_launch_url: Optional[str] = None


    class Config:
        from_attributes = True
