from fastapi import APIRouter
from app.api.v1 import routes_auth, routes_chat, routes_chat_sessions, routes_tasks, routes_goals, routes_memory, routes_activity, routes_habits, routes_suggestions, routes_pdf_tools, routes_gpa, routes_code_sandbox, routes_resume_ats, routes_kaggle

api_router = APIRouter()

api_router.include_router(routes_auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(routes_chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(routes_chat_sessions.router, prefix="/chat-sessions", tags=["chat-sessions"])
api_router.include_router(routes_tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(routes_goals.router, prefix="/goals", tags=["goals"])
api_router.include_router(routes_memory.router, prefix="/memory", tags=["memory"])
api_router.include_router(routes_activity.router, prefix="/activity", tags=["activity"])
api_router.include_router(routes_habits.router, prefix="/habits", tags=["habits"])
api_router.include_router(routes_suggestions.router, prefix="/suggestions", tags=["suggestions"])
api_router.include_router(routes_pdf_tools.router, prefix="/tools/pdf", tags=["pdf-tools"])
api_router.include_router(routes_gpa.router, prefix="/tools/gpa", tags=["gpa-tools"])
api_router.include_router(routes_code_sandbox.router, prefix="/tools/sandbox", tags=["code-sandbox"])
api_router.include_router(routes_resume_ats.router, prefix="/tools/resume-ats", tags=["resume-ats"])
api_router.include_router(routes_kaggle.router, prefix="/tools/kaggle", tags=["kaggle"])




