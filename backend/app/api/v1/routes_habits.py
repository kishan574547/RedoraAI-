from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.habit import Habit
from app.db.models.activity_log import ActivityLog
from app.schemas.habit import HabitCreate, HabitUpdate, HabitResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[HabitResponse])
async def get_habits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all habits for the current user.
    """
    habits = (
        db.query(Habit)
        .filter(Habit.user_id == current_user.id)
        .order_by(Habit.created_at.desc())
        .all()
    )
    return habits


@router.post("/", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
    habit_data: HabitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new habit.
    """
    new_habit = Habit(
        user_id=current_user.id,
        name=habit_data.name,
        frequency=habit_data.frequency or "daily",
        streak_count=habit_data.streak_count or 0,
        last_completed_at=habit_data.last_completed_at
    )
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)

    # Log Activity
    act = ActivityLog(
        user_id=current_user.id,
        agent_name="productivity",
        action_description=f"Created habit: '{new_habit.name}'"
    )
    db.add(act)
    db.commit()

    return new_habit


@router.post("/{habit_id}/complete", response_model=HabitResponse)
async def complete_habit(
    habit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check off habit for today, incrementing streak count.
    """
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Update streak count & last completed time
    habit.streak_count += 1
    habit.last_completed_at = datetime.utcnow()
    db.commit()
    db.refresh(habit)

    # Log Activity
    act = ActivityLog(
        user_id=current_user.id,
        agent_name="productivity",
        action_description=f"Completed habit '{habit.name}' (🔥 {habit.streak_count} day streak!)"
    )
    db.add(act)
    db.commit()

    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a habit.
    """
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == current_user.id)
        .first()
    )
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    db.delete(habit)
    db.commit()
    return None
