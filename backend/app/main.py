from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine
from app.core.logging import logger

app = FastAPI(title="Redora AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    logger.info("Database schema initialized and verified.")



@app.get("/")
async def root():
    return {"message": "Redora AI API is running"}
