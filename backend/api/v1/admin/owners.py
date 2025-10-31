"""
Admin owners management API endpoints.
Provides CRUD operations and analytics for business owners.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import List, Optional
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_admin
from core.config import settings
from models.user import User
from models.place_existing import Place, Booking, PlaceService
from schemas.admin import (
    AdminUserResponse, AdminOwnerDetailsResponse, PaginatedResponse
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/", response_model=PaginatedResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_owners(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, inactive"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all business owners with pagination and filtering"""
    
    try:
        # Build base query
        query = select(User).where(User.user_type == "business_owner")
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Apply status filter
        if status_filter == "active":
            query = query.where(User.is_active == True)
        elif status_filter == "inactive":
            query = query.where(User.is_active == False)
        
        # Get total count
        count_query = select(func.count(User.id)).where(User.user_type == "business_owner")
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        if status_filter == "active":
            count_query = count_query.where(User.is_active == True)
        elif status_filter == "inactive":
            count_query = count_query.where(User.is_active == False)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(desc(User.created_at))
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await db.execute(query)
        owners = result.scalars().all()
        
        # Build response with additional data
        owner_responses = []
        for owner in owners:
            # Get place count for this owner
            places_result = await db.execute(
                select(func.count(Place.id)).where(Place.owner_id == owner.id)
            )
            place_count = places_result.scalar() or 0
            
            # Get total bookings for this owner's places
            bookings_result = await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.salon_id.in_(
                        select(Place.id).where(Place.owner_id == owner.id)
                    )
                )
            )
            total_bookings = bookings_result.scalar() or 0
            
            owner_responses.append(AdminUserResponse(
                id=owner.id,
                name=owner.name or "Unknown",
                email=owner.email,
                user_type=owner.user_type,
                is_admin=owner.is_admin,
                is_active=owner.is_active,
                is_owner=owner.is_owner,
                place_count=place_count,
                total_bookings=total_bookings,
                created_at=owner.created_at,
                last_login=owner.updated_at  # Using updated_at as proxy for last login
            ))
        
        pages = (total + per_page - 1) // per_page
        
        return PaginatedResponse(
            items=owner_responses,
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
            detail=f"Failed to fetch owners: {str(e)}"
        )

@router.get("/{owner_id}", response_model=AdminOwnerDetailsResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_owner_details(
    owner_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific owner"""
    
    try:
        # Get owner
        result = await db.execute(
            select(User).where(
                and_(
                    User.id == owner_id,
                    User.user_type == "business_owner"
                )
            )
        )
        owner = result.scalar_one_or_none()
        
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Owner not found"
            )
        
        # Get owner's places
        places_result = await db.execute(
            select(Place).where(Place.owner_id == owner_id)
        )
        places = places_result.scalars().all()
        
        # Build places data
        places_data = []
        total_bookings = 0
        total_services = 0
        bio_diamond_places = 0
        
        for place in places:
            # Get bookings count for this place
            bookings_result = await db.execute(
                select(func.count(Booking.id)).where(Booking.salon_id == place.id)
            )
            place_bookings = bookings_result.scalar() or 0
            total_bookings += place_bookings
            
            # Get services count for this place
            services_result = await db.execute(
                select(func.count(PlaceService.id)).where(PlaceService.place_id == place.id)
            )
            place_services = services_result.scalar() or 0
            total_services += place_services
            
            if place.is_bio_diamond:
                bio_diamond_places += 1
            
            places_data.append({
                "id": place.id,
                "nome": place.nome,
                "tipo": place.tipo,
                "cidade": place.cidade,
                "regiao": place.regiao,
                "is_active": place.is_active,
                "booking_enabled": place.booking_enabled,
                "is_bio_diamond": place.is_bio_diamond,
                "bookings_count": place_bookings,
                "services_count": place_services,
                "created_at": place.created_at
            })
        
        # Build owner response
        owner_response = AdminUserResponse(
            id=owner.id,
            name=owner.name or "Unknown",
            email=owner.email,
            user_type=owner.user_type,
            is_admin=owner.is_admin,
            is_active=owner.is_active,
            is_owner=owner.is_owner,
            place_count=len(places),
            total_bookings=total_bookings,
            created_at=owner.created_at,
            last_login=owner.updated_at
        )
        
        return AdminOwnerDetailsResponse(
            user=owner_response,
            places=places_data,
            total_places=len(places),
            total_bookings=total_bookings,
            total_services=total_services,
            bio_diamond_places=bio_diamond_places
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch owner details: {str(e)}"
        )

@router.put("/{owner_id}/toggle-status")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def toggle_owner_status(
    owner_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Toggle owner active status"""
    
    try:
        # Get owner
        result = await db.execute(
            select(User).where(
                and_(
                    User.id == owner_id,
                    User.user_type == "business_owner"
                )
            )
        )
        owner = result.scalar_one_or_none()
        
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Owner not found"
            )
        
        # Toggle status
        owner.is_active = not owner.is_active
        owner.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(owner)
        
        return {
            "message": f"Owner status updated to {'active' if owner.is_active else 'inactive'}",
            "is_active": owner.is_active
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle owner status: {str(e)}"
        )

@router.get("/{owner_id}/places")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_owner_places(
    owner_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all places for a specific owner"""
    
    try:
        # Verify owner exists
        result = await db.execute(
            select(User).where(
                and_(
                    User.id == owner_id,
                    User.user_type == "business_owner"
                )
            )
        )
        owner = result.scalar_one_or_none()
        
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Owner not found"
            )
        
        # Get places
        result = await db.execute(
            select(Place).where(Place.owner_id == owner_id).order_by(desc(Place.created_at))
        )
        places = result.scalars().all()
        
        # Build response with additional data
        places_data = []
        for place in places:
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
            
            places_data.append({
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
                "bookings_count": bookings_count,
                "services_count": services_count,
                "created_at": place.created_at
            })
        
        return {
            "owner_id": owner_id,
            "owner_name": owner.name,
            "places": places_data,
            "total_places": len(places)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch owner places: {str(e)}"
        )
