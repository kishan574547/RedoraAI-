import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.core.config import settings
from app.core.deps import get_current_user
from app.db.models.user import User

router = APIRouter()

class KaggleCredentials(BaseModel):
    username: str
    key: str

def get_kaggle_auth(custom_username: Optional[str] = None, custom_key: Optional[str] = None):
    username = custom_username or settings.KAGGLE_USERNAME or os.environ.get("KAGGLE_USERNAME")
    key = custom_key or settings.KAGGLE_KEY or os.environ.get("KAGGLE_KEY")
    
    if not username or not key:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("KAGGLE_USERNAME=") and not username:
                        username = line.split("=", 1)[1].strip()
                    elif line.startswith("KAGGLE_KEY=") and not key:
                        key = line.split("=", 1)[1].strip()

    if not username or not key:
        return None, None
    return username, key

@router.get("/status")
async def check_kaggle_status(
    current_user: User = Depends(get_current_user)
):
    username, key = get_kaggle_auth()
    is_configured = bool(username and key)
    return {
        "configured": is_configured,
        "username": username if is_configured else None,
        "message": "Kaggle API credentials active" if is_configured else "Kaggle API key or username missing"
    }

@router.get("/datasets/search")
async def search_datasets(
    search: str = Query("", description="Search term for datasets"),
    page: int = Query(1, ge=1),
    custom_username: Optional[str] = Query(None),
    custom_key: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    username, key = get_kaggle_auth(custom_username, custom_key)
    if not username or not key:
        raise HTTPException(
            status_code=400,
            detail="Kaggle API credentials are required. Please provide username and key in settings or query."
        )
    
    url = f"https://www.kaggle.com/api/v1/datasets/list?search={search}&page={page}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(url, auth=(username, key))
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Kaggle API error: {resp.text}"
                )
            return resp.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Failed to communicate with Kaggle API: {str(e)}")

@router.get("/competitions/list")
async def list_competitions(
    search: str = Query("", description="Search term for competitions"),
    page: int = Query(1, ge=1),
    custom_username: Optional[str] = Query(None),
    custom_key: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    username, key = get_kaggle_auth(custom_username, custom_key)
    if not username or not key:
        raise HTTPException(
            status_code=400,
            detail="Kaggle API credentials are required."
        )
    
    url = f"https://www.kaggle.com/api/v1/competitions/list?search={search}&page={page}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(url, auth=(username, key))
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Kaggle API error: {resp.text}"
                )
            return resp.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Failed to communicate with Kaggle API: {str(e)}")
