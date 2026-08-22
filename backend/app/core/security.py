import time
import urllib.request
import json
import bcrypt
from jose import JWTError, jwt, jwk
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger

# In-memory cache for Supabase JWKS public keys
JWKS_CACHE: Dict[str, Any] = {}
JWKS_LAST_FETCH: float = 0.0
JWKS_CACHE_TTL: float = 3600.0  # 1 hour cache TTL


def fetch_supabase_jwks(force_refresh: bool = False) -> Dict[str, Any]:
    global JWKS_CACHE, JWKS_LAST_FETCH
    now = time.time()

    if not force_refresh and JWKS_CACHE and (now - JWKS_LAST_FETCH < JWKS_CACHE_TTL):
        return JWKS_CACHE

    jwks_url = ""
    if settings.SUPABASE_URL:
        base_url = settings.SUPABASE_URL.rstrip('/')
        jwks_url = f"{base_url}/auth/v1/.well-known/jwks.json"
    else:
        jwks_url = "https://ywcdkmmpvgyfxmjdawul.supabase.co/auth/v1/.well-known/jwks.json"

    try:
        req = urllib.request.Request(jwks_url, headers={"User-Agent": "RedoraAI-Backend/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            keys_dict = {}
            for k in data.get("keys", []):
                kid = k.get("kid")
                if kid:
                    keys_dict[kid] = k
            
            JWKS_CACHE = keys_dict
            JWKS_LAST_FETCH = now
            logger.info(f"Successfully fetched and cached {len(keys_dict)} public JWKS keys from Supabase ({jwks_url}).")
            return JWKS_CACHE
    except Exception as e:
        logger.error(f"Failed to fetch Supabase JWKS keys from {jwks_url}: {str(e)}")
        return JWKS_CACHE


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict]:
    """
    Cryptographically verifies JWT signatures.
    Supports:
    1. Local app tokens signed with JWT_SECRET_KEY (HS256)
    2. Supabase tokens verified against public JWKS EC P-256 / RSA keys (ES256/RS256)
    Returns decoded payload ONLY if cryptographic signature verification succeeds.
    """
    # 1. Try local application JWT_SECRET_KEY verification (for locally issued tokens)
    if settings.JWT_SECRET_KEY:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_aud": False}
            )
            return payload
        except JWTError:
            pass

    # 2. Try Supabase JWKS verification for ES256 / RS256 asymmetric keys
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        keys = fetch_supabase_jwks(force_refresh=False)
        
        # If kid is unknown, re-fetch JWKS keys once in case key was recently rotated
        if kid and kid not in keys:
            keys = fetch_supabase_jwks(force_refresh=True)

        key_dict = keys.get(kid) if kid else None
        if not key_dict and keys:
            # Fallback to first available key if kid is missing or single key
            key_dict = next(iter(keys.values()))

        if key_dict:
            public_key = jwk.construct(key_dict)
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256", "RS256", "HS256"],
                options={"verify_aud": False}
            )
            return payload
    except JWTError as e:
        logger.warning(f"JWKS Cryptographic signature verification failed: {str(e)}")
    except Exception as ex:
        logger.warning(f"Error during JWKS token verification: {str(ex)}")

    return None
