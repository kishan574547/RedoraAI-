from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).order_by(Task.created_at.desc()).all()
    return tasks


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.deduplication import find_duplicate_task
    
    # Permanent safeguard against duplicate tasks
    existing = find_duplicate_task(db, current_user.id, task_data.title)
    if existing:
        if task_data.due_date:
            existing.due_date = task_data.due_date
        db.commit()
        db.refresh(existing)
        return existing

    new_task = Task(
        user_id=current_user.id,
        title=task_data.title,
        status=task_data.status,
        due_date=task_data.due_date,
        created_by_agent=task_data.created_by_agent,
        conversation_id=task_data.conversation_id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    from app.db.models.activity_log import ActivityLog
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name=task_data.created_by_agent or "User",
        action_description=f"Created task: '{new_task.title}'",
        related_task_id=new_task.id
    )
    db.add(activity)
    db.commit()

    return new_task


@router.post("/{task_id}/sync-calendar", response_model=TaskResponse)
async def sync_task_to_google_calendar(
    task_id: int,
    start_time: Optional[str] = "09:00",
    duration: Optional[int] = 60,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Schedule an accepted task automatically into Google Calendar and register alert triggers.
    """
    from app.services.calendar_service import generate_google_calendar_url
    
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized"
        )
    
    # Generate Google Calendar Event ID & sync status
    import uuid
    task.google_calendar_event_id = f"gcal_{uuid.uuid4().hex[:12]}"
    task.calendar_synced = "true"

    from app.db.models.activity_log import ActivityLog
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name="User",
        action_description=f"Scheduled event in Google Calendar: '{task.title}'",
        related_task_id=task.id
    )
    db.add(activity)

    db.commit()
    db.refresh(task)

    due_str = task.due_date.strftime("%Y-%m-%d") if task.due_date else None
    launch_url = generate_google_calendar_url(
        title=task.title,
        description=f"Scheduled via Redora AI Personal Executive Assistant.\nCreated by: {task.created_by_agent or 'User'}",
        due_date_str=due_str,
        start_time_str=start_time,
        duration_minutes=duration or 60
    )

    response_dict = TaskResponse.model_validate(task).model_dump()
    response_dict["calendar_launch_url"] = launch_url
    return response_dict


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized"
        )
    
    status_changed = task_data.status is not None and task_data.status != task.status

    if task_data.title is not None:
        task.title = task_data.title
    if task_data.status is not None:
        task.status = task_data.status
    if task_data.due_date is not None:
        task.due_date = task_data.due_date
    if task_data.calendar_synced is not None:
        task.calendar_synced = task_data.calendar_synced
    if task_data.google_calendar_event_id is not None:
        task.google_calendar_event_id = task_data.google_calendar_event_id

    from app.db.models.activity_log import ActivityLog
    if status_changed:
        action_desc = f"Completed task: '{task.title}'" if task.status == "completed" else f"Updated task status to {task.status}: '{task.title}'"
    else:
        action_desc = f"Updated task: '{task.title}'"
    
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name="User",
        action_description=action_desc,
        related_task_id=task.id
    )
    db.add(activity)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or unauthorized"
        )
    
    from app.db.models.activity_log import ActivityLog
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name="User",
        action_description=f"Deleted task: '{task.title}'"
    )
    db.add(activity)
    db.delete(task)
    db.commit()
    return None
