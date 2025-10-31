"""
Admin statistics and analytics API endpoints.
Provides platform-wide statistics and metrics for the admin dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_admin
from core.config import settings
from models.user import User
from models.place_existing import Place, Booking, PlaceService
from schemas.admin import AdminStatsResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/", response_model=AdminStatsResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_platform_stats(
    time_period: Optional[str] = Query("all", description="Time period: week, month, year, all"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get platform-wide statistics and analytics"""
    
    # Calculate time filter
    now = datetime.utcnow()
    if time_period == "week":
        start_date = now - timedelta(weeks=1)
    elif time_period == "month":
        start_date = now - timedelta(days=30)
    elif time_period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = None
    
    try:
        # Get total users (business owners)
        result = await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.user_type == "business_owner",
                    User.is_active == True
                )
            )
        )
        total_owners = result.scalar() or 0
        
        # Get active owners
        result = await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.user_type == "business_owner",
                    User.is_active == True
                )
            )
        )
        active_owners = result.scalar() or 0
        
        # Get admin users count
        result = await db.execute(
            select(func.count(User.id)).where(
                or_(
                    User.is_admin == True,
                    User.user_type == "platform_admin"
                )
            )
        )
        admin_users = result.scalar() or 0
        
        # Get total places
        result = await db.execute(
            select(func.count(Place.id)).where(Place.is_active == True)
        )
        total_places = result.scalar() or 0
        
        # Get active places
        result = await db.execute(
            select(func.count(Place.id)).where(Place.is_active == True)
        )
        active_places = result.scalar() or 0
        
        # Get booking-enabled places
        result = await db.execute(
            select(func.count(Place.id)).where(
                and_(
                    Place.is_active == True,
                    Place.booking_enabled == True
                )
            )
        )
        booking_enabled_places = result.scalar() or 0
        
        # Get total services
        result = await db.execute(
            select(func.count(PlaceService.id))
        )
        total_services = result.scalar() or 0
        
        # Get total bookings
        if start_date:
            result = await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.created_at >= start_date
                )
            )
        else:
            result = await db.execute(select(func.count(Booking.id)))
        total_bookings = result.scalar() or 0
        
        # Get recent week bookings
        week_start = now - timedelta(weeks=1)
        result = await db.execute(
            select(func.count(Booking.id)).where(
                Booking.created_at >= week_start
            )
        )
        recent_week_bookings = result.scalar() or 0
        
        # Get BIO Diamond places
        result = await db.execute(
            select(func.count(Place.id)).where(
                and_(
                    Place.is_active == True,
                    Place.is_bio_diamond == True
                )
            )
        )
        bio_diamond_places = result.scalar() or 0
        
        return AdminStatsResponse(
            users={
                "total": total_owners,
                "active": active_owners,
                "admins": admin_users
            },
            places={
                "total": total_places,
                "active": active_places,
                "booking_enabled": booking_enabled_places,
                "total_services": total_services,
                "bio_diamond": bio_diamond_places
            },
            bookings={
                "total": total_bookings,
                "recent_week": recent_week_bookings
            },
            time_period=time_period,
            generated_at=now
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch platform statistics: {str(e)}"
        )

@router.get("/trends")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_platform_trends(
    days: int = Query(30, description="Number of days for trend analysis"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get platform growth trends over time"""
    
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get daily booking trends
        result = await db.execute(
            select(
                func.date(Booking.created_at).label('date'),
                func.count(Booking.id).label('bookings')
            ).where(
                Booking.created_at >= start_date
            ).group_by(
                func.date(Booking.created_at)
            ).order_by('date')
        )
        booking_trends = result.fetchall()
        
        # Get daily user registration trends
        result = await db.execute(
            select(
                func.date(User.created_at).label('date'),
                func.count(User.id).label('registrations')
            ).where(
                and_(
                    User.created_at >= start_date,
                    User.user_type == "business_owner"
                )
            ).group_by(
                func.date(User.created_at)
            ).order_by('date')
        )
        registration_trends = result.fetchall()
        
        return {
            "booking_trends": [
                {"date": str(row.date), "bookings": row.bookings}
                for row in booking_trends
            ],
            "registration_trends": [
                {"date": str(row.date), "registrations": row.registrations}
                for row in registration_trends
            ],
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch platform trends: {str(e)}"
        )
