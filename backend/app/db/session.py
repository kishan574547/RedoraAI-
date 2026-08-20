from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.logging import logger

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

try:
    if is_sqlite:
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        # Test connection immediately
        with engine.connect() as conn:
            pass
except Exception as e:
    logger.warning(f"[DB Session] Remote database connection failed ({e}). Falling back to local SQLite database.")
    engine = create_engine(
        "sqlite:///./lifeos.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

