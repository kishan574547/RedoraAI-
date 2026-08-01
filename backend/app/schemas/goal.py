from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.db.models.goal import GoalStatus


class ResourceLinkResponse(BaseModel):
    id: int
    goal_id: int
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PracticeQuestionResponse(BaseModel):
    id: int
    goal_id: int
    question: str
    answer: str
    created_at: datetime

    class Config:
        from_attributes = True


class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: GoalStatus = GoalStatus.NOT_STARTED
    target_date: Optional[datetime] = None
    created_by_agent: Optional[str] = None
    conversation_id: Optional[int] = None
    is_template: Optional[str] = "false"


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[GoalStatus] = None
    target_date: Optional[datetime] = None
    created_by_agent: Optional[str] = None
    conversation_id: Optional[int] = None
    is_template: Optional[str] = None


class GoalResponse(GoalBase):
    id: int
    user_id: int
    created_at: datetime
    is_template: Optional[str] = "false"
    resources: Optional[List[ResourceLinkResponse]] = []
    practice_questions: Optional[List[PracticeQuestionResponse]] = []


    class Config:
        from_attributes = True

