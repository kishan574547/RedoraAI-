from typing import Dict, Any, Optional, List
from app.agents.base_agent import call_llm
from app.agents.memory_agent import MemoryAgent
from app.agents.study_agent import StudyAgent
from app.agents.career_agent import CareerAgent
from app.agents.coding_agent import CodingAgent
from app.agents.productivity_agent import ProductivityAgent
from app.agents.finance_agent import finance_agent
from app.agents.speaking_agent import speaking_agent
from app.agents.health_agent import health_agent
from app.core.logging import logger


class Orchestrator:
    def __init__(self):
        self.agents = {
            "memory": MemoryAgent(),
            "study": StudyAgent(),
            "career": CareerAgent(),
            "coding": CodingAgent(),
            "productivity": ProductivityAgent(),
            "finance": finance_agent,
            "speaking": speaking_agent,
            "health": health_agent
        }

    def detect_multi_agent_scenario(self, user_input: str) -> Optional[List[str]]:
        lower_input = user_input.lower()
        if any(w in lower_input for w in ["sleep", "sleeping", "stressed", "stress", "fitness", "workout", "gym", "hydration", "health", "mindfulness", "wellbeing", "anxiety", "exhausted"]):
            return ["health", "productivity"]
        if any(w in lower_input for w in ["spent", "budget", "expense", "cost", "money", "savings", "financial"]):
            return ["finance", "productivity"]
        if any(w in lower_input for w in ["interview", "career", "job search", "promotion", "resume", "hiring"]):
            return ["career", "study", "productivity"]
        if any(w in lower_input for w in ["learn", "skill", "study", "exam", "course", "curriculum", "master"]):
            return ["study", "productivity"]
        if any(w in lower_input for w in ["build an app", "project", "coding roadmap", "fullstack", "software"]):
            return ["coding", "study", "productivity"]
        if any(w in lower_input for w in ["get fit", "habit", "routine", "goal for next month", "yearly goal"]):
            if any(w in lower_input for w in ["study", "learn", "exam", "reading", "dsa"]):
                return ["study", "productivity"]
            if any(w in lower_input for w in ["sleep", "workout", "water", "stress", "meditation", "gym", "health"]):
                return ["health", "productivity"]
            return None  # Route to single ProductivityAgent without CareerAgent coupling
        if any(w in lower_input for w in ["speak", "speech", "pronunciation", "talk", "verbal"]):
            return ["speaking", "productivity"]
        return None

    async def classify_intent(self, user_input: str) -> str:
        action_match = self.detect_action_intent(user_input)
        if action_match:
            return action_match.get("action_name", "productivity")

        classification_prompt = """You are an intent classifier. Classify the user's input into one of these categories:
- memory: storing or retrieving information, memories, notes
- study: learning, studying, educational content, research
- career: job search, career advice, professional development
- coding: programming, software development, debugging
- productivity: time management, task management, productivity tips
- finance: expenses, budget, savings, financial management
- speaking: speech coaching, pronunciation, spoken English, oral communication
- health: physical fitness, sleep, hydration, stress management, mental health, study-life balance

Respond with ONLY the category name (lowercase, no punctuation)."""

        messages = [
            {"role": "user", "content": user_input}
        ]
        
        try:
            raw_text = await call_llm(messages, system_prompt=classification_prompt)
            intent = raw_text.strip().lower()
            if intent not in self.agents:
                intent = "productivity"
            return intent
        except Exception as e:
            logger.error(f"Error classifying intent: {str(e)}")
            return "productivity"

    def detect_action_intent(self, user_input: str) -> Optional[Dict[str, Any]]:
        """
        Analyze user message to check if it matches a registered tool action.
        Returns dict with action_name, kwargs, and confirmation_required if matched.
        """
        clean_input = user_input.strip()
        # If input has [System Context:...], extract original user prompt at the end
        if "[System Context:" in clean_input and "]\n\n" in clean_input:
            clean_input = clean_input.split("]\n\n")[-1].strip()
        lower_input = clean_input.lower()

        # 0. Combined "remove/delete/clear all tasks and goals" or "delete tasks and goals"
        has_delete_verb = any(v in lower_input for v in ["delete", "remove", "clear", "del", "dlete", "erase", "wipe"])
        has_task_word = any(w in lower_input for w in ["task", "taks", "tsks"])
        has_goal_word = any(w in lower_input for w in ["goal", "golas", "gls"])

        if has_delete_verb and has_task_word and has_goal_word:
            return {
                "action_name": "delete_all_tasks",
                "kwargs": {},
                "agent_name": "productivity",
                "also_delete_goals": True
            }

        # 1. Tasks
        if has_delete_verb and has_task_word and not has_goal_word:
            return {
                "action_name": "delete_all_tasks",
                "kwargs": {},
                "agent_name": "productivity"
            }

        if any(p in lower_input for p in ["mark task", "complete task", "done", "mark as completed", "finish task"]):
            if "as done" in lower_input or "mark task" in lower_input or "complete task" in lower_input or "finished task" in lower_input:
                import re
                m_id = re.search(r"task\s+#?(\d+)", lower_input)
                task_id = int(m_id.group(1)) if m_id else None
                return {
                    "action_name": "complete_task",
                    "kwargs": {"task_id": task_id},
                    "agent_name": "productivity"
                }

        # 2. Goals
        if has_delete_verb and has_goal_word and not has_task_word:
            return {
                "action_name": "delete_all_goals",
                "kwargs": {},
                "agent_name": "productivity"
            }

        # 3. PDF Toolkit
        if "merge pdf" in lower_input or "combine pdf" in lower_input or "merge the pdf" in lower_input:
            return {
                "action_name": "merge_pdfs",
                "kwargs": {},
                "agent_name": "study"
            }

        if "split" in lower_input and "pdf" in lower_input:
            import re
            r_match = re.search(r"pages?\s+([\d\s,\-]+)", lower_input)
            ranges = r_match.group(1).strip() if r_match else None
            return {
                "action_name": "split_pdf",
                "kwargs": {"ranges": ranges},
                "agent_name": "study"
            }

        if "compress" in lower_input and "pdf" in lower_input:
            return {
                "action_name": "compress_pdf",
                "kwargs": {},
                "agent_name": "study"
            }

        # 4. GPA Calculator
        if "gpa history" in lower_input or "what's my gpa history" in lower_input or "my gpa history" in lower_input:
            return {
                "action_name": "get_gpa_history",
                "kwargs": {},
                "agent_name": "study"
            }

        if "calculate my gpa" in lower_input or "calculate gpa" in lower_input:
            import re
            subjects = []
            matches = re.findall(r"([a-zA-Z\s]+)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*cr(?:edits?)?\s*,?\s*(?:grade\s*)?([a-zA-Z0-9\+]+)", lower_input)
            if matches:
                for sub_name, creds, gr in matches:
                    s_name = sub_name.replace("calculate my gpa for these subjects", "").replace("calculate gpa for", "").strip()
                    if s_name:
                        subjects.append({"name": s_name.capitalize(), "credits": float(creds), "grade": gr})
            
            if not subjects:
                subjects = [{"name": "Course 1", "credits": 4.0, "grade": "A"}, {"name": "Course 2", "credits": 3.0, "grade": "B"}]

            return {
                "action_name": "calculate_gpa",
                "kwargs": {"subjects": subjects},
                "agent_name": "study"
            }

        if "save semester" in lower_input or "save my gpa" in lower_input:
            return {
                "action_name": "save_semester",
                "kwargs": {"semester_label": "Semester 1", "subjects": [{"name": "Course 1", "credits": 4.0, "grade": "A"}]},
                "agent_name": "study"
            }

        # 5. Code Sandbox
        if "run this code" in lower_input or "run code" in lower_input or lower_input.startswith("run this:"):
            import re
            lang = "python"
            if "cpp" in lower_input or "c++" in lower_input:
                lang = "cpp"
            elif "java" in lower_input:
                lang = "java"
            elif " c " in lower_input or lower_input.endswith(" in c"):
                lang = "c"

            code_match = re.search(r"```(?:\w+)?\n?(.*?)\n?```", clean_input, re.DOTALL)
            code_str = ""
            if code_match:
                code_str = code_match.group(1).strip()
            else:
                c_match = re.search(r"run this code:\s*(.*)", clean_input, re.IGNORECASE | re.DOTALL)
                if not c_match:
                    c_match = re.search(r"run this:\s*(.*)", clean_input, re.IGNORECASE | re.DOTALL)
                if c_match:
                    code_str = c_match.group(1).strip().strip("'\"`")

            if not code_str:
                code_str = "print('hello')"

            return {
                "action_name": "run_code",
                "kwargs": {"language": lang, "code": code_str},
                "agent_name": "coding"
            }

        # 6. Resume ATS Checker
        if "check my resume" in lower_input or "check resume" in lower_input or "ats check" in lower_input:
            import re
            jd_str = ""
            jd_match = re.search(r"against this job description:\s*(.*)", clean_input, re.IGNORECASE | re.DOTALL)
            if jd_match:
                jd_str = jd_match.group(1).strip()
            return {
                "action_name": "check_resume",
                "kwargs": {"job_description": jd_str},
                "agent_name": "career"
            }

        return None

    async def run_multi_agent_workflow(self, user_input: str, agent_chain: List[str], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        logger.info(f"Running multi-agent workflow: {' -> '.join(agent_chain)}")
        step_results = []
        accumulated_context = context.copy() if context else {}
        readable_chain = [f"{a.capitalize()} Agent" for a in agent_chain]

        all_tasks = []
        all_goals = []
        all_habits = []
        all_resources = []
        all_practice_questions = []
        all_suggestions = []

        for step_idx, agent_name in enumerate(agent_chain):
            agent = self.agents[agent_name]
            step_prompt = user_input
            
            # Inject real shared goal state and previous agent decisions
            shared_goals = accumulated_context.get("shared_goal_state", "")
            context_prefix = f"🎯 Shared Multi-Agent State & Active Deadlines:\n{shared_goals}\n\n" if shared_goals else ""

            if step_results:
                previous_summary = "\n\n".join([f"--- Output & Deadlines from {agent_chain[i].capitalize()} Agent ---\n{res.get('response_text', '')}" for i, res in enumerate(step_results)])
                step_prompt = f"{context_prefix}User Goal Request: {user_input}\n\nPrevious Agent Decisions & Set Deadlines:\n{previous_summary}\n\nNow, as the {agent_name.capitalize()} Agent, negotiate and align your phase with the target dates set by previous agents above."
            elif context_prefix:
                step_prompt = f"{context_prefix}{step_prompt}"

            res = await agent.run(step_prompt, accumulated_context)
            step_results.append(res)

            all_tasks.extend(res.get("tasks", []))
            all_goals.extend(res.get("goals", []))
            all_habits.extend(res.get("habits", []))
            all_resources.extend(res.get("resources", []))
            all_practice_questions.extend(res.get("practice_questions", []))
            all_suggestions.extend(res.get("suggestions", []))

        final_response_text = f"🎯 **Multi-Agent Coordinated Plan**\n*Redora AI coordinated: {' → '.join(readable_chain)}*\n\n"
        for i, res in enumerate(step_results):
            final_response_text += f"### Phase {i+1}: {agent_chain[i].capitalize()} Agent Strategy\n{res.get('response_text', '')}\n\n"

        return {
            "response": final_response_text,
            "agent_used": agent_chain[0],
            "intent": "multi_agent",
            "is_multi_agent": True,
            "agent_chain": readable_chain,
            "tasks": all_tasks,
            "goals": all_goals,
            "habits": all_habits,
            "resources": all_resources,
            "practice_questions": all_practice_questions,
            "suggestions": all_suggestions
        }

    async def route_request(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Check if input matches registered tool action
        action_intent = self.detect_action_intent(user_input)
        if action_intent:
            from app.agents.actions import ACTION_REGISTRY, execute_action
            action_name = action_intent["action_name"]
            action_meta = ACTION_REGISTRY.get(action_name, {})
            agent_used = action_intent.get("agent_name", "productivity")

            db = context.get("db") if context else None
            user_id = context.get("user_id") if context else None
            session_id = context.get("session_id") if context else None

            # Execute real registered action
            if db and user_id:
                res = await execute_action(action_name, db=db, user_id=user_id, session_id=session_id, **action_intent.get("kwargs", {}))
                response_text = res.get("message", f"Action {action_name} executed successfully.")

                # If user requested to delete both tasks and goals in one command
                if action_intent.get("also_delete_goals"):
                    g_res = await execute_action("delete_all_goals", db=db, user_id=user_id, session_id=session_id)
                    response_text += f"\n{g_res.get('message', '')}"

                return {
                    "response": response_text,
                    "agent_used": agent_used,
                    "intent": action_name,
                    "is_multi_agent": False,
                    "agent_chain": [f"{agent_used.capitalize()} Agent"],
                    "tasks": [],
                    "goals": [],
                    "habits": [],
                    "resources": [],
                    "practice_questions": [],
                    "suggestions": []
                }

        multi_chain = self.detect_multi_agent_scenario(user_input)
        if multi_chain:
            return await self.run_multi_agent_workflow(user_input, multi_chain, context)

        intent = await self.classify_intent(user_input)
        agent = self.agents[intent]
        res = await agent.run(user_input, context)

        return {
            "response": res.get("response_text", ""),
            "agent_used": intent,
            "intent": intent,
            "is_multi_agent": False,
            "agent_chain": [f"{intent.capitalize()} Agent"],
            "tasks": res.get("tasks", []),
            "goals": res.get("goals", []),
            "habits": res.get("habits", []),
            "resources": res.get("resources", []),
            "practice_questions": res.get("practice_questions", []),
            "suggestions": res.get("suggestions", [])
        }

