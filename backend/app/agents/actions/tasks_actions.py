from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models.task import Task, TaskStatus
from app.db.models.activity_log import ActivityLog
from datetime import datetime


def delete_all_tasks(db: Session, user_id: int) -> Dict[str, Any]:
    """Delete all tasks for the user."""
    count = db.query(Task).filter(Task.user_id == user_id).delete(synchronize_session=False)
    
    # Log activity
    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Deleted all {count} tasks via Chat command."
    )
    db.add(log)
    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted all {count} tasks.",
        "deleted_count": count
    }


def delete_task(db: Session, user_id: int, task_id: Optional[int] = None, task_title: Optional[str] = None) -> Dict[str, Any]:
    """Delete a specific task by ID or title."""
    query = db.query(Task).filter(Task.user_id == user_id)
    if task_id:
        task = query.filter(Task.id == task_id).first()
    elif task_title:
        task = query.filter(Task.title.ilike(f"%{task_title.strip()}%")).first()
    else:
        return {"success": False, "message": "Please specify a task ID or title to delete."}

    if not task:
        return {"success": False, "message": "Task not found."}

    title = task.title
    db.delete(task)
    
    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Deleted task '{title}'."
    )
    db.add(log)
    db.commit()
    return {"success": True, "message": f"Successfully deleted task '{title}'."}


def complete_task(db: Session, user_id: int, task_id: Optional[int] = None, task_title: Optional[str] = None) -> Dict[str, Any]:
    """Mark a task as completed."""
    query = db.query(Task).filter(Task.user_id == user_id)
    if task_id:
        task = query.filter(Task.id == task_id).first()
    elif task_title:
        task = query.filter(Task.title.ilike(f"%{task_title.strip()}%")).first()
    else:
        # Fallback: get the most recent pending task
        task = query.filter(Task.status == TaskStatus.PENDING).order_by(Task.created_at.desc()).first()

    if not task:
        return {"success": False, "message": "No matching pending task found to complete."}

    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()

    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Marked task '{task.title}' as completed."
    )
    db.add(log)
    db.commit()
    return {"success": True, "message": f"Great job! Marked task '{task.title}' as completed.", "task_id": task.id}


def create_task(db: Session, user_id: int, title: str, due_date: Optional[str] = None) -> Dict[str, Any]:
    """Create a new task for the user."""
    if not title or not title.strip():
        return {"success": False, "message": "Task title is required."}

    parsed_date = None
    if due_date:
        try:
            parsed_date = datetime.strptime(due_date.strip(), "%Y-%m-%d")
        except ValueError:
            parsed_date = datetime.utcnow()

    new_task = Task(
        user_id=user_id,
        title=title.strip()[:200],
        status=TaskStatus.PENDING,
        due_date=parsed_date,
        created_by_agent="Productivity Agent"
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Created task '{new_task.title}'."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Task '{new_task.title}' created successfully.",
        "task": {"id": new_task.id, "title": new_task.title, "due_date": str(new_task.due_date)}
    }
