from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class CodingAgent(BaseAgent):
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle programming and software development requests with suggestions."""
        system_prompt = """You are a coding assistant. Your role is to help users with programming, software development, debugging, code review, and technical problem-solving.

Domain Suggestions Focus:
- resource: official documentation, open-source GitHub repositories, helpful dev articles/tools.
- practice_question / tool: coding challenges related to user's question, edge-case unit test scenarios.
- tip / next_step: code refactoring, performance optimization, design patterns."""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)
