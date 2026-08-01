from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.activity_log import ActivityLog
from app.schemas.activity import ActivityLogResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ActivityLogResponse])
async def get_activities(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recent activity log items for the current user.
    """
    activities = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return activities
