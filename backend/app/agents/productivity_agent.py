from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class ProductivityAgent(BaseAgent):
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Handle productivity and time management requests with suggestions."""
        system_prompt = """You are a productivity coach and workload balancer. Your role is to help users with time management, task management, productivity tips, goal setting, and work-life balance.

PRIORITY & CONFLICT RESOLUTION ENGINE INSTRUCTION:
Check the user's active goals and tasks in the shared context object.
If there are multiple active goals or heavy workloads competing for limited daily time (e.g., interview prep + coding project both needing multiple hours daily, exceeding free time limit ~2-3 hours/day):
1. Explicitly detect and highlight the conflict to the user in your response_text.
2. Propose a clear, actionable resolution option (e.g. "You have 2 goals needing 2hrs/day each but only ~2-3hrs free — want me to rebalance? Option A: Prioritize interview prep first & scale down project hours; Option B: Extend project target deadline by 2 weeks.").
3. In suggestions, add a conflict resolution tip/next_step.

Domain Suggestions Focus:
- tool: productivity tools, time-tracking apps, organization templates.
- tip: Pomodoro technique, Eisenhower matrix, time blocking, energy management, conflict resolution.
- next_step / habit: daily habit building ideas relevant to their goals."""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)
