from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.chat_session import ChatSession
from app.db.models.conversation import Conversation
from app.schemas.chat_session import ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new chat session.
    """
    new_session = ChatSession(
        user_id=current_user.id,
        title=session_data.title or "New Chat"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all chat sessions for current user, ordered by updated_at descending.
    """
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.get("/search", response_model=List[ChatSessionResponse])
async def search_chat_sessions(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search chat session titles and message contents for current user.
    """
    query_str = q.strip()
    if not query_str:
        return (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id)
            .order_by(ChatSession.updated_at.desc())
            .all()
        )

    # Find sessions matching title
    title_matching_sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == current_user.id,
            ChatSession.title.ilike(f"%{query_str}%")
        )
        .all()
    )

    # Find session IDs matching conversation message content
    message_matching = (
        db.query(Conversation.session_id)
        .filter(
            Conversation.user_id == current_user.id,
            Conversation.session_id.isnot(None),
            Conversation.content.ilike(f"%{query_str}%")
        )
        .distinct()
        .all()
    )
    message_session_ids = [s_id for (s_id,) in message_matching if s_id is not None]

    combined_ids = set([s.id for s in title_matching_sessions] + message_session_ids)

    if not combined_ids:
        return []

    sessions = (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == current_user.id,
            ChatSession.id.in_(combined_ids)
        )
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.get("/{session_id}/messages")

async def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages in a specific chat session.
    """
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    conversations = (
        db.query(Conversation)
        .filter(Conversation.session_id == session_id, Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.asc())
        .all()
    )

    return [
        {
            "id": conv.id,
            "role": conv.role,
            "content": conv.content,
            "agent_used": conv.agent_used,
            "session_id": conv.session_id,
            "created_at": conv.created_at
        }
        for conv in conversations
    ]


@router.get("/{session_id}/documents")
async def get_session_documents(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all attached documents for a specific chat session.
    """
    from app.db.models.session_document import SessionDocument
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    documents = (
        db.query(SessionDocument)
        .filter(SessionDocument.session_id == session_id)
        .order_by(SessionDocument.uploaded_at.asc())
        .all()
    )

    return [
        {
            "id": doc.id,
            "session_id": doc.session_id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "uploaded_at": doc.uploaded_at
        }
        for doc in documents
    ]


@router.patch("/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: int,
    session_data: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rename a chat session title.
    """
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    if session_data.title is not None:
        session.title = session_data.title
    if session_data.last_agent_used is not None:
        session.last_agent_used = session_data.last_agent_used

    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a chat session and all associated messages.
    """
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    db.delete(session)
    db.commit()
    return None
