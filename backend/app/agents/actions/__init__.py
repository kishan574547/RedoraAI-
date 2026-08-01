# LifeOS Action Registry
# Registered actions enable AI agents in Chat to execute direct operations for supported tools:
# - Tasks (delete_all_tasks, delete_task, complete_task, create_task)
# - Goals (delete_all_goals, delete_goal, create_goal)
# - PDF Toolkit (merge_pdfs, split_pdf, compress_pdf)
# - GPA Calculator (calculate_gpa, save_semester, get_gpa_history)
# - Code Sandbox (run_code)
# - Resume ATS Checker (check_resume)
#
# NOTE: When new tools (e.g., Flashcards, Citation Generator, etc.) are added in the future,
# their corresponding actions should be registered here following this same pattern.
# Only tools currently available in the application sidebar are registered.

import inspect
from typing import Dict, Any, Callable, List, Optional
from sqlalchemy.orm import Session

from app.agents.actions.tasks_actions import (
    delete_all_tasks,
    delete_task,
    complete_task,
    create_task,
)
from app.agents.actions.goals_actions import (
    delete_all_goals,
    delete_goal,
    create_goal,
)
from app.agents.actions.pdf_actions import (
    merge_pdfs_action,
    split_pdf_action,
    compress_pdf_action,
)
from app.agents.actions.gpa_actions import (
    calculate_gpa_action,
    save_semester_action,
    get_gpa_history_action,
)
from app.agents.actions.code_actions import (
    run_code_action,
)
from app.agents.actions.resume_actions import (
    check_resume_action,
)

# Registry dictionary mapping action name -> metadata & handler
ACTION_REGISTRY: Dict[str, Dict[str, Any]] = {}


def register_action(
    name: str,
    description: str,
    handler: Callable,
    requires_confirmation: bool = False,
    tool_category: str = ""
):
    """Register an action in the central agent action registry."""
    ACTION_REGISTRY[name] = {
        "name": name,
        "description": description,
        "handler": handler,
        "requires_confirmation": requires_confirmation,
        "tool_category": tool_category
    }


# ---------------------------------------------------------------------------
# Tasks Actions Registration
# ---------------------------------------------------------------------------
register_action(
    name="delete_all_tasks",
    description="Delete all tasks for the user. Requires user confirmation before execution.",
    handler=delete_all_tasks,
    requires_confirmation=True,
    tool_category="Tasks"
)

register_action(
    name="delete_task",
    description="Delete a specific task by ID or title. Requires user confirmation before execution.",
    handler=delete_task,
    requires_confirmation=True,
    tool_category="Tasks"
)

register_action(
    name="complete_task",
    description="Mark a task as completed by task ID or title (or recent pending task).",
    handler=complete_task,
    requires_confirmation=False,
    tool_category="Tasks"
)

register_action(
    name="create_task",
    description="Create a new task with title and optional due date (YYYY-MM-DD).",
    handler=create_task,
    requires_confirmation=False,
    tool_category="Tasks"
)

# ---------------------------------------------------------------------------
# Goals Actions Registration
# ---------------------------------------------------------------------------
register_action(
    name="delete_all_goals",
    description="Delete all goals for the user. Requires user confirmation before execution.",
    handler=delete_all_goals,
    requires_confirmation=True,
    tool_category="Goals"
)

register_action(
    name="delete_goal",
    description="Delete a specific goal by ID or title. Requires user confirmation before execution.",
    handler=delete_goal,
    requires_confirmation=True,
    tool_category="Goals"
)

register_action(
    name="create_goal",
    description="Create a new goal with title and optional target date (YYYY-MM-DD).",
    handler=create_goal,
    requires_confirmation=False,
    tool_category="Goals"
)

# ---------------------------------------------------------------------------
# PDF Toolkit Actions Registration
# ---------------------------------------------------------------------------
register_action(
    name="merge_pdfs",
    description="Merge multiple uploaded PDF files into a single PDF.",
    handler=merge_pdfs_action,
    requires_confirmation=False,
    tool_category="PDF Toolkit"
)

register_action(
    name="split_pdf",
    description="Split an uploaded PDF file into specific page ranges (e.g. '1-3', '2') or separate pages.",
    handler=split_pdf_action,
    requires_confirmation=False,
    tool_category="PDF Toolkit"
)

register_action(
    name="compress_pdf",
    description="Compress an uploaded PDF file to reduce its size.",
    handler=compress_pdf_action,
    requires_confirmation=False,
    tool_category="PDF Toolkit"
)

# ---------------------------------------------------------------------------
# GPA Calculator Actions Registration
# ---------------------------------------------------------------------------
register_action(
    name="calculate_gpa",
    description="Calculate weighted GPA for a list of subjects with credits and grades/grade points.",
    handler=calculate_gpa_action,
    requires_confirmation=False,
    tool_category="GPA Calculator"
)

register_action(
    name="save_semester",
    description="Save a semester GPA record with semester label and subject details.",
    handler=save_semester_action,
    requires_confirmation=False,
    tool_category="GPA Calculator"
)

register_action(
    name="get_gpa_history",
    description="Retrieve saved GPA history and overall CGPA for the user.",
    handler=get_gpa_history_action,
    requires_confirmation=False,
    tool_category="GPA Calculator"
)

# ---------------------------------------------------------------------------
# Code Sandbox Actions Registration
# ---------------------------------------------------------------------------
register_action(
    name="run_code",
    description="Execute code snippet in python, java, c, or cpp sandbox and return output.",
    handler=run_code_action,
    requires_confirmation=False,
    tool_category="Code Sandbox"
)

# ---------------------------------------------------------------------------
# Resume ATS Checker Actions Registration
# ---------------------------------------------------------------------------
register_action(
    name="check_resume",
    description="Check uploaded resume file against a job description for ATS match score, rule checks, and feedback.",
    handler=check_resume_action,
    requires_confirmation=False,
    tool_category="Resume ATS Checker"
)


async def execute_action(action_name: str, db: Session, user_id: int, session_id: Optional[int] = None, **kwargs) -> Dict[str, Any]:
    """
    Execute a registered action safely with proper arguments inspection.
    """
    if action_name not in ACTION_REGISTRY:
        return {"success": False, "message": f"Action '{action_name}' is not registered."}

    action_meta = ACTION_REGISTRY[action_name]
    handler = action_meta["handler"]
    sig = inspect.signature(handler)
    
    call_args: Dict[str, Any] = {}
    if "db" in sig.parameters:
        call_args["db"] = db
    if "user_id" in sig.parameters:
        call_args["user_id"] = user_id
    if "session_id" in sig.parameters:
        call_args["session_id"] = session_id

    for param_name in sig.parameters:
        if param_name in kwargs and param_name not in call_args:
            call_args[param_name] = kwargs[param_name]

    try:
        if inspect.iscoroutinefunction(handler):
            result = await handler(**call_args)
        else:
            result = handler(**call_args)
        return result
    except Exception as e:
        return {"success": False, "message": f"Execution of '{action_name}' failed: {str(e)}"}
