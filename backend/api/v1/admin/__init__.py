"""
Admin API module for platform administration.
Provides global oversight and management of all owners, places, bookings, campaigns, and messaging.
"""

from fastapi import APIRouter
from . import stats, owners, places, bookings, campaigns, messages

# Create main admin router
router = APIRouter()

# Include all admin sub-routers
router.include_router(stats.router, prefix="/stats", tags=["Admin - Statistics"])
router.include_router(owners.router, prefix="/owners", tags=["Admin - Owners"])
router.include_router(places.router, prefix="/places", tags=["Admin - Places"])
router.include_router(bookings.router, prefix="/bookings", tags=["Admin - Bookings"])
router.include_router(campaigns.router, prefix="/campaigns", tags=["Admin - Campaigns"])
router.include_router(messages.router, prefix="/messages", tags=["Admin - Messages"])
