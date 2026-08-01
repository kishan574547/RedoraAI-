from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter()


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Registration endpoint - strictly enforces that only existing verified users can log in.
    New public user registrations are restricted.
    """
    existing_user = db.query(User).filter(User.email == user_data.email.strip()).first()
    if existing_user:
        if not existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending admin verification. Access restricted."
            )
        # Existing verified user logging in or resetting credentials
        access_token = create_access_token(data={"sub": str(existing_user.id), "email": existing_user.email})
        return Token(access_token=access_token)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Registration is restricted to pre-authorized accounts. Only verified users can sign in."
    )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate verified users with email and password and return JWT access token.
    Strictly denies unverified or unregistered users.
    """
    user = db.query(User).filter(User.email == user_data.email.strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Access is restricted to pre-authorized accounts."
        )
    
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has not been verified yet. Access restricted."
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token)
