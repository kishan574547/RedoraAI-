from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.db.models import Base
from app.db.session import engine
from app.core.config import settings
from app.core.logging import logger

app = FastAPI(
    title="Redora AI API",
    version="1.0.0",
    description="Redora AI backend server with strict security isolation.",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' http://localhost:* http://127.0.0.1:*; "
            "img-src 'self' data: https:; "
            "font-src 'self' https: data:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://*.supabase.co https://generativelanguage.googleapis.com https://openrouter.ai;"
        )
        return response


# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Locked-down CORS middleware (allows configured domains + any localhost port in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Retry-After"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled internal exception on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
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
