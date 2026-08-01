from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models.goal import Goal, GoalStatus
from app.db.models.activity_log import ActivityLog
from app.services.deduplication import find_duplicate_goal
from datetime import datetime, timedelta


def delete_all_goals(db: Session, user_id: int) -> Dict[str, Any]:
    """Delete all goals for the user."""
    count = db.query(Goal).filter(Goal.user_id == user_id).delete(synchronize_session=False)
    
    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Deleted all {count} goals via Chat command."
    )
    db.add(log)
    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted all {count} goals.",
        "deleted_count": count
    }


def delete_goal(db: Session, user_id: int, goal_id: Optional[int] = None, goal_title: Optional[str] = None) -> Dict[str, Any]:
    """Delete a specific goal by ID or title match."""
    query = db.query(Goal).filter(Goal.user_id == user_id)
    if goal_id:
        goal = query.filter(Goal.id == goal_id).first()
    elif goal_title:
        goal = query.filter(Goal.title.ilike(f"%{goal_title.strip()}%")).first()
    else:
        return {"success": False, "message": "Please specify a goal ID or title to delete."}

    if not goal:
        return {"success": False, "message": "Goal not found."}

    title = goal.title
    db.delete(goal)
    
    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Deleted goal '{title}'."
    )
    db.add(log)
    db.commit()
    return {"success": True, "message": f"Successfully deleted goal '{title}'."}


def create_goal(db: Session, user_id: int, title: str, target_date: Optional[str] = None, description: Optional[str] = None) -> Dict[str, Any]:
    """Create a new goal with deduplication check."""
    if not title or not title.strip():
        return {"success": False, "message": "Goal title is required."}

    raw_title = title.strip()[:200]
    existing = find_duplicate_goal(db, user_id, raw_title)
    if existing:
        return {
            "success": True,
            "message": f"Goal '{existing.title}' already exists (Goal #{existing.id}).",
            "goal": {"id": existing.id, "title": existing.title, "target_date": str(existing.target_date)}
        }

    parsed_target = None
    if target_date:
        try:
            parsed_target = datetime.strptime(target_date.strip(), "%Y-%m-%d")
        except ValueError:
            parsed_target = datetime.utcnow() + timedelta(days=30)
    else:
        parsed_target = datetime.utcnow() + timedelta(days=30)

    new_goal = Goal(
        user_id=user_id,
        title=raw_title,
        description=description or f"Goal created via Chat command: {raw_title}",
        status=GoalStatus.IN_PROGRESS,
        target_date=parsed_target,
        created_by_agent="Productivity Agent"
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    log = ActivityLog(
        user_id=user_id,
        agent_name="Productivity Agent",
        action_description=f"Created goal '{new_goal.title}'."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Goal '{new_goal.title}' created successfully.",
        "goal": {"id": new_goal.id, "title": new_goal.title, "target_date": str(new_goal.target_date)}
    }
