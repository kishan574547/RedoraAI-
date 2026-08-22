from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[GoalResponse])
async def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.created_at.desc()).all()
    return goals


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.deduplication import find_duplicate_goal

    # Permanent safeguard against duplicate goals
    existing = find_duplicate_goal(db, current_user.id, goal_data.title)
    if existing:
        if goal_data.description:
            existing.description = goal_data.description
        if goal_data.target_date:
            existing.target_date = goal_data.target_date
        db.commit()
        db.refresh(existing)
        return existing

    new_goal = Goal(
        user_id=current_user.id,
        title=goal_data.title,
        description=goal_data.description,
        status=goal_data.status,
        target_date=goal_data.target_date,
        created_by_agent=goal_data.created_by_agent,
        conversation_id=goal_data.conversation_id
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    from app.db.models.activity_log import ActivityLog
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name=goal_data.created_by_agent or "User",
        action_description=f"Created goal: '{new_goal.title}'",
        related_goal_id=new_goal.id
    )
    db.add(activity)
    db.commit()

    return new_goal


@router.get("/templates", response_model=List[GoalResponse])
async def get_public_templates(
    db: Session = Depends(get_db)
):
    """
    Get all public community goal templates.
    """
    templates = db.query(Goal).filter(Goal.is_template == "true").order_by(Goal.created_at.desc()).all()
    return templates


@router.post("/{goal_id}/adopt", response_model=GoalResponse)
async def adopt_goal_template(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adopt a public community goal template into user's own goals.
    """
    template_goal = db.query(Goal).filter(Goal.id == goal_id, Goal.is_template == "true").first()
    if not template_goal:
        raise HTTPException(status_code=404, detail="Template goal not found")

    new_goal = Goal(
        user_id=current_user.id,
        title=f"Adopted: {template_goal.title}",
        description=template_goal.description,
        status="not_started",
        created_by_agent=template_goal.created_by_agent,
        is_template="false"
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    # Copy resources
    for res in template_goal.resources:
        from app.db.models.resource_practice import ResourceLink
        db.add(ResourceLink(
            goal_id=new_goal.id,
            title=res.title,
            description=res.description,
            url=res.url
        ))

    # Copy practice questions
    for pq in template_goal.practice_questions:
        from app.db.models.resource_practice import PracticeQuestion
        db.add(PracticeQuestion(
            goal_id=new_goal.id,
            question=pq.question,
            answer=pq.answer
        ))

    from app.db.models.activity_log import ActivityLog
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name="User",
        action_description=f"Adopted goal template: '{template_goal.title}'",
        related_goal_id=new_goal.id
    )
    db.add(activity)

    db.commit()
    db.refresh(new_goal)
    return new_goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found or unauthorized"
        )
    
    status_changed = goal_data.status is not None and goal_data.status != goal.status

    if goal_data.title is not None:
        goal.title = goal_data.title
    if goal_data.description is not None:
        goal.description = goal_data.description
    if goal_data.status is not None:
        goal.status = goal_data.status
    if goal_data.target_date is not None:
        goal.target_date = goal_data.target_date
    if goal_data.is_template is not None:
        goal.is_template = goal_data.is_template

    from app.db.models.activity_log import ActivityLog
    if status_changed:
        action_desc = f"Updated goal status to {goal.status}: '{goal.title}'"
    else:
        action_desc = f"Updated goal: '{goal.title}'"
    
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name="User",
        action_description=action_desc,
        related_goal_id=goal.id
    )
    db.add(activity)

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found or unauthorized"
        )
    
    from app.db.models.activity_log import ActivityLog
    activity = ActivityLog(
        user_id=current_user.id,
        agent_name="User",
        action_description=f"Deleted goal: '{goal.title}'"
    )
    db.add(activity)
    db.delete(goal)
    db.commit()
    return None
