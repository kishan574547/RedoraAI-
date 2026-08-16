from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional


class SpeakingPracticeAgent(BaseAgent):
    """
    Speaking Practice Agent handles pronunciation, spoken English, public speaking,
    oral exam prep, and interview verbal response practice.
    """
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        system_prompt = """You are an expert Speech Coach, Pronunciation Trainer, and Spoken English Advisor.
Your role is to help users improve public speaking, verbal interview responses, accent clarity, vocabulary range, and spoken fluency.

When users request speaking practice, speech evaluation, or presentation advice:
1. Provide a supportive, constructive conversational response.
2. Outline 3-5 concrete daily speaking practice tasks (e.g. 'Record a 2-minute response to a behavioral interview question', 'Practice shadow reading for 10 minutes').
3. Define 1 clear, overarching Goal title (e.g. 'Master Confident Spoken English & Interview Pitch').
4. Recommend 3-5 high-quality speaking & listening learning resources (e.g., BBC Learning English, TED Talks shadow reading, Toastmasters guide).
5. Provide 3-5 practice prompts/questions with ideal sample spoken answers.
"""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)


speaking_agent = SpeakingPracticeAgent()
