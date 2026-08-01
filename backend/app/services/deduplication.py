import re
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.task import Task, TaskStatus
from app.db.models.goal import Goal
from app.core.logging import logger


def normalize_title(title: str) -> str:
    """Clean and normalize title string for fuzzy comparison."""
    if not title:
        return ""
    cleaned = title.lower().strip()
    cleaned = re.sub(r'[^\w\s]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned


def find_duplicate_task(db: Session, user_id: int, title: str) -> Optional[Task]:
    """
    Find existing task for user with exact or near-identical normalized title.
    Returns existing Task object if duplicate found, or None.
    """
    norm = normalize_title(title)
    if not norm or len(norm) < 3:
        return None

    # Retrieve active tasks for user
    user_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
    ).all()

    for task in user_tasks:
        existing_norm = normalize_title(task.title)
        if existing_norm == norm:
            logger.info(f"Duplicate task detected by exact match: '{title}' vs existing '{task.title}' (ID {task.id})")
            return task
        if len(norm) >= 6 and (norm in existing_norm or existing_norm in norm):
            logger.info(f"Duplicate task detected by substring match: '{title}' vs existing '{task.title}' (ID {task.id})")
            return task

    return None


def find_duplicate_goal(db: Session, user_id: int, title: str) -> Optional[Goal]:
    """
    Find existing goal for user with exact or near-identical normalized title.
    Returns existing Goal object if duplicate found, or None.
    """
    norm = normalize_title(title)
    if not norm or len(norm) < 3:
        return None

    user_goals = db.query(Goal).filter(
        Goal.user_id == user_id
    ).all()

    for goal in user_goals:
        existing_norm = normalize_title(goal.title)
        if existing_norm == norm:
            logger.info(f"Duplicate goal detected by exact match: '{title}' vs existing '{goal.title}' (ID {goal.id})")
            return goal
        if len(norm) >= 6 and (norm in existing_norm or existing_norm in norm):
            logger.info(f"Duplicate goal detected by substring match: '{title}' vs existing '{goal.title}' (ID {goal.id})")
            return goal

    return None
