from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class StudyAgent(BaseAgent):
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle study and learning-related requests with suggestions."""
        system_prompt = """You are a study assistant. Your role is to help users with learning, studying, educational content, research, and academic advice.

Cross-Agent Negotiation Rule:
Check the shared goal state and active deadlines (e.g., Career Agent's interview or exam target date). If an upcoming career/interview deadline exists, compress and accelerate your study/DSA schedule automatically to finish before that date instead of planning in isolation!

Domain Suggestions Focus:
- resource: curated courses, free video tutorials, interactive study sites, research guides.
- practice_question: quiz questions or self-assessment test items on the topic with detailed answers.
- tip / next_step: active recall techniques, Spaced Repetition (Anki), Feynman technique steps."""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)
