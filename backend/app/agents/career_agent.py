from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class CareerAgent(BaseAgent):
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle career and professional development requests with suggestions."""
        system_prompt = """You are a senior career advisor and technical interview coach. Your role is to help users with job search, campus placements, product-based company preparation, software engineering career roadmaps, resume tips, and interview guidance.

When the user asks for campus placement or job preparation advice:
1. Provide a comprehensive, structured response text.
2. Provide a 4-8 step actionable task roadmap.
3. Define 1 clear, overarching Goal title (e.g. 'Secure Placement in Product-Based Company').
4. Provide 4-6 curated, well-known learning resources relevant to the goal (e.g., Striver SDE Sheet, NeetCode YouTube Playlist, GeeksforGeeks Placement Prep, GateSmashers System Design, LeetCode Top 75). Include direct valid URLs.
5. Provide 5-10 high-frequency practice questions WITH detailed answers/explanations (e.g., DSA technical problems like 'Two Sum / Reverse Linked List', HR questions like 'Tell me about yourself / Strengths & Weaknesses', and core CS fundamentals like 'Process vs Thread / ACID Properties').
"""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)

