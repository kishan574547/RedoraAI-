from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.core.security import verify_token

security = HTTPBearer(auto_error=False)


from jose import jwt

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    # Strictly require cryptographic signature verification via verify_token
    payload = verify_token(token)

    if not payload or not (payload.get("sub") or payload.get("email")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: Token signature is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = None
    user_id_val = payload.get("sub")
    if user_id_val:
        try:
            user = db.query(User).filter(User.id == int(user_id_val)).first()
        except (ValueError, TypeError):
            pass

    if user is None and payload.get("email"):
        user = db.query(User).filter(User.email == payload.get("email")).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

