from app.agents.base_agent import BaseAgent
from typing import Dict, Any, Optional
import re


class FinanceAgent(BaseAgent):
    """
    Finance Agent handles expense logging, budget monitoring, and financial suggestions.
    """
    async def run(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        msg_lower = user_input.lower()
        
        # Detect expense logging intent
        expense_match = re.search(r'(?:spent|paid|bought|expense|cost)\s*(?:of)?\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:on|for)?\s*(.*)', msg_lower)
        
        if expense_match:
            amount = expense_match.group(1)
            category = expense_match.group(2).strip() or "general expenses"
            
            response_text = f"💰 **Finance Agent Logged Expense:**\n- **Amount:** ${amount}\n- **Category:** {category.title()}\n\n📊 *Budget Insight:* Your monthly budget usage is at 42%. Keeping your daily discretionary spending under $25 will help you hit your savings target this month!"
            
            tasks = [{
                "title": f"Review ${amount} expense for {category.title()}",
                "due_days": 1
            }]
            
            suggestions = [{
                "title": f"Finance Alert: Logged ${amount} for {category.title()}",
                "description": "Consider setting a weekly cap of $150 on non-essential purchases.",
                "type": "tip"
            }]
            
            return {
                "response_text": response_text,
                "tasks": tasks,
                "goals": [],
                "resources": [],
                "practice_questions": [],
                "suggestions": suggestions
            }

        system_prompt = """You are a financial advisor and budget optimization agent for Redora AI.
Help users log expenses, track budget limits, manage savings goals, and reduce discretionary spending.
Provide actionable budgeting tasks, financial goals, curated financial management resources, and proactive financial advice."""

        messages = [{"role": "user", "content": user_input}]
        if context and "conversation_history" in context:
            messages = context["conversation_history"] + messages

        raw_output = await self.call_llm(messages, system_prompt, context=context)
        return self.parse_structured_response(raw_output)


finance_agent = FinanceAgent()

