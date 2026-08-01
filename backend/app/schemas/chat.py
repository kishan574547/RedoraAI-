from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    session_id: Optional[int] = None
    attachment_name: Optional[str] = None
    attachment_content: Optional[str] = None



class ChatResponse(BaseModel):
    response: str
    agent_used: str
    intent: str
    tasks_created: Optional[List[Dict[str, Any]]] = []
    goals_created: Optional[List[Dict[str, Any]]] = []
    suggestions_created: Optional[List[Dict[str, Any]]] = []
    is_multi_agent: Optional[bool] = False
    agent_chain: Optional[List[str]] = []

