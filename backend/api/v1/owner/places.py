"""
Fixed owner places API that works with the existing database schema.
Uses the 'places' table instead of 'businesses' table.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from models.user import User
from models.place_existing import Place, PlaceImage
from schemas.place_existing import PlaceResponse, PlaceCreate, PlaceUpdate

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/", response_model=List[PlaceResponse])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_places(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all places owned by the current user"""
    result = await db.execute(
        select(Place).where(Place.owner_id == current_user.id, Place.is_active == True)
    )
    places = result.scalars().all()
    
    return [
        PlaceResponse(
            id=place.id,
            codigo=place.codigo,
            nome=place.nome,
            tipo=place.tipo,
            pais=place.pais,
            telefone=place.telefone,
            email=place.email,
            website=place.website,
            instagram=place.instagram,
            regiao=place.regiao,
            cidade=place.cidade,
            rua=place.rua,
            porta=place.porta,
            cod_postal=place.cod_postal,
            latitude=place.latitude,
            longitude=place.longitude,
            booking_enabled=place.booking_enabled,
            is_bio_diamond=place.is_bio_diamond,
            about=place.about,
            working_hours=place.get_working_hours(),
            created_at=place.created_at,
            updated_at=place.updated_at,
            owner_id=place.owner_id
        )
        for place in places
    ]


@router.get("/{place_id}", response_model=PlaceResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific place owned by the current user"""
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
    
    return PlaceResponse(
        id=place.id,
        codigo=place.codigo,
        nome=place.nome,
        tipo=place.tipo,
        pais=place.pais,
        telefone=place.telefone,
        email=place.email,
        website=place.website,
        instagram=place.instagram,
        regiao=place.regiao,
        cidade=place.cidade,
        rua=place.rua,
        porta=place.porta,
        cod_postal=place.cod_postal,
        latitude=place.latitude,
        longitude=place.longitude,
        location_type=place.location_type,
        coverage_radius=place.coverage_radius,
        booking_enabled=place.booking_enabled,
        is_bio_diamond=place.is_bio_diamond,
        about=place.about,
        working_hours=place.get_working_hours(),
        created_at=place.created_at,
        updated_at=place.updated_at,
        owner_id=place.owner_id
    )


@router.post("/", response_model=PlaceResponse, status_code=status.HTTP_201_CREATED)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_place(
    place_data: PlaceCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new place"""
    
    # Create new place
    place = Place(
        codigo=place_data.codigo,
        nome=place_data.nome,
        tipo=place_data.tipo,
        pais=place_data.pais,
        telefone=place_data.telefone,
        email=place_data.email,
        website=place_data.website,
        instagram=place_data.instagram,
        regiao=place_data.regiao,
        cidade=place_data.cidade,
        rua=place_data.rua,
        porta=place_data.porta,
        cod_postal=place_data.cod_postal,
        latitude=place_data.latitude,
        longitude=place_data.longitude,
        location_type=place_data.location_type or 'fixed',
        coverage_radius=place_data.coverage_radius,
        booking_enabled=place_data.booking_enabled,
        is_bio_diamond=place_data.is_bio_diamond,
        about=place_data.about,
        owner_id=current_user.id,
        is_active=True
    )
    
    # Set default working hours for new places
    default_working_hours = {
        "monday": {"available": True, "start": "09:00", "end": "17:00"},
        "tuesday": {"available": True, "start": "09:00", "end": "17:00"},
        "wednesday": {"available": True, "start": "09:00", "end": "17:00"},
        "thursday": {"available": True, "start": "09:00", "end": "17:00"},
        "friday": {"available": True, "start": "09:00", "end": "17:00"},
        "saturday": {"available": True, "start": "09:00", "end": "17:00"},
        "sunday": {"available": False, "start": "09:00", "end": "17:00"}
    }
    place.set_working_hours(default_working_hours)
    
    db.add(place)
    await db.commit()
    await db.refresh(place)
    
    return PlaceResponse(
        id=place.id,
        codigo=place.codigo,
        nome=place.nome,
        tipo=place.tipo,
        pais=place.pais,
        telefone=place.telefone,
        email=place.email,
        website=place.website,
        instagram=place.instagram,
        regiao=place.regiao,
        cidade=place.cidade,
        rua=place.rua,
        porta=place.porta,
        cod_postal=place.cod_postal,
        latitude=place.latitude,
        longitude=place.longitude,
        location_type=place.location_type,
        coverage_radius=place.coverage_radius,
        booking_enabled=place.booking_enabled,
        is_bio_diamond=place.is_bio_diamond,
        about=place.about,
        working_hours=place.get_working_hours(),
        created_at=place.created_at,
        updated_at=place.updated_at,
        owner_id=place.owner_id
    )


@router.put("/{place_id}", response_model=PlaceResponse)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def update_place(
    place_id: int,
    place_data: PlaceUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update a place owned by the current user"""
    
    # Get the place
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
    
    # Update fields
    update_data = place_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "working_hours" and value is not None:
            place.set_working_hours(value)
        elif hasattr(place, field):
            setattr(place, field, value)
    
    await db.commit()
    await db.refresh(place)
    
    return PlaceResponse(
        id=place.id,
        codigo=place.codigo,
        nome=place.nome,
        tipo=place.tipo,
        pais=place.pais,
        telefone=place.telefone,
        email=place.email,
        website=place.website,
        instagram=place.instagram,
        regiao=place.regiao,
        cidade=place.cidade,
        rua=place.rua,
        porta=place.porta,
        cod_postal=place.cod_postal,
        latitude=place.latitude,
        longitude=place.longitude,
        location_type=place.location_type,
        coverage_radius=place.coverage_radius,
        booking_enabled=place.booking_enabled,
        is_bio_diamond=place.is_bio_diamond,
        about=place.about,
        working_hours=place.get_working_hours(),
        created_at=place.created_at,
        updated_at=place.updated_at,
        owner_id=place.owner_id
    )


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def delete_place(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete a place owned by the current user"""
    
    # Get the place
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
    
    # Soft delete
    place.is_active = False
    await db.commit()


@router.get("/{place_id}/location")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_location(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get location data for a place"""
    
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
    
    return {
        "id": place.id,
        "latitude": place.latitude,
        "longitude": place.longitude,
        "address": {
            "rua": place.rua,
            "porta": place.porta,
            "cod_postal": place.cod_postal,
            "cidade": place.cidade,
            "regiao": place.regiao,
            "pais": place.pais
        }
    }


@router.post("/{place_id}/images")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def add_place_image(
    place_id: int,
    image_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Add an image to a place"""
    
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
    
    # Create place image record
    place_image = PlaceImage(
        place_id=place_id,
        image_url=image_data.get('image_url'),
        is_primary=image_data.get('is_primary', False),
        created_at=func.current_timestamp()
    )
    
    db.add(place_image)
    await db.commit()
    await db.refresh(place_image)
    
    return {
        "id": place_image.id,
        "place_id": place_image.place_id,
        "image_url": place_image.image_url,
        "is_primary": place_image.is_primary,
        "created_at": place_image.created_at
    }


@router.get("/{place_id}/images")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_images(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all images for a place"""
    
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
    
    # Get place images
    result = await db.execute(
        select(PlaceImage).where(PlaceImage.place_id == place_id)
    )
    images = result.scalars().all()
    
    return [
        {
            "id": img.id,
            "image_url": img.image_url,
            "is_primary": img.is_primary,
            "created_at": img.created_at
        }
        for img in images
    ]
