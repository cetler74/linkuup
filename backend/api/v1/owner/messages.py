"""
Owner messages API - simplified version using existing places table.
Messages functionality not yet implemented for places.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from models.user import User
from models.place_existing import Place

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/places/{place_id}/messages")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_messages(
    place_id: int,
    message_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a specific place with optional filters"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # TODO: Implement messages functionality for places
    # For now, return empty list since messages table doesn't exist yet
    return []

@router.post("/places/{place_id}/messages")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_message(
    place_id: int,
    message_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new message for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # TODO: Implement message creation for places
    # For now, return a placeholder response
    return {"message": "Messages functionality not yet implemented for places", "place_id": place_id}

@router.get("/places/{place_id}/messages/{message_id}")
async def get_message(
    place_id: int,
    message_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific message for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # TODO: Implement message retrieval for places
    return {"message": "Messages functionality not yet implemented for places", "place_id": place_id, "message_id": message_id}

@router.put("/places/{place_id}/messages/{message_id}")
async def update_message(
    place_id: int,
    message_id: int,
    message_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update a message for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # TODO: Implement message update for places
    return {"message": "Messages functionality not yet implemented for places", "place_id": place_id, "message_id": message_id}

@router.delete("/places/{place_id}/messages/{message_id}")
async def delete_message(
    place_id: int,
    message_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete a message for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # TODO: Implement message deletion for places
    return {"message": "Messages functionality not yet implemented for places", "place_id": place_id, "message_id": message_id}