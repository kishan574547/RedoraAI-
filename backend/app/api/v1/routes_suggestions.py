from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.suggestion import Suggestion
from app.schemas.suggestion import SuggestionResponse, SuggestionUpdate
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[SuggestionResponse])
async def get_suggestions(
    goal_id: Optional[int] = None,
    conversation_id: Optional[int] = None,
    undismissed_only: bool = True,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Suggestion).filter(Suggestion.user_id == current_user.id)
    if undismissed_only:
        query = query.filter(Suggestion.dismissed == False)
    if goal_id:
        query = query.filter(Suggestion.related_goal_id == goal_id)
    if conversation_id:
        query = query.filter(Suggestion.related_conversation_id == conversation_id)
    
    suggestions = query.order_by(Suggestion.created_at.desc()).limit(limit).all()
    return suggestions


@router.patch("/{suggestion_id}", response_model=SuggestionResponse)
async def update_suggestion(
    suggestion_id: int,
    suggestion_data: SuggestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == current_user.id
    ).first()

    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found"
        )

    if suggestion_data.dismissed is not None:
        suggestion.dismissed = suggestion_data.dismissed

    db.commit()
    db.refresh(suggestion)
    return suggestion
