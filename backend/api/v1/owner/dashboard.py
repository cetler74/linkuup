"""
Owner dashboard API endpoints for business analytics and insights.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from models.user import User
from models.place_existing import Place, Booking, Service, PlaceService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class DashboardStatsResponse:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

class BookingTrendResponse:
    def __init__(self, date: str, count: int):
        self.date = date
        self.count = count

class RecentActivityResponse:
    def __init__(self, type: str, title: str, description: str, timestamp: str, icon: str):
        self.type = type
        self.title = title
        self.description = description
        self.timestamp = timestamp
        self.icon = icon

class RecentBookingResponse:
    def __init__(self, id: int, customer_name: str, customer_email: str, service_name: str, 
                 booking_date: str, status: str, place_name: str):
        self.id = id
        self.customer_name = customer_name
        self.customer_email = customer_email
        self.service_name = service_name
        self.booking_date = booking_date
        self.status = status
        self.place_name = place_name

@router.get("/stats")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive dashboard statistics for the business owner"""
    try:
        # Get owner's places
        places_result = await db.execute(
            select(Place).where(
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        places = places_result.scalars().all()
        
        if not places:
            return DashboardStatsResponse(
                registered_places=0,
                total_bookings=0,
                active_customers=0,
                ongoing_campaigns=0,
                unread_messages=0
            )
        
        place_ids = [place.id for place in places]
        
        # Get total bookings
        total_bookings_result = await db.execute(
            select(func.count(Booking.id)).where(
                Booking.place_id.in_(place_ids)
            )
        )
        total_bookings = total_bookings_result.scalar() or 0
        
        # Get unique customers
        unique_customers_result = await db.execute(
            select(func.count(func.distinct(Booking.customer_email))).where(
                Booking.place_id.in_(place_ids)
            )
        )
        active_customers = unique_customers_result.scalar() or 0
        
        # Get recent bookings (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_bookings_result = await db.execute(
            select(func.count(Booking.id)).where(
                and_(
                    Booking.place_id.in_(place_ids),
                    Booking.created_at >= week_ago
                )
            )
        )
        recent_bookings = recent_bookings_result.scalar() or 0
        
        return DashboardStatsResponse(
            registered_places=len(places),
            total_bookings=total_bookings,
            active_customers=active_customers,
            recent_bookings=recent_bookings,
            ongoing_campaigns=0,  # Not implemented yet
            unread_messages=0     # Not implemented yet
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard statistics: {str(e)}"
        )

@router.get("/booking-trends")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_booking_trends(
    days: int = Query(30, description="Number of days for trend analysis"),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get booking trends for the last N days"""
    try:
        # Get owner's places
        places_result = await db.execute(
            select(Place).where(
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        places = places_result.scalars().all()
        
        if not places:
            return []
        
        place_ids = [place.id for place in places]
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get daily booking trends
        trends_result = await db.execute(
            select(
                func.date(Booking.created_at).label('date'),
                func.count(Booking.id).label('count')
            ).where(
                and_(
                    Booking.place_id.in_(place_ids),
                    Booking.created_at >= start_date
                )
            ).group_by(
                func.date(Booking.created_at)
            ).order_by('date')
        )
        
        trends = []
        for row in trends_result.fetchall():
            trends.append(BookingTrendResponse(
                date=str(row.date),
                count=row.count
            ))
        
        return trends
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch booking trends: {str(e)}"
        )

@router.get("/recent-activity")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_recent_activity(
    limit: int = Query(10, description="Number of recent activities to return"),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get recent activity for the business owner"""
    try:
        # Get owner's places
        places_result = await db.execute(
            select(Place).where(
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        places = places_result.scalars().all()
        
        if not places:
            return []
        
        place_ids = [place.id for place in places]
        
        # Get recent bookings for activity feed
        recent_bookings_result = await db.execute(
            select(
                Booking.id,
                Booking.customer_name,
                Booking.customer_email,
                Booking.created_at,
                Booking.status,
                Place.nome.label('place_name')
            ).join(
                Place, Booking.place_id == Place.id
            ).where(
                Booking.place_id.in_(place_ids)
            ).order_by(
                desc(Booking.created_at)
            ).limit(limit)
        )
        
        activities = []
        for row in recent_bookings_result.fetchall():
            # Handle null created_at by using current time as fallback
            timestamp = row.created_at.isoformat() if row.created_at else datetime.now().isoformat()
            activities.append(RecentActivityResponse(
                type='booking',
                title='New Booking',
                description=f"{row.customer_name} booked at {row.place_name}",
                timestamp=timestamp,
                icon='calendar_month'
            ))
        
        return activities
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent activity: {str(e)}"
        )

@router.get("/recent-bookings")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_recent_bookings(
    limit: int = Query(10, description="Number of recent bookings to return"),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get recent customer bookings with details"""
    try:
        # Get owner's places
        places_result = await db.execute(
            select(Place).where(
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        places = places_result.scalars().all()
        
        if not places:
            return []
        
        place_ids = [place.id for place in places]
        
        # Get recent bookings with service details
        recent_bookings_result = await db.execute(
            select(
                Booking.id,
                Booking.customer_name,
                Booking.customer_email,
                Booking.booking_date,
                Booking.created_at,
                Booking.status,
                Place.nome.label('place_name'),
                Service.name.label('service_name')
            ).join(
                Place, Booking.place_id == Place.id
            ).join(
                Service, Booking.service_id == Service.id
            ).where(
                Booking.place_id.in_(place_ids)
            ).order_by(
                desc(Booking.created_at)
            ).limit(limit)
        )
        
        bookings = []
        for row in recent_bookings_result.fetchall():
            bookings.append(RecentBookingResponse(
                id=row.id,
                customer_name=row.customer_name or 'Unknown',
                customer_email=row.customer_email or '',
                service_name=row.service_name or 'Unknown Service',
                booking_date=row.booking_date.isoformat() if row.booking_date else '',
                status=row.status or 'pending',
                place_name=row.place_name or 'Unknown Place'
            ))
        
        return bookings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent bookings: {str(e)}"
        )
