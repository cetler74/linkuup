"""
Admin places management API endpoints.
Provides CRUD operations and configuration for places across all owners.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_admin
from core.config import settings
from models.user import User
from models.place_existing import Place, Booking, PlaceService
from schemas.admin import AdminPlaceResponse, PaginatedResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/", response_model=PaginatedResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_places(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by place name"),
    owner_id: Optional[int] = Query(None, description="Filter by owner ID"),
    tipo: Optional[str] = Query(None, description="Filter by place type"),
    cidade: Optional[str] = Query(None, description="Filter by city"),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, inactive"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all places across all owners with pagination and filtering"""
    
    try:
        # Build base query with owner join
        query = select(Place, User).join(User, Place.owner_id == User.id)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.where(Place.nome.ilike(search_term))
        
        # Apply owner filter
        if owner_id:
            query = query.where(Place.owner_id == owner_id)
        
        # Apply type filter
        if tipo:
            query = query.where(Place.tipo == tipo)
        
        # Apply city filter
        if cidade:
            query = query.where(Place.cidade.ilike(f"%{cidade}%"))
        
        # Apply status filter
        if status_filter == "active":
            query = query.where(Place.is_active == True)
        elif status_filter == "inactive":
            query = query.where(Place.is_active == False)
        
        # Get total count
        count_query = select(func.count(Place.id))
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(Place.nome.ilike(search_term))
        if owner_id:
            count_query = count_query.where(Place.owner_id == owner_id)
        if tipo:
            count_query = count_query.where(Place.tipo == tipo)
        if cidade:
            count_query = count_query.where(Place.cidade.ilike(f"%{cidade}%"))
        if status_filter == "active":
            count_query = count_query.where(Place.is_active == True)
        elif status_filter == "inactive":
            count_query = count_query.where(Place.is_active == False)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(desc(Place.created_at))
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await db.execute(query)
        places_with_owners = result.fetchall()
        
        # Build response with additional data
        place_responses = []
        for place, owner in places_with_owners:
            # Get bookings count for this place
            bookings_result = await db.execute(
                select(func.count(Booking.id)).where(Booking.salon_id == place.id)
            )
            bookings_count = bookings_result.scalar() or 0
            
            # Get services count for this place
            services_result = await db.execute(
                select(func.count(PlaceService.id)).where(PlaceService.place_id == place.id)
            )
            services_count = services_result.scalar() or 0
            
            place_responses.append(AdminPlaceResponse(
                id=place.id,
                nome=place.nome,
                tipo=place.tipo,
                cidade=place.cidade,
                regiao=place.regiao,
                estado=place.estado,
                telefone=place.telefone,
                email=place.email,
                is_active=place.is_active,
                booking_enabled=place.booking_enabled,
                is_bio_diamond=place.is_bio_diamond,
                owner={
                    "id": owner.id,
                    "name": owner.name,
                    "email": owner.email
                },
                services_count=services_count,
                bookings_count=bookings_count,
                created_at=place.created_at
            ))
        
        pages = (total + per_page - 1) // per_page
        
        return PaginatedResponse(
            items=place_responses,
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
            detail=f"Failed to fetch places: {str(e)}"
        )

@router.get("/{place_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_details(
    place_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific place"""
    
    try:
        # Get place with owner
        result = await db.execute(
            select(Place, User).join(User, Place.owner_id == User.id).where(Place.id == place_id)
        )
        place_owner = result.fetchone()
        
        if not place_owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Place not found"
            )
        
        place, owner = place_owner
        
        # Get bookings count
        bookings_result = await db.execute(
            select(func.count(Booking.id)).where(Booking.salon_id == place.id)
        )
        bookings_count = bookings_result.scalar() or 0
        
        # Get services count
        services_result = await db.execute(
            select(func.count(PlaceService.id)).where(PlaceService.place_id == place.id)
        )
        services_count = services_result.scalar() or 0
        
        # Get recent bookings
        recent_bookings_result = await db.execute(
            select(Booking).where(Booking.salon_id == place.id)
            .order_by(desc(Booking.created_at))
            .limit(5)
        )
        recent_bookings = recent_bookings_result.scalars().all()
        
        return {
            "place": {
                "id": place.id,
                "nome": place.nome,
                "tipo": place.tipo,
                "cidade": place.cidade,
                "regiao": place.regiao,
                "estado": place.estado,
                "telefone": place.telefone,
                "email": place.email,
                "is_active": place.is_active,
                "booking_enabled": place.booking_enabled,
                "is_bio_diamond": place.is_bio_diamond,
                "created_at": place.created_at
            },
            "owner": {
                "id": owner.id,
                "name": owner.name,
                "email": owner.email
            },
            "statistics": {
                "bookings_count": bookings_count,
                "services_count": services_count
            },
            "recent_bookings": [
                {
                    "id": booking.id,
                    "customer_name": booking.customer_name,
                    "customer_email": booking.customer_email,
                    "service_name": booking.service_name,
                    "booking_date": booking.booking_date,
                    "booking_time": booking.booking_time,
                    "status": booking.status,
                    "created_at": booking.created_at
                }
                for booking in recent_bookings
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch place details: {str(e)}"
        )

@router.put("/{place_id}/toggle-booking")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def toggle_place_booking(
    place_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Toggle place booking enabled status"""
    
    try:
        # Get place
        result = await db.execute(select(Place).where(Place.id == place_id))
        place = result.scalar_one_or_none()
        
        if not place:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Place not found"
            )
        
        # Toggle booking status
        place.booking_enabled = not place.booking_enabled
        place.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(place)
        
        return {
            "message": f"Place booking {'enabled' if place.booking_enabled else 'disabled'}",
            "booking_enabled": place.booking_enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle place booking: {str(e)}"
        )

@router.put("/{place_id}/toggle-status")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def toggle_place_status(
    place_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Toggle place active status"""
    
    try:
        # Get place
        result = await db.execute(select(Place).where(Place.id == place_id))
        place = result.scalar_one_or_none()
        
        if not place:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Place not found"
            )
        
        # Toggle status
        place.is_active = not place.is_active
        place.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(place)
        
        return {
            "message": f"Place status updated to {'active' if place.is_active else 'inactive'}",
            "is_active": place.is_active
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle place status: {str(e)}"
        )

@router.put("/{place_id}/toggle-bio-diamond")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def toggle_place_bio_diamond(
    place_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Toggle place BIO Diamond status"""
    
    try:
        # Get place
        result = await db.execute(select(Place).where(Place.id == place_id))
        place = result.scalar_one_or_none()
        
        if not place:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Place not found"
            )
        
        # Toggle BIO Diamond status
        place.is_bio_diamond = not place.is_bio_diamond
        place.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(place)
        
        return {
            "message": f"Place BIO Diamond status {'enabled' if place.is_bio_diamond else 'disabled'}",
            "is_bio_diamond": place.is_bio_diamond
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle place BIO Diamond status: {str(e)}"
        )

@router.put("/{place_id}/configuration")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def update_place_configuration(
    place_id: int,
    config_data: Dict[str, Any],
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update place configuration settings"""
    
    try:
        # Get place
        result = await db.execute(select(Place).where(Place.id == place_id))
        place = result.scalar_one_or_none()
        
        if not place:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Place not found"
            )
        
        # Update configuration fields
        if "working_hours" in config_data:
            place.working_hours = config_data["working_hours"]
        
        if "settings" in config_data:
            place.settings = config_data["settings"]
        
        if "features" in config_data:
            place.features = config_data["features"]
        
        place.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(place)
        
        return {
            "message": "Place configuration updated successfully",
            "place_id": place.id,
            "updated_at": place.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update place configuration: {str(e)}"
        )
