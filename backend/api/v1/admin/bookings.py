"""
Admin bookings overview API endpoints.
Provides platform-wide booking analytics and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_admin
from core.config import settings
from models.user import User
from models.place_existing import Place, Booking, PlaceService
from schemas.admin import AdminBookingResponse, AdminBookingStatsResponse, PaginatedResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/", response_model=PaginatedResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_bookings(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    owner_id: Optional[int] = Query(None, description="Filter by owner ID"),
    place_id: Optional[int] = Query(None, description="Filter by place ID"),
    status_filter: Optional[str] = Query(None, description="Filter by booking status"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get platform-wide bookings with filtering and pagination"""
    
    try:
        # Build base query with joins
        query = select(Booking, Place, User).join(
            Place, Booking.salon_id == Place.id
        ).join(
            User, Place.owner_id == User.id
        )
        
        # Apply filters
        if owner_id:
            query = query.where(Place.owner_id == owner_id)
        
        if place_id:
            query = query.where(Booking.salon_id == place_id)
        
        if status_filter:
            query = query.where(Booking.status == status_filter)
        
        if date_from:
            query = query.where(Booking.booking_date >= date_from.date())
        
        if date_to:
            query = query.where(Booking.booking_date <= date_to.date())
        
        # Get total count
        count_query = select(func.count(Booking.id))
        if owner_id:
            count_query = count_query.where(Booking.salon_id.in_(
                select(Place.id).where(Place.owner_id == owner_id)
            ))
        if place_id:
            count_query = count_query.where(Booking.salon_id == place_id)
        if status_filter:
            count_query = count_query.where(Booking.status == status_filter)
        if date_from:
            count_query = count_query.where(Booking.booking_date >= date_from.date())
        if date_to:
            count_query = count_query.where(Booking.booking_date <= date_to.date())
        
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(desc(Booking.created_at))
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await db.execute(query)
        bookings_with_details = result.fetchall()
        
        # Build response
        booking_responses = []
        for booking, place, owner in bookings_with_details:
            booking_responses.append(AdminBookingResponse(
                id=booking.id,
                place_name=place.nome,
                owner_name=owner.name or "Unknown",
                customer_name=booking.customer_name,
                customer_email=booking.customer_email,
                service_name=booking.service_name,
                booking_date=booking.booking_date,
                booking_time=booking.booking_time,
                status=booking.status,
                created_at=booking.created_at
            ))
        
        pages = (total + per_page - 1) // per_page
        
        return PaginatedResponse(
            items=booking_responses,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch bookings: {str(e)}"
        )

@router.get("/stats", response_model=AdminBookingStatsResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_booking_stats(
    time_period: Optional[str] = Query("month", description="Time period: week, month, year, all"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get booking analytics and statistics"""
    
    try:
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
        
        # Get bookings by place
        place_stats_query = select(
            Place.nome.label('place_name'),
            Place.id.label('place_id'),
            func.count(Booking.id).label('booking_count')
        ).join(
            Booking, Place.id == Booking.salon_id
        )
        
        if start_date:
            place_stats_query = place_stats_query.where(
                Booking.created_at >= start_date
            )
        
        place_stats_query = place_stats_query.group_by(
            Place.id, Place.nome
        ).order_by(desc('booking_count')).limit(10)
        
        result = await db.execute(place_stats_query)
        by_place = [
            {
                "place_id": row.place_id,
                "place_name": row.place_name,
                "booking_count": row.booking_count
            }
            for row in result.fetchall()
        ]
        
        # Get bookings by owner
        owner_stats_query = select(
            User.name.label('owner_name'),
            User.id.label('owner_id'),
            func.count(Booking.id).label('booking_count')
        ).join(
            Place, User.id == Place.owner_id
        ).join(
            Booking, Place.id == Booking.salon_id
        )
        
        if start_date:
            owner_stats_query = owner_stats_query.where(
                Booking.created_at >= start_date
            )
        
        owner_stats_query = owner_stats_query.group_by(
            User.id, User.name
        ).order_by(desc('booking_count')).limit(10)
        
        result = await db.execute(owner_stats_query)
        by_owner = [
            {
                "owner_id": row.owner_id,
                "owner_name": row.owner_name,
                "booking_count": row.booking_count
            }
            for row in result.fetchall()
        ]
        
        # Get bookings by status
        status_query = select(
            Booking.status,
            func.count(Booking.id).label('count')
        )
        
        if start_date:
            status_query = status_query.where(
                Booking.created_at >= start_date
            )
        
        status_query = status_query.group_by(Booking.status)
        
        result = await db.execute(status_query)
        by_status = {
            row.status: row.count
            for row in result.fetchall()
        }
        
        # Get recent trends (last 7 days)
        week_start = now - timedelta(days=7)
        trends_query = select(
            func.date(Booking.created_at).label('date'),
            func.count(Booking.id).label('count')
        ).where(
            Booking.created_at >= week_start
        ).group_by(
            func.date(Booking.created_at)
        ).order_by('date')
        
        result = await db.execute(trends_query)
        recent_trends = [
            {
                "date": str(row.date),
                "count": row.count
            }
            for row in result.fetchall()
        ]
        
        return AdminBookingStatsResponse(
            total_bookings=total_bookings,
            by_place=by_place,
            by_owner=by_owner,
            by_status=by_status,
            recent_trends=recent_trends
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch booking statistics: {str(e)}"
        )

@router.get("/export")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def export_bookings(
    owner_id: Optional[int] = Query(None, description="Filter by owner ID"),
    place_id: Optional[int] = Query(None, description="Filter by place ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Export bookings data as CSV"""
    
    try:
        # Build query with all necessary joins
        query = select(
            Booking.id,
            Booking.customer_name,
            Booking.customer_email,
            Booking.customer_phone,
            Booking.service_name,
            Booking.booking_date,
            Booking.booking_time,
            Booking.status,
            Booking.created_at,
            Place.nome.label('place_name'),
            Place.cidade.label('place_city'),
            User.name.label('owner_name'),
            User.email.label('owner_email')
        ).join(
            Place, Booking.salon_id == Place.id
        ).join(
            User, Place.owner_id == User.id
        )
        
        # Apply filters
        if owner_id:
            query = query.where(Place.owner_id == owner_id)
        
        if place_id:
            query = query.where(Booking.salon_id == place_id)
        
        if date_from:
            query = query.where(Booking.booking_date >= date_from.date())
        
        if date_to:
            query = query.where(Booking.booking_date <= date_to.date())
        
        # Order by creation date
        query = query.order_by(desc(Booking.created_at))
        
        result = await db.execute(query)
        bookings = result.fetchall()
        
        # Convert to CSV format
        csv_data = []
        for booking in bookings:
            csv_data.append({
                "booking_id": booking.id,
                "customer_name": booking.customer_name,
                "customer_email": booking.customer_email,
                "customer_phone": booking.customer_phone,
                "service_name": booking.service_name,
                "booking_date": booking.booking_date,
                "booking_time": booking.booking_time,
                "status": booking.status,
                "place_name": booking.place_name,
                "place_city": booking.place_city,
                "owner_name": booking.owner_name,
                "owner_email": booking.owner_email,
                "created_at": booking.created_at
            })
        
        return {
            "data": csv_data,
            "total_records": len(csv_data),
            "exported_at": datetime.utcnow(),
            "filters_applied": {
                "owner_id": owner_id,
                "place_id": place_id,
                "date_from": date_from,
                "date_to": date_to
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export bookings: {str(e)}"
        )
