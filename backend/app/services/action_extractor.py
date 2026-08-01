import re
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models.task import Task, TaskStatus
from app.db.models.goal import Goal, GoalStatus
from app.db.models.activity_log import ActivityLog
from app.db.models.memory import Memory
from app.db.models.habit import Habit
from app.db.models.resource_practice import ResourceLink, PracticeQuestion
from app.services.openrouter_client import OpenRouterClient
from app.core.logging import logger


from app.db.models.suggestion import Suggestion
from app.services.deduplication import find_duplicate_goal, find_duplicate_task
from sqlalchemy import func

class ActionExtractor:
    def __init__(self):
        self.openrouter_client = OpenRouterClient()

    async def extract_and_save_actions(
        self,
        user_input: str,
        agent_response: str,
        agent_used: str,
        user_id: int,
        conversation_id: int,
        db: Session,
        agent_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parse actionable items (tasks, goals, resources, practice questions, suggestions)
        from agent responses and automatically save them in database.
        Deduplicates goals by user_id and title.
        """
        extracted_data = None

        if agent_result and (agent_result.get("tasks") or agent_result.get("goals") or agent_result.get("resources") or agent_result.get("practice_questions") or agent_result.get("suggestions")):
            extracted_data = {
                "has_actions": True,
                "goals": agent_result.get("goals", []),
                "tasks": agent_result.get("tasks", []),
                "resources": agent_result.get("resources", []),
                "practice_questions": agent_result.get("practice_questions", []),
                "suggestions": agent_result.get("suggestions", [])
            }
        else:
            try:
                extraction_prompt = f"""You are an automated Action Extractor. Analyze the conversation between user and AI agent ({agent_used} agent).
Determine if the AI agent generated actionable tasks, goals/roadmaps, recommended learning resources, practice questions, or suggestions.

User Request: {user_input}
Agent Response: {agent_response[:3500]}

Extract all distinct items.
Return ONLY valid JSON matching this format (no markdown formatting or extra text):
{{
  "has_actions": true or false,
  "goals": [
    {{
      "title": "Goal Title",
      "description": "Short description of roadmap",
      "target_days": 30
    }}
  ],
  "tasks": [
    {{
      "title": "Task title",
      "due_days": 1
    }}
  ],
  "resources": [
    {{
      "title": "Title",
      "description": "Description",
      "url": "https://..."
    }}
  ],
  "practice_questions": [
    {{
      "question": "Question",
      "answer": "Answer"
    }}
  ],
  "suggestions": [
    {{
      "type": "resource" | "practice_question" | "tip" | "tool" | "next_step",
      "title": "Title",
      "description": "Description",
      "link": "https://..."
    }}
  ]
}}"""
                messages = [{"role": "system", "content": extraction_prompt}]
                response = await self.openrouter_client.chat_completion(messages)
                raw_content = response["choices"][0]["message"]["content"].strip()
                cleaned_json = raw_content.replace("```json", "").replace("```", "").strip()
                extracted_data = json.loads(cleaned_json)
            except Exception as e:
                logger.warning(f"LLM action extraction failed or skipped: {str(e)}. Falling back to regex parser.")
                extracted_data = self._regex_fallback_extractor(user_input, agent_response, agent_used)

        if not extracted_data or not extracted_data.get("has_actions"):
            return {"tasks_created": [], "goals_created": [], "suggestions_created": []}

        created_tasks = []
        created_goals = []
        created_suggestions = []
        primary_goal = None
        seen_goal_titles = set()

        # Save Goals (with strict deduplication by user_id and case-insensitive title)
        for g_data in extracted_data.get("goals", []):
            raw_title = g_data.get("title", "").strip()
            if not raw_title or len(raw_title) < 3:
                continue

            normalized_title = raw_title[:200].lower()
            if normalized_title in seen_goal_titles:
                logger.info(f"Deduplication: Goal '{raw_title[:200]}' duplicate in current batch. Skipping insertion.")
                continue
            seen_goal_titles.add(normalized_title)

            existing_goal = find_duplicate_goal(db, user_id, raw_title)
            if existing_goal:
                logger.info(f"Deduplication: Goal '{raw_title[:200]}' already exists for user {user_id}. Using existing Goal #{existing_goal.id}.")
                primary_goal = existing_goal
                if not any(g["id"] == existing_goal.id for g in created_goals):
                    created_goals.append({"id": existing_goal.id, "title": existing_goal.title})
                continue

            target_days = g_data.get("target_days") or 30
            target_date = datetime.utcnow() + timedelta(days=target_days)

            goal = Goal(
                user_id=user_id,
                title=raw_title[:200],
                description=g_data.get("description", "")[:500] if g_data.get("description") else f"Created by {agent_used.capitalize()} Agent",
                status=GoalStatus.IN_PROGRESS,
                target_date=target_date,
                created_by_agent=agent_used,
                conversation_id=conversation_id
            )
            db.add(goal)
            db.commit()
            db.refresh(goal)
            primary_goal = goal

            act_goal = ActivityLog(
                user_id=user_id,
                agent_name=agent_used,
                action_description=f"{agent_used.capitalize()} Agent created goal: '{goal.title}'",
                related_goal_id=goal.id,
                related_conversation_id=conversation_id
            )
            db.add(act_goal)
            db.commit()

            created_goals.append({"id": goal.id, "title": goal.title})

        if not primary_goal:
            primary_goal = db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).first()

        # Save Direct Resources linked to Goal
        if primary_goal and extracted_data.get("resources"):
            for res_item in extracted_data.get("resources", []):
                r_title = res_item.get("title", "").strip()
                if r_title:
                    # Deduplicate resource title for this goal
                    existing_res = db.query(ResourceLink).filter(
                        ResourceLink.goal_id == primary_goal.id,
                        func.lower(ResourceLink.title) == r_title[:200].lower()
                    ).first()
                    if not existing_res:
                        db.add(ResourceLink(
                            goal_id=primary_goal.id,
                            title=r_title[:200],
                            description=res_item.get("description", "")[:500],
                            url=res_item.get("url") or res_item.get("link") or "https://youtube.com"
                        ))
            db.commit()

        # Save Direct Practice Questions linked to Goal
        if primary_goal and extracted_data.get("practice_questions"):
            for pq_item in extracted_data.get("practice_questions", []):
                q_text = pq_item.get("question", "").strip()
                a_text = pq_item.get("answer", "").strip()
                if q_text and a_text:
                    existing_pq = db.query(PracticeQuestion).filter(
                        PracticeQuestion.goal_id == primary_goal.id,
                        func.lower(PracticeQuestion.question) == q_text.lower()
                    ).first()
                    if not existing_pq:
                        db.add(PracticeQuestion(
                            goal_id=primary_goal.id,
                            question=q_text,
                            answer=a_text
                        ))
            db.commit()

        # Save Suggestions into Suggestion table
        for sug in extracted_data.get("suggestions", []):
            s_title = sug.get("title", "").strip()
            if s_title:
                s_type = sug.get("type") or "tip"
                sug_obj = Suggestion(
                    user_id=user_id,
                    agent_name=agent_used,
                    type=s_type,
                    title=s_title[:200],
                    description=sug.get("description", ""),
                    link=sug.get("link"),
                    related_goal_id=primary_goal.id if primary_goal else None,
                    related_conversation_id=conversation_id,
                    dismissed=False
                )
                db.add(sug_obj)
                db.commit()
                db.refresh(sug_obj)

                created_suggestions.append({
                    "id": sug_obj.id,
                    "agent_name": sug_obj.agent_name,
                    "type": sug_obj.type,
                    "title": sug_obj.title,
                    "description": sug_obj.description,
                    "link": sug_obj.link,
                    "dismissed": False
                })

                # If suggestion is resource or practice question, also add to goal resources / questions
                if primary_goal:
                    if s_type == "resource":
                        db.add(ResourceLink(
                            goal_id=primary_goal.id,
                            title=s_title[:200],
                            description=sug.get("description", "")[:500],
                            url=sug.get("link") or "https://youtube.com"
                        ))
                    elif s_type == "practice_question":
                        db.add(PracticeQuestion(
                            goal_id=primary_goal.id,
                            question=s_title,
                            answer=sug.get("description", "")
                        ))
                    db.commit()

        # Save Tasks (with duplicate safeguard)
        for t_data in extracted_data.get("tasks", []):
            title = t_data.get("title", "").strip()
            if not title or len(title) < 3:
                continue

            existing_task = find_duplicate_task(db, user_id, title)
            if existing_task:
                logger.info(f"Deduplication: Task '{title}' already exists for user {user_id} (ID #{existing_task.id}). Skipping duplicate task creation.")
                if not any(t["id"] == existing_task.id for t in created_tasks):
                    created_tasks.append({"id": existing_task.id, "title": existing_task.title})
                continue

            due_days = t_data.get("due_days") or 1
            due_date = datetime.utcnow() + timedelta(days=due_days)

            task = Task(
                user_id=user_id,
                title=title[:200],
                status=TaskStatus.PENDING,
                due_date=due_date,
                created_by_agent=agent_used,
                conversation_id=conversation_id
            )
            db.add(task)
            db.commit()
            db.refresh(task)

            act_task = ActivityLog(
                user_id=user_id,
                agent_name=agent_used,
                action_description=f"{agent_used.capitalize()} Agent created task: '{task.title}'",
                related_task_id=task.id,
                related_conversation_id=conversation_id
            )
            db.add(act_task)
            db.commit()

            created_tasks.append({"id": task.id, "title": task.title})

        return {
            "tasks_created": created_tasks,
            "goals_created": created_goals,
            "suggestions_created": created_suggestions
        }



    def _regex_fallback_extractor(self, user_input: str, response: str, agent_used: str) -> Dict[str, Any]:
        lines = response.split('\n')
        extracted_tasks = []
        extracted_goals = []
        extracted_resources = []
        extracted_questions = []

        is_roadmap = any(keyword in user_input.lower() or keyword in response.lower() 
                         for keyword in ["roadmap", "goal", "study plan", "curriculum", "schedule", "milestone"])

        if is_roadmap:
            goal_title = f"{agent_used.capitalize()} Roadmap: {user_input[:50]}"
            extracted_goals.append({
                "title": goal_title,
                "description": f"Generated roadmap for {user_input}",
                "target_days": 30
            })

        for idx, line in enumerate(lines):
            line_str = line.strip()
            bullet_match = re.match(r'^(?:[-*+]\s+|\[[\sx]\]\s+|\d+[\.\)]\s+)(.+)$', line_str, re.IGNORECASE)
            if bullet_match:
                item_text = bullet_match.group(1).strip()
                item_text = re.sub(r'\*\*(.*?)\*\*', r'\1', item_text).strip()

                if len(item_text) > 4 and not item_text.lower().startswith(("here", "note", "remember", "summary")):
                    extracted_tasks.append({
                        "title": item_text[:150],
                        "due_days": (idx % 7) + 1
                    })

        has_actions = len(extracted_goals) > 0 or len(extracted_tasks) > 0

        return {
            "has_actions": has_actions,
            "goals": extracted_goals,
            "tasks": extracted_tasks[:8],
            "resources": extracted_resources,
            "practice_questions": extracted_questions
        }
