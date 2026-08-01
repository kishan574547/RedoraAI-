from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.memory import Memory
from app.schemas.memory import MemoryCreate, MemoryResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[MemoryResponse])
async def get_memories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all stored context and memory facts for the current user.
    """
    memories = (
        db.query(Memory)
        .filter(Memory.user_id == current_user.id)
        .order_by(Memory.created_at.desc())
        .all()
    )
    return memories


@router.post("/store", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def store_memory(
    memory_data: MemoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Store a new context or memory item for the current user.
    """
    emb_int = [0] * 384
    try:
        from app.services.embeddings import EmbeddingsService
        emb = await EmbeddingsService().generate_embedding(memory_data.content)
        emb_int = [int(x * 1000) for x in emb]
    except Exception as e:
        pass

    new_memory = Memory(
        user_id=current_user.id,
        content=memory_data.content,
        category=memory_data.category or "context",
        embedding=emb_int
    )
    db.add(new_memory)
    db.commit()
    db.refresh(new_memory)
    return new_memory


@router.get("/reflection-prompt")
async def get_weekly_reflection_prompt(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get weekly reflection check-in status and prompt.
    Checks if 7 days have passed since the last weekly reflection memory.
    """
    from datetime import datetime, timedelta

    last_reflection = (
        db.query(Memory)
        .filter(Memory.user_id == current_user.id, Memory.category == "weekly_reflection")
        .order_by(Memory.created_at.desc())
        .first()
    )

    is_due = True
    days_since = None
    if last_reflection and last_reflection.created_at:
        delta = datetime.utcnow() - last_reflection.created_at
        days_since = delta.days
        if days_since < 7:
            is_due = False

    return {
        "prompt": "What felt hardest this week?",
        "is_due": is_due,
        "days_since_last": days_since,
        "last_reflection_content": last_reflection.content if last_reflection else None
    }


@router.post("/reflect", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def record_weekly_reflection(
    reflection_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record user's weekly reflection response and save it to Memory context for adaptive AI planning.
    """
    reflection_text = reflection_data.get("reflection", "").strip()
    if not reflection_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reflection text cannot be empty"
        )

    formatted_content = f"Weekly Hardship & Reflection: {reflection_text}"
    emb_int = [0] * 384
    try:
        from app.services.embeddings import EmbeddingsService
        emb = await EmbeddingsService().generate_embedding(formatted_content)
        emb_int = [int(x * 1000) for x in emb]
    except Exception as e:
        pass

    new_memory = Memory(
        user_id=current_user.id,
        content=formatted_content,
        category="weekly_reflection",
        embedding=emb_int
    )
    db.add(new_memory)
    db.commit()
    db.refresh(new_memory)
    return new_memory


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a stored memory item.
    """
    memory = (
        db.query(Memory)
        .filter(Memory.id == memory_id, Memory.user_id == current_user.id)
        .first()
    )
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory item not found"
        )
    db.delete(memory)
    db.commit()
    return None
