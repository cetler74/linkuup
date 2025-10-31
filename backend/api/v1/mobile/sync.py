"""
Mobile sync API - simplified version using existing places table.
Mobile sync functionality not yet implemented for places.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Dict, Any
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from models.user import User
from models.place_existing import Place

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/status")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get sync status for mobile app"""
    # Get user's last sync timestamp
    last_sync = current_user.updated_at or current_user.created_at
    
    # Get counts of places
    result = await db.execute(
        select(func.count(Place.id)).where(Place.is_active == True)
    )
    total_places = result.scalar() or 0
    
    return {
        "user_id": current_user.id,
        "last_sync": last_sync.isoformat() if last_sync else None,
        "sync_required": True,  # Always true for mobile apps
        "entities": {
            "places": total_places,
            "bookings": 0  # TODO: Implement when bookings table is available
        },
        "version": "1.0.0"
    }

@router.get("/changes")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_sync_changes(
    since: Optional[datetime] = None,
    entity_types: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get sync changes for mobile app"""
    # TODO: Implement sync changes for places
    return {
        "message": "Mobile sync functionality not yet fully implemented for places",
        "changes": [],
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/upload")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def upload_sync_data(
    sync_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload sync data from mobile app"""
    # TODO: Implement sync data upload for places
    return {
        "message": "Mobile sync upload functionality not yet implemented for places",
        "uploaded": False
    }