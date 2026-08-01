from fastapi import APIRouter, Depends, HTTPException, Request, Form, File, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.db.session import get_db
from app.db.models.conversation import Conversation
from app.db.models.chat_session import ChatSession
from app.db.models.session_document import SessionDocument
from app.db.models.user import User
from app.db.models.memory import Memory
from app.agents.orchestrator import Orchestrator
from app.schemas.chat import ChatResponse
from app.core.deps import get_current_user
from app.services.action_extractor import ActionExtractor
from app.services.document_scanner import document_scanner
from app.services.embeddings import EmbeddingsService
from app.services.vector_search import vector_search_service
from app.core.logging import logger

router = APIRouter()
orchestrator = Orchestrator()
action_extractor = ActionExtractor()


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: Request,
    file: Optional[UploadFile] = File(None),
    message: Optional[str] = Form(None),
    session_id: Optional[int] = Form(None),
    attachment_name: Optional[str] = Form(None),
    attachment_content: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a chat message and get a response from the AI agent system.
    Supports multipart file upload (PDF, DOCX, TXT, JPG/PNG images up to 15MB).
    Scans documents, generates embeddings, stores SessionDocument, and retrieves RAG document context.
    """
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                message = body.get("message")
                session_id = body.get("session_id")
                attachment_name = body.get("attachment_name")
                attachment_content = body.get("attachment_content")
            except Exception:
                pass

        msg_text = (message or "").strip()

        session = None
        if session_id:
            session = db.query(ChatSession).filter(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id
            ).first()
        
        # If no session specified or found, create a new one
        if not session:
            title_text = msg_text[:40] if msg_text else (file.filename[:40] if (file and file.filename) else "New Chat")
            session = ChatSession(
                user_id=current_user.id,
                title=title_text
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        else:
            # Check if this is the first message in the session and auto-generate title if default
            existing_count = db.query(Conversation).filter(Conversation.session_id == session.id).count()
            if existing_count == 0 and (not session.title or session.title == "New Chat"):
                session.title = msg_text[:40] if msg_text else (file.filename[:40] if (file and file.filename) else "New Chat")

        # Handle file upload if provided
        uploaded_doc_text = ""
        if file and file.filename:
            file_bytes = await file.read()
            if len(file_bytes) > 15 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 15MB.")

            scan_result = await document_scanner.extract_content(
                file_bytes=file_bytes,
                filename=file.filename,
                content_type=file.content_type or ""
            )

            extracted_text = scan_result.get("extracted_text", "")
            file_type = scan_result.get("file_type", "document")
            uploaded_doc_text = extracted_text

            # Chunk extracted text and generate embeddings
            chunks = vector_search_service.chunk_text(extracted_text)
            chunks_data = []
            if chunks:
                embeddings_service = EmbeddingsService()
                vectors = await embeddings_service.generate_embeddings_batch(chunks)
                chunks_data = [{"text": chunks[i], "vector": vectors[i]} for i in range(len(chunks))]

            session_doc = SessionDocument(
                session_id=session.id,
                filename=file.filename,
                file_type=file_type,
                extracted_text=extracted_text,
                embedding=chunks_data
            )
            db.add(session_doc)
            db.commit()
            db.refresh(session_doc)

            if not msg_text:
                msg_text = f"Analyzing uploaded document '{file.filename}'"

        # Save user message to conversation history
        user_conversation = Conversation(
            user_id=current_user.id,
            role="user",
            content=msg_text if not file else f"{msg_text}\n📎 [Attached File: {file.filename}]",
            agent_used=None,
            session_id=session.id
        )
        db.add(user_conversation)
        db.commit()
        db.refresh(user_conversation)
        
        # Get conversation history for context (scoped to session)
        conversation_history = db.query(Conversation).filter(
            Conversation.session_id == session.id
        ).order_by(Conversation.created_at).limit(10).all()
        
        history_messages = [
            {"role": conv.role, "content": conv.content}
            for conv in conversation_history
        ]
        
        # Format message with inline attachment if passed via text
        effective_message = msg_text
        if attachment_name and attachment_content:
            effective_message += f"\n\n--- Attached Document ({attachment_name}) ---\n{attachment_content}\n--- End of Document ---"

        # Perform RAG Vector Search against attached SessionDocuments for this session
        relevant_chunks = await vector_search_service.search_session_documents(
            db=db,
            session_id=session.id,
            query=effective_message,
            top_k=4
        )

        if relevant_chunks:
            doc_context_str = "\n\n".join([f"📌 [From '{c['filename']}']:\n{c['text']}" for c in relevant_chunks])
            effective_message += f"\n\n--- Grounded Document Context (Session Files) ---\n{doc_context_str}\n--- End Grounded Document Context ---"
        elif uploaded_doc_text:
            effective_message += f"\n\n--- Document Content ---\n{uploaded_doc_text[:2000]}\n--- End Document Content ---"

        # Retrieve stored memories & weekly reflections to reference for adaptive agent plans
        memories = db.query(Memory).filter(Memory.user_id == current_user.id).order_by(Memory.created_at.desc()).limit(8).all()
        memory_facts = "\n".join([f"- [{m.category.upper() if m.category else 'CONTEXT'}] {m.content}" for m in memories]) if memories else ""

        # Retrieve real completion behavior: overdue tasks & habit streaks
        from app.db.models.task import Task, TaskStatus
        from app.db.models.habit import Habit
        from datetime import timedelta
        
        three_days_ago = datetime.utcnow() - timedelta(days=3)
        overdue_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.status == TaskStatus.PENDING,
            Task.due_date <= three_days_ago
        ).all()

        habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()

        behavior_context = ""
        if len(overdue_tasks) >= 3:
            overdue_titles = ", ".join([f"'{t.title}'" for t in overdue_tasks[:4]])
            behavior_context += f"\n⚠️ ADAPTIVE RE-PLANNING TRIGGERED: User has missed 3+ consecutive days on tasks ({overdue_titles}).\nInstruction for Agent: Do NOT repeat the same rigid plan! Proactively propose an adaptive revised roadmap."

        # Retrieve active user goals & tasks
        from app.db.models.goal import Goal
        active_goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
        active_tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.status == TaskStatus.PENDING).limit(10).all()

        goal_lines = []
        if active_goals:
            for g in active_goals[:5]:
                target_str = g.target_date.strftime("%Y-%m-%d") if g.target_date else "No target date"
                goal_lines.append(f"- Goal: '{g.title}' | Target Date: {target_str} | Created By: {g.created_by_agent or 'User'}")
        
        task_lines = []
        if active_tasks:
            for t in active_tasks:
                due_str = t.due_date.strftime("%Y-%m-%d") if t.due_date else "No due date"
                task_lines.append(f"- Pending Task: '{t.title}' | Due: {due_str}")

        shared_goal_state = ""
        if goal_lines or task_lines:
            shared_goal_state = "Active User Goals:\n" + ("\n".join(goal_lines) if goal_lines else "None")
            if task_lines:
                shared_goal_state += "\n\nActive Pending Tasks:\n" + "\n".join(task_lines)

        # Shared context object passed across all agent calls
        context = {
            "conversation_history": history_messages,
            "user_id": current_user.id,
            "session_id": session.id,
            "db": db,
            "user_memories": memory_facts,
            "shared_goal_state": shared_goal_state,
            "active_goals": [{"id": g.id, "title": g.title, "target_date": str(g.target_date)} for g in active_goals],
            "active_tasks": [{"id": t.id, "title": t.title, "due_date": str(t.due_date)} for t in active_tasks]
        }
        
        system_context_headers = []
        if memory_facts:
            system_context_headers.append(f"Memory Recall:\n{memory_facts}")
        if shared_goal_state:
            system_context_headers.append(f"Active Shared Goals & Cross-Agent Deadlines:\n{shared_goal_state}")
        if behavior_context:
            system_context_headers.append(behavior_context)

        if system_context_headers:
            effective_message = f"[System Context:\n" + "\n\n".join(system_context_headers) + f"]\n\n{effective_message}"

        result = await orchestrator.route_request(effective_message, context)
        
        # Save assistant response to conversation history
        assistant_conversation = Conversation(
            user_id=current_user.id,
            role="assistant",
            content=result["response"],
            agent_used=result["agent_used"],
            session_id=session.id
        )
        db.add(assistant_conversation)

        # Update session timestamp and last_agent_used
        session.last_agent_used = result["agent_used"]
        session.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(assistant_conversation)

        # Extract & create Task, Goal, Suggestion records
        actions_summary = await action_extractor.extract_and_save_actions(
            user_input=msg_text,
            agent_response=result["response"],
            agent_used=result["agent_used"],
            user_id=current_user.id,
            conversation_id=assistant_conversation.id,
            db=db,
            agent_result=result
        )
        
        logger.info(f"Chat processed for user {current_user.id} using agent: {result['agent_used']}.")
        
        return ChatResponse(
            response=result["response"],
            agent_used=result["agent_used"],
            intent=result["intent"],
            tasks_created=actions_summary.get("tasks_created", []),
            goals_created=actions_summary.get("goals_created", []),
            suggestions_created=actions_summary.get("suggestions_created", []),
            is_multi_agent=result.get("is_multi_agent", False),
            agent_chain=result.get("agent_chain", [])
        )
        
    except ValueError as ve:
        logger.warning(f"Validation error in send_message: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process message")


@router.get("/history")
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get chat history for the current user.
    """
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.created_at).limit(50).all()
    
    return [
        {
            "id": conv.id,
            "role": conv.role,
            "content": conv.content,
            "agent_used": conv.agent_used,
            "created_at": conv.created_at
        }
        for conv in conversations
    ]
