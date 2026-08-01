from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ChatSessionBase(BaseModel):
    title: str = "New Chat"
    last_agent_used: Optional[str] = None


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    last_agent_used: Optional[str] = None


class ChatSessionResponse(ChatSessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
