from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.v1.router import api_router
from app.db.models import Base
from app.db.session import engine
from app.core.logging import logger

app = FastAPI(title="Redora AI API", version="1.0.0", description="Redora AI backend server with strict security isolation.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://redora-ai.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Ensure SQLite columns exist on tasks, goals, and conversations tables
    with engine.connect() as conn:
        for table in ["tasks", "goals"]:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN created_by_agent VARCHAR;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN conversation_id INTEGER;"))
                conn.commit()
            except Exception:
                pass

        # Migrate goals table
        try:
            conn.execute(text("ALTER TABLE goals ADD COLUMN is_template VARCHAR DEFAULT 'false';"))
            conn.commit()
        except Exception:
            pass

        # Migrate tasks table for Google Calendar Sync
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN google_calendar_event_id VARCHAR;"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN calendar_synced VARCHAR DEFAULT 'false';"))
            conn.commit()
        except Exception:
            pass

        # Migrate conversations table
        try:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN session_id INTEGER;"))
            conn.commit()
        except Exception:
            pass

        # Migrate mock_interview_sessions table
        try:
            conn.execute(text("ALTER TABLE mock_interview_sessions ADD COLUMN difficulty_level VARCHAR DEFAULT 'Mid-Level';"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE mock_interview_sessions ADD COLUMN interview_type VARCHAR DEFAULT 'Full Interview (Mixed)';"))
            conn.commit()
        except Exception:
            pass
    logger.info("Database schema initialized and verified.")



@app.get("/")
async def root():
    return {"message": "Redora AI API is running"}
