"""
Fixed owner services API that works with the existing database schema.
Uses the 'places' and 'services' tables instead of 'businesses' table.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from models.user import User
from models.place_existing import Place, Service, PlaceService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class ServiceCreate(BaseModel):
    """Schema for creating a new service"""
    name: str
    description: str = None
    category: str = "general"
    is_bio_diamond: bool = False
    price: float = None  # Allow float for price
    duration: int = None
    is_bookable: bool = True


class ServiceUpdate(BaseModel):
    """Schema for updating a service"""
    name: str = None
    description: str = None
    category: str = None
    is_bio_diamond: bool = None
    # Frontend sends these fields but they're not in the database model yet
    price: float = None  # Allow float for price
    duration: int = None
    is_bookable: bool = None

@router.get("/places/{place_id}/services")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_services(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all services for a specific place"""
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
    
    # Get services for this place with price and duration from PlaceService
    query = select(Service, PlaceService).join(PlaceService).where(
        PlaceService.place_id == place_id
    )
    
    result = await db.execute(query)
    service_records = result.all()
    
    return [
        {
            "id": service.id,
            "name": service.name,
            "category": service.category,
            "description": service.description,
            "is_bio_diamond": service.is_bio_diamond,
            "price": place_service.price,
            "duration": place_service.duration,
            "is_available": place_service.is_available,
            "updated_at": service.updated_at
        }
        for service, place_service in service_records
    ]


@router.post("/places/{place_id}/services")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_WRITE)
async def create_place_service(
    place_id: int,
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new service for a specific place"""
    try:
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
        
        # Create the service
        new_service = Service(
            name=service_data.name,
            description=service_data.description,
            category=service_data.category,
            is_bio_diamond=service_data.is_bio_diamond
        )
        
        db.add(new_service)
        await db.flush()  # Get the service ID
        
        # Create the place-service relationship
        place_service = PlaceService(
            place_id=place_id,
            service_id=new_service.id,
            price=service_data.price,  # Directly use the float value
            duration=service_data.duration,
            is_available=service_data.is_bookable
        )
        
        db.add(place_service)
        await db.commit()
        await db.refresh(new_service)
        
        return {
            "id": new_service.id,
            "message": "Service created successfully"
        }
    except Exception as e:
        print(f"Error creating service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{service_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_service(
    service_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific service"""
    
    # Get the service
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify the service belongs to a place owned by the current user
    place_service_result = await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_services = place_service_result.scalars().all()
    
    # Check if any of the places using this service are owned by the current user
    place_ids = [ps.place_id for ps in place_services]
    if place_ids:
        places_result = await db.execute(
            select(Place).where(
                Place.id.in_(place_ids),
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        owned_places = places_result.scalars().all()
        
        if not owned_places:
            raise HTTPException(status_code=403, detail="Service not found or access denied")
    
    return {
        "id": service.id,
        "name": service.name,
        "category": service.category,
        "description": service.description,
        "is_bio_diamond": service.is_bio_diamond,
        "updated_at": service.updated_at
    }


@router.get("/{service_id}/employees")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_service_employees(
    service_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get employees for a specific service"""
    
    # Get the service
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify the service belongs to a place owned by the current user
    place_service_result = await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_services = place_service_result.scalars().all()
    
    # Check if any of the places using this service are owned by the current user
    place_ids = [ps.place_id for ps in place_services]
    if place_ids:
        places_result = await db.execute(
            select(Place).where(
                Place.id.in_(place_ids),
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        owned_places = places_result.scalars().all()
        
        if not owned_places:
            raise HTTPException(status_code=403, detail="Service not found or access denied")
    
    # For now, return empty list since we don't have employee data
    # This can be expanded when employee data is available
    return {"employees": []}


@router.get("/{service_id}/employees/{employee_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_service_employee(
    service_id: int,
    employee_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific employee for a service"""
    
    # Get the service
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify the service belongs to a place owned by the current user
    place_service_result = await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_services = place_service_result.scalars().all()
    
    # Check if any of the places using this service are owned by the current user
    place_ids = [ps.place_id for ps in place_services]
    if place_ids:
        places_result = await db.execute(
            select(Place).where(
                Place.id.in_(place_ids),
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        owned_places = places_result.scalars().all()
        
        if not owned_places:
            raise HTTPException(status_code=403, detail="Service not found or access denied")
    
    # For now, return empty response since we don't have employee data
    # This can be expanded when employee data is available
    return {"employee": None}


@router.put("/{service_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_WRITE)
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update a specific service"""
    
    # Get the service
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify the service belongs to a place owned by the current user
    place_service_result = await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_services = place_service_result.scalars().all()
    
    # Check if any of the places using this service are owned by the current user
    place_ids = [ps.place_id for ps in place_services]
    if place_ids:
        places_result = await db.execute(
            select(Place).where(
                Place.id.in_(place_ids),
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        owned_places = places_result.scalars().all()
        
        if not owned_places:
            raise HTTPException(status_code=403, detail="Service not found or access denied")
    
    # Update the service with provided data
    update_data = service_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    await db.commit()
    await db.refresh(service)
    
    return {"message": "Service updated successfully"}


@router.delete("/{service_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_WRITE)
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific service"""
    
    # Get the service
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify the service belongs to a place owned by the current user
    place_service_result = await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_services = place_service_result.scalars().all()
    
    # Check if any of the places using this service are owned by the current user
    place_ids = [ps.place_id for ps in place_services]
    if place_ids:
        places_result = await db.execute(
            select(Place).where(
                Place.id.in_(place_ids),
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        owned_places = places_result.scalars().all()
        
        if not owned_places:
            raise HTTPException(status_code=403, detail="Service not found or access denied")
    
    # Delete the place-service relationships first
    await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_service_result = await db.execute(
        select(PlaceService).where(PlaceService.service_id == service_id)
    )
    place_services_to_delete = place_service_result.scalars().all()
    
    for place_service in place_services_to_delete:
        await db.delete(place_service)
    
    # Delete the service
    await db.delete(service)
    await db.commit()
    
    return {"message": "Service deleted successfully"}
