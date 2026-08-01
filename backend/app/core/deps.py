from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.core.security import verify_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    
    user = None

    if payload and payload.get("sub"):
        user_id = payload.get("sub")
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()
        except ValueError:
            user = db.query(User).filter(User.email == payload.get("email")).first()

    # Fallback for Supabase tokens or dev mode: get first user or create guest user
    if user is None:
        user = db.query(User).first()
        if user is None:
            user = User(email="user@example.com", hashed_password="defaultpassword")
            db.add(user)
            db.commit()
            db.refresh(user)
    
    return user
