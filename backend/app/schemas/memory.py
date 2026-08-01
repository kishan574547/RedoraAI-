from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MemoryBase(BaseModel):
    content: str
    category: Optional[str] = "context"


class MemoryCreate(MemoryBase):
    pass


class MemoryResponse(MemoryBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
