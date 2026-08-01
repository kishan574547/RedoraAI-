import json
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from app.services.openrouter_client import OpenRouterClient
from app.core.logging import logger

COMMON_SUGGESTION_PROMPT = """
GENERAL AGENT INSTRUCTION:
When answering user requests (especially goal/study/career/coding roadmaps), generate:
1. "tasks": actionable roadmap steps.
2. "goals": goal title and summary.
3. "resources": 4 to 6 curated, well-known learning resources relevant to the goal (e.g. YouTube channels/playlists for DSA/System Design, LeetCode, GeeksforGeeks, Striver Sheet, free courses/documentation). Each resource must have "title", "description", and "url".
4. "practice_questions": 5 to 10 relevant practice questions WITH answers/explanations directly tied to the goal (e.g. DSA problems, HR questions, aptitude questions). Each must have "question" and "answer".
5. "suggestions": 1 to 3 proactive tips or next steps.

Output your final answer as structured JSON matching this exact format:
```json
{
  "response_text": "Detailed Markdown answer...",
  "tasks": [
    {"title": "Task title", "due_days": 1}
  ],
  "goals": [
    {"title": "Goal title", "description": "Goal summary", "target_days": 30}
  ],
  "resources": [
    {
      "title": "Resource Name / Channel",
      "description": "Short description of what to learn here",
      "url": "https://..."
    }
  ],
  "practice_questions": [
    {
      "question": "Clear problem statement or question...",
      "answer": "Detailed solution or answer explanation..."
    }
  ],
  "suggestions": [
    {
      "type": "resource" | "practice_question" | "tip" | "tool" | "next_step",
      "title": "Short title",
      "description": "Clear description / explanation",
      "link": "https://... (optional)"
    }
  ]
}
```
If returning JSON, ensure response_text contains the full conversational content.
"""


def extract_clean_response_text(raw_output: str) -> str:
    """Extract clean response text from raw LLM output even if JSON parsing fails."""
    if not raw_output:
        return ""
        
    text = raw_output.strip()
    
    # 1. Regex match "response_text": "..."
    match = re.search(r'"response_text"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"(?:tasks|goals|resources|practice_questions|suggestions)"|\s*})', text)
    if match and match.group(1):
        clean = match.group(1).replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
        return clean.strip()
        
    # 2. Alternative match if response_text is first key
    match2 = re.search(r'"response_text"\s*:\s*"(.*)', text, re.DOTALL)
    if match2:
        val = match2.group(1)
        for delimiter in ['",\n  "tasks"', '",\n  "goals"', '",\n  "resources"', '",\n"tasks"', '", "tasks"', '",\n  "suggestions"']:
            if delimiter in val:
                val = val.split(delimiter)[0]
                break
        val = val.strip().rstrip('"').replace('\\"', '"').replace('\\n', '\n')
        if val:
            return val.strip()

    # 3. Strip ```json code block if present
    if "```json" in text:
        text = text.split("```json")[-1].split("```")[0].strip()
    elif text.startswith("```") and text.endswith("```"):
        text = text.strip("`").strip()
        
    return text


class BaseAgent(ABC):
    def __init__(self):
        self.openrouter_client = OpenRouterClient()
        self.agent_name = self.__class__.__name__

    @abstractmethod
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process user input and return standardized output dictionary:
        {
          "response_text": str,
          "tasks": list,
          "goals": list,
          "resources": list,
          "practice_questions": list,
          "suggestions": list
        }
        """
        pass

    async def call_llm(self, messages: list, system_prompt: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> str:
        combined_prompt = (system_prompt or "") + "\n\n" + COMMON_SUGGESTION_PROMPT
        
        if context:
            shared_ctx_str = context.get("shared_goal_state", "")
            if shared_ctx_str:
                combined_prompt += f"\n\n--- CROSS-AGENT SHARED CONTEXT & DEADLINES ---\n{shared_ctx_str}\n\nINSTRUCTION: Cross-reference and align with all existing deadlines, active goals, and tasks above."

        messages_to_send = [{"role": "system", "content": combined_prompt}] + messages
        response = await self.openrouter_client.chat_completion(messages_to_send)

        if "choices" in response and len(response["choices"]) > 0:
            return response["choices"][0]["message"]["content"]
        else:
            raise Exception("Invalid response from OpenRouter")

    def parse_structured_response(self, raw_output: str) -> Dict[str, Any]:
        """
        Parses JSON output from LLM, with fallback to text if JSON parsing fails.
        Returns standardized dict.
        """
        try:
            cleaned = raw_output.replace("```json", "").replace("```", "").strip()
            # Find json start and end if enclosed in text
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                cleaned = cleaned[start:end+1]
            parsed = json.loads(cleaned)

            response_text = parsed.get("response_text")
            if not response_text or not isinstance(response_text, str) or response_text.strip().startswith("{") or '"response_text"' in response_text:
                response_text = extract_clean_response_text(raw_output)

            tasks = parsed.get("tasks") or []
            goals = parsed.get("goals") or []
            resources = parsed.get("resources") or []
            practice_questions = parsed.get("practice_questions") or []
            suggestions = parsed.get("suggestions") or []

            return {
                "response_text": response_text,
                "tasks": tasks,
                "goals": goals,
                "resources": resources,
                "practice_questions": practice_questions,
                "suggestions": suggestions
            }
        except Exception as e:
            logger.warning(f"Failed to parse structured JSON from {self.agent_name}: {str(e)}. Using clean fallback text.")
            clean_text = extract_clean_response_text(raw_output)
            return {
                "response_text": clean_text,
                "tasks": [],
                "goals": [],
                "resources": [],
                "practice_questions": [],
                "suggestions": []
            }


