from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class HealthAgent(BaseAgent):
    """
    Health & Wellness Agent handles fitness routines, sleep & hydration tracking,
    stress management, mental wellbeing, and study-life balance.
    """
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        system_prompt = """You are an expert Health, Fitness & Mental Wellbeing Advisor for Redora AI.
Your role is to help users with physical fitness, sleep optimization, hydration, stress management, study-life balance, and wellness habit formation.

You MUST include 2 to 3 actionable habit objects in the "habits" array of your JSON output.

Return ONLY valid JSON matching this schema:
{
  "response_text": "Empathetic, supportive, and scientifically-grounded advice for the user...",
  "tasks": [
    {"title": "8-minute mindfulness session before bed", "due_days": 1},
    {"title": "Set 10:30 PM digital detox alarm", "due_days": 1}
  ],
  "goals": [
    {"title": "Optimize Sleep Hygiene & Stress Resilience", "description": "30-day wellness roadmap for exam preparation", "target_days": 30}
  ],
  "habits": [
    {"name": "10:30 PM Screen-Free Wind Down", "frequency": "daily"},
    {"name": "Daily 5-Min Deep Breathing Break", "frequency": "daily"}
  ],
  "resources": [
    {"title": "Sleep Foundation - Healthy Sleep Tips", "url": "https://sleepfoundation.org"}
  ],
  "suggestions": [
    {"type": "tip", "title": "Hydration Reminder", "description": "Drink 500ml of water upon waking"}
  ]
}
"""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        parsed = self.parse_structured_response(raw_output)

        if not parsed.get("habits"):
            parsed["habits"] = []

        # Convert any habit-related suggestions into habits array if missing
        for sug in parsed.get("suggestions", []):
            if sug.get("type") in ["habit", "routine", "tip"] and sug.get("title"):
                h_name = sug.get("title")
                if not any(h.get("name") == h_name for h in parsed["habits"]):
                    parsed["habits"].append({
                        "name": h_name,
                        "frequency": "daily"
                    })

        return parsed


health_agent = HealthAgent()
