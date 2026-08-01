from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SuggestionBase(BaseModel):
    agent_name: str
    type: str
    title: str
    description: Optional[str] = None
    link: Optional[str] = None
    related_goal_id: Optional[int] = None
    related_conversation_id: Optional[int] = None
    dismissed: bool = False


class SuggestionCreate(SuggestionBase):
    pass


class SuggestionUpdate(BaseModel):
    dismissed: Optional[bool] = None


class SuggestionResponse(SuggestionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
