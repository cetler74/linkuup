"""
Fixed mobile places API that works with the existing database schema.
Uses the 'places' table instead of 'businesses' table.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_user
from core.config import settings
from models.user import User
from models.place_existing import Place, Service, PlaceService
from schemas.place_existing import PlaceResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/minimal", response_model=List[dict])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_places_minimal(
    tipo: Optional[str] = None,
    cidade: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get minimal places data for mobile app (lightweight response)"""
    query = select(Place).where(Place.is_active == True)
    
    # Apply filters
    if tipo:
        query = query.where(Place.tipo == tipo)
    
    if cidade:
        query = query.where(func.lower(Place.cidade) == func.lower(cidade))
    
    result = await db.execute(query)
    places = result.scalars().all()
    
    return [
        {
            "id": place.id,
            "nome": place.nome,
            "tipo": place.tipo,
            "cidade": place.cidade,
            "rua": place.rua,
            "telefone": place.telefone,
            "booking_enabled": place.booking_enabled,
            "is_bio_diamond": place.is_bio_diamond,
            "regiao": place.regiao
        }
        for place in places
    ]


@router.get("/{place_id}/details", response_model=PlaceResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_details(
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get full place details for mobile app"""
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
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
        booking_enabled=place.booking_enabled,
        is_bio_diamond=place.is_bio_diamond,
        about=place.about,
        created_at=place.created_at,
        updated_at=place.updated_at,
        owner_id=place.owner_id
    )


@router.get("/search", response_model=List[dict])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def search_places(
    q: str = Query(..., description="Search query"),
    tipo: Optional[str] = None,
    cidade: Optional[str] = None,
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Search places for mobile app"""
    
    # Build search query
    search_conditions = [
        Place.is_active == True,
        or_(
            func.lower(Place.nome).contains(func.lower(q)),
            func.lower(Place.cidade).contains(func.lower(q)),
            func.lower(Place.regiao).contains(func.lower(q))
        )
    ]
    
    if tipo:
        search_conditions.append(Place.tipo == tipo)
    
    if cidade:
        search_conditions.append(func.lower(Place.cidade) == func.lower(cidade))
    
    query = select(Place).where(and_(*search_conditions))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    places = result.scalars().all()
    
    return [
        {
            "id": place.id,
            "nome": place.nome,
            "tipo": place.tipo,
            "cidade": place.cidade,
            "rua": place.rua,
            "telefone": place.telefone,
            "booking_enabled": place.booking_enabled,
            "is_bio_diamond": place.is_bio_diamond,
            "regiao": place.regiao
        }
        for place in places
    ]


@router.get("/nearby", response_model=List[dict])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_nearby_places(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(5.0, description="Radius in kilometers"),
    tipo: Optional[str] = None,
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get places near a location for mobile app"""
    
    # Simple distance calculation (for production, use PostGIS or similar)
    # This is a basic implementation - in production you'd use proper geospatial queries
    query = select(Place).where(
        and_(
            Place.is_active == True,
            Place.latitude.isnot(None),
            Place.longitude.isnot(None)
        )
    )
    
    if tipo:
        query = query.where(Place.tipo == tipo)
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    places = result.scalars().all()
    
    # Filter by distance (basic implementation)
    nearby_places = []
    for place in places:
        if place.latitude and place.longitude:
            # Simple distance calculation (not accurate for large distances)
            distance = ((place.latitude - lat) ** 2 + (place.longitude - lng) ** 2) ** 0.5
            if distance <= radius / 111.0:  # Rough conversion: 1 degree ≈ 111 km
                nearby_places.append({
                    "id": place.id,
                    "nome": place.nome,
                    "tipo": place.tipo,
                    "cidade": place.cidade,
                    "rua": place.rua,
                    "telefone": place.telefone,
                    "booking_enabled": place.booking_enabled,
                    "is_bio_diamond": place.is_bio_diamond,
                    "regiao": place.regiao,
                    "latitude": place.latitude,
                    "longitude": place.longitude
                })
    
    return nearby_places


@router.get("/{place_id}/employees")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_employees(
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get employees for a specific place - mobile endpoint (no sensitive data)"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get employees (public data only - no email/phone)
    from models.place_existing import PlaceEmployee
    from schemas.place_employee import PlaceEmployeePublicResponse
    
    result = await db.execute(
        select(PlaceEmployee).where(
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True
        )
    )
    employees = result.scalars().all()
    
    return [
        PlaceEmployeePublicResponse(
            id=employee.id,
            place_id=employee.place_id,
            name=employee.name,
            role=employee.role,
            specialty=employee.specialty,
            color_code=employee.color_code,
            photo_url=employee.photo_url,
            is_active=employee.is_active,
            working_hours=employee.get_working_hours(),
            created_at=employee.created_at,
            updated_at=employee.updated_at
        )
        for employee in employees
    ]


@router.get("/{place_id}/services")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_services(
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get services for a specific place"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get services for this place
    query = select(Service).join(PlaceService).where(
        PlaceService.place_id == place_id
    )
    
    result = await db.execute(query)
    services = result.scalars().all()
    
    return [
        {
            "id": service.id,
            "name": service.name,
            "category": service.category,
            "description": service.description,
            "is_bio_diamond": service.is_bio_diamond,
            "updated_at": service.updated_at
        }
        for service in services
    ]
