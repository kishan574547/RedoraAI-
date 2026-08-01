import random
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token
from app.core.security import verify_password, get_password_hash, create_access_token
from app.services.resend_service import send_otp_via_resend
from app.services.emailjs_service import send_otp_via_emailjs
from app.core.logging import logger

router = APIRouter()


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


class ResendOtpRequest(BaseModel):
    email: str
    code: Optional[str] = None


@router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register user, generate a unique random 6-digit OTP, send it to user's email,
    and save unverified user record.
    """
    existing_user = db.query(User).filter(User.email == user_data.email.strip()).first()
    
    # Generate unique 6-digit random OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    hashed_password = get_password_hash(user_data.password)

    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please log in instead."
            )
        # Update code for unverified existing record
        existing_user.hashed_password = hashed_password
        existing_user.verification_code = otp_code
        existing_user.code_expires_at = expires_at
        db.commit()
    else:
        # Create new unverified user
        new_user = User(
            email=user_data.email.strip(),
            hashed_password=hashed_password,
            is_verified=False,
            verification_code=otp_code,
            code_expires_at=expires_at
        )
        db.add(new_user)
        db.commit()

    # Dispatch unique OTP via EmailJS & Resend
    try:
        await send_otp_via_emailjs(to_email=user_data.email.strip(), otp_code=otp_code)
        await send_otp_via_resend(email=user_data.email.strip(), otp_code=otp_code)
    except Exception as err:
        logger.error(f"Error dispatching OTP email: {err}")

    return {
        "message": f"Account created! A unique 6-digit verification code has been sent to {user_data.email.strip()}.",
        "email": user_data.email.strip()
    }


@router.post("/verify-otp", response_model=Token)
async def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Verify user's email against the unique 6-digit OTP sent to their inbox.
    """
    email_clean = req.email.strip()
    code_clean = req.code.strip()

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User email not found. Please register first."
        )

    if not user.verification_code or user.verification_code != code_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email inbox and enter the exact 6-digit code received."
        )

    if user.code_expires_at and datetime.utcnow() > user.code_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    # Mark user as verified
    user.is_verified = True
    user.verification_code = None
    user.code_expires_at = None
    db.commit()

    # Generate JWT access token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token)


@router.post("/resend-otp")
async def resend_otp(req: ResendOtpRequest, db: Session = Depends(get_db)):
    """Generate a new unique 6-digit OTP and send to user's email."""
    email_clean = req.email.strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found.")

    otp_code = str(random.randint(100000, 999999))
    user.verification_code = otp_code
    user.code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    await send_otp_via_emailjs(to_email=email_clean, otp_code=otp_code)
    await send_otp_via_resend(email=email_clean, otp_code=otp_code)

    return {"message": f"A new verification code was sent to {email_clean}."}


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password."""
    user = db.query(User).filter(User.email == user_data.email.strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check verification status
    if not user.is_verified:
        # Resend OTP code if unverified
        otp_code = str(random.randint(100000, 999999))
        user.verification_code = otp_code
        user.code_expires_at = datetime.utcnow() + timedelta(minutes=10)
        db.commit()

        await send_otp_via_emailjs(to_email=user.email, otp_code=otp_code)
        await send_otp_via_resend(email=user.email, otp_code=otp_code)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address not verified yet. A fresh 6-digit verification code has been sent to your email."
        )

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return Token(access_token=access_token)
