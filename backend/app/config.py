from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    KAGGLE_USERNAME: Optional[str] = None
    KAGGLE_KEY: Optional[str] = None
    RESEND_API_KEY: Optional[str] = None
    EMAILJS_SERVICE_ID: Optional[str] = None
    EMAILJS_TEMPLATE_ID: Optional[str] = None
    EMAILJS_PUBLIC_KEY: Optional[str] = None
    EMAILJS_PRIVATE_KEY: Optional[str] = None
    JWT_SECRET_KEY: str = "super-secret-jwt-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
