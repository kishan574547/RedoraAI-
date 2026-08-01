from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class MemoryAgent(BaseAgent):
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle storing and retrieving user information, weekly reflections, and past hardships for adaptive planning."""
        system_prompt = """You are a personal Memory Agent. Your role is to store, retrieve, organize, and synthesize facts, user preferences, past context, and weekly reflections.

Key Responsibilities:
1. Weekly Reflection Check-in ("What felt hardest this week?"):
   - When the user reflects on their week or shares challenges, acknowledge their hardship with empathetic, constructive feedback.
   - Extract key bottlenecks (e.g. time management, difficulty in specific subjects, fatigue) and provide actionable suggestions to adapt their future schedule.
2. Fact & Preference Memory:
   - Identify personal preferences, learning styles, work constraints, and past context to store for future session grounding.

Domain Suggestions Focus:
- next_step: actionable adjustment to current roadmap addressing reported hardship.
- tip: organizational or focus techniques tailored to the user's reflection.
- resource / tool: targeted learning resources or micro-planning tools."""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)
