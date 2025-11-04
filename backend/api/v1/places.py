"""
Fixed places API that works with the existing database schema.
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
from core.config import settings
from models.place_existing import Place, Service, PlaceService, PlaceImage, Review, Booking, PlaceClosedPeriod, PlaceEmployee, PlaceEmployeeTimeOff
from models.campaign import Campaign, CampaignPlace, CampaignService as CampaignServiceModel
from models.rewards import CustomerReward, RewardTransaction, RewardSetting
from schemas.place_existing import PlaceResponse, PlaceImageResponse, PlaceServiceResponse, PlaceEmployeeResponse
from schemas.place_employee import PlaceEmployeePublicResponse
from services.campaign_service import CampaignService
from schemas.campaign import ActiveCampaignResponse, ServicePriceCalculation
from pydantic import BaseModel, EmailStr
from datetime import datetime, date, time

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

def _safe_get_working_hours(obj):
    """Safely get working hours from an object, handling all edge cases"""
    try:
        if hasattr(obj, 'get_working_hours'):
            return obj.get_working_hours()
        elif hasattr(obj, 'working_hours'):
            working_hours = obj.working_hours
            if working_hours is None:
                return {}
            if isinstance(working_hours, str):
                import json
                try:
                    parsed = json.loads(working_hours)
                    return parsed if isinstance(parsed, dict) else {}
                except (json.JSONDecodeError, TypeError):
                    return {}
            if isinstance(working_hours, dict):
                return working_hours
            return {}
        return {}
    except Exception as e:
        print(f"Error getting working hours: {e}")
        return {}

@router.get("/debug")
async def debug_places(db: AsyncSession = Depends(get_db)):
    """Debug endpoint to test basic functionality"""
    try:
        result = await db.execute(select(Place).where(Place.is_active == True).limit(2))
        places = result.scalars().all()
        return {
            "count": len(places),
            "places": [
                {
                    "id": place.id,
                    "nome": place.nome,
                    "tipo": place.tipo
                }
                for place in places
            ]
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

@router.get("/{place_id}/simple")
async def get_place_simple(
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific place by ID - simplified version without campaigns"""
    try:
        result = await db.execute(
            select(Place).where(Place.id == place_id, Place.is_active == True)
        )
        place = result.scalar_one_or_none()
        
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")
        
        return {
            "id": place.id,
            "nome": place.nome,
            "tipo": place.tipo,
            "cidade": place.cidade,
            "is_active": place.is_active
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

@router.get("/", response_model=List[PlaceResponse])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_places(
    search: Optional[str] = None,
    tipo: Optional[str] = None,
    cidade: Optional[str] = None,
    regiao: Optional[str] = None,
    booking_enabled: Optional[bool] = None,
    is_bio_diamond: Optional[bool] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    page: Optional[int] = Query(None, ge=1),
    per_page: Optional[int] = Query(None, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get all public places with filtering and pagination"""
    
    try:
        # Map page/per_page to offset/limit when provided
        if page is not None and per_page is not None:
            offset = (page - 1) * per_page
            limit = per_page
        
        # Build query using existing 'places' table
        query = select(Place).where(Place.is_active == True)
        
        # Apply search filter if provided
        if search and search.strip():
            search_term = search.strip().lower()
            query = query.where(
                or_(
                    func.lower(Place.nome).contains(search_term),
                    func.lower(Place.cidade).contains(search_term),
                    func.lower(Place.regiao).contains(search_term),
                    func.lower(Place.tipo).contains(search_term)
                )
            )
        
        # Apply filters using existing column names
        if tipo:
            query = query.where(Place.tipo == tipo)
        
        if cidade and cidade.strip():
            query = query.where(func.lower(Place.cidade) == func.lower(cidade.strip()))
        
        if regiao and regiao.strip():
            query = query.where(func.lower(Place.regiao) == func.lower(regiao.strip()))
        
        if booking_enabled is not None:
            query = query.where(Place.booking_enabled == booking_enabled)
        
        if is_bio_diamond is not None:
            query = query.where(Place.is_bio_diamond == is_bio_diamond)
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        places = result.scalars().all()
        
        # Fetch images for each place
        place_responses = []
        for place in places:
            # Get images for this place
            images_result = await db.execute(
                select(PlaceImage).where(PlaceImage.place_id == place.id)
            )
            images = images_result.scalars().all()
            
            place_responses.append(PlaceResponse(
                id=place.id,
                codigo=place.codigo,
                nome=place.nome,
                slug=getattr(place, 'slug', None) or None,  # Handle missing slug column
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
                created_at=place.created_at,
                updated_at=place.updated_at,
                owner_id=place.owner_id,
                images=[
                    PlaceImageResponse(
                        id=img.id,
                        image_url=img.image_url,
                        image_alt=img.alt_text,
                        is_primary=img.is_primary,
                        created_at=img.created_at
                    )
                    for img in images
                ]
            ))
        
        return place_responses
    except Exception as e:
        print(f"ERROR in get_places: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search", response_model=List[PlaceResponse])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def search_places(
    q: str = Query(..., description="Search query"),
    tipo: Optional[str] = None,
    cidade: Optional[str] = None,
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Search places with advanced filtering"""
    
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
    
    # Fetch images for each place
    place_responses = []
    for place in places:
        # Get images for this place
        images_result = await db.execute(
            select(PlaceImage).where(PlaceImage.place_id == place.id)
        )
        images = images_result.scalars().all()
        
        place_responses.append(PlaceResponse(
            id=place.id,
            codigo=place.codigo,
            nome=place.nome,
            slug=getattr(place, 'slug', None) or None,  # Handle missing slug column
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
            created_at=place.created_at,
            updated_at=place.updated_at,
            owner_id=place.owner_id,
            images=[
                PlaceImageResponse(
                    id=img.id,
                    image_url=img.image_url,
                    image_alt=img.alt_text,
                    is_primary=img.is_primary,
                    created_at=img.created_at
                )
                for img in images
            ]
        ))
    
    return place_responses


@router.get("/cities/list")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_cities_list(
    db: AsyncSession = Depends(get_db)
):
    """Get list of all cities with active places"""
    
    query = select(Place.cidade).where(
        and_(
            Place.is_active == True,
            Place.cidade.isnot(None),
            Place.cidade != ""
        )
    ).distinct().order_by(Place.cidade)
    
    result = await db.execute(query)
    cities = [row[0] for row in result.fetchall()]
    
    return {"cities": cities}


@router.get("/sectors/list")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_sectors_list(
    db: AsyncSession = Depends(get_db)
):
    """Get list of all sectors/types with active places"""
    
    query = select(Place.tipo).where(
        and_(
            Place.is_active == True,
            Place.tipo.isnot(None),
            Place.tipo != ""
        )
    ).distinct().order_by(Place.tipo)
    
    result = await db.execute(query)
    sectors = [row[0] for row in result.fetchall()]
    
    return {"sectors": sectors}


@router.get("/{slug}", response_model=PlaceResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific place by slug or ID"""
    try:
        place = None
        
        # First, try to get the place by slug (if slug column exists)
        try:
            result = await db.execute(
                select(Place).where(Place.slug == slug, Place.is_active == True)
            )
            place = result.scalar_one_or_none()
        except Exception:
            # If slug column doesn't exist, continue to try ID lookup
            pass
        
        # If no place found by slug, try to parse as ID for backward compatibility
        if not place:
            try:
                place_id = int(slug)
                result = await db.execute(
                    select(Place).where(Place.id == place_id, Place.is_active == True)
                )
                place = result.scalar_one_or_none()
            except (ValueError, TypeError):
                # slug is not a valid integer, that's fine
                place = None
        
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")
        
        # Refresh the place object to ensure all columns are loaded
        # This is especially important for JSON columns with asyncpg
        try:
            await db.refresh(place)
        except Exception as refresh_error:
            print(f"Warning: Could not refresh place object: {refresh_error}")
            # Continue without refresh - columns should already be loaded
        
        # Debug: Check working_hours value before calling get_working_hours()
        # This helps identify if the issue is with retrieval or with the method
        if hasattr(place, 'working_hours'):
            print(f"DEBUG: place.working_hours type: {type(place.working_hours)}, value: {place.working_hours}")
        
        # Get images for this place
        images_result = await db.execute(
            select(PlaceImage).where(PlaceImage.place_id == place.id)
        )
        images = images_result.scalars().all()
        
        # Get services for this place
        from models.place_existing import PlaceService, Service
        services_result = await db.execute(
            select(Service, PlaceService).join(
                PlaceService, Service.id == PlaceService.service_id
            ).where(PlaceService.place_id == place.id)
        )
        services_data = services_result.all()
        
        # Get employees for this place
        from models.place_existing import PlaceEmployee
        employees_result = await db.execute(
            select(PlaceEmployee).where(
                PlaceEmployee.place_id == place.id,
                PlaceEmployee.is_active == True
            )
        )
        employees = employees_result.scalars().all()
        
        # Get review summary for this place
        review_summary = {"average_rating": 0.0, "total_reviews": 0}
        try:
            # Get review statistics
            review_stats_result = await db.execute(
                select(
                    func.avg(Review.rating).label('average_rating'),
                    func.count(Review.id).label('total_reviews')
                ).where(Review.place_id == place.id)
            )
            review_stats = review_stats_result.first()
            
            if review_stats and review_stats.total_reviews > 0:
                review_summary = {
                    "average_rating": float(review_stats.average_rating) if review_stats.average_rating else 0.0,
                    "total_reviews": review_stats.total_reviews
                }
        except Exception as e:
            print(f"Error fetching review summary: {e}")
            # Continue with default values

        # Get active campaigns for this place - simplified to avoid lazy loading issues
        campaign_responses = []
        try:
            # Get campaigns directly without using the service to avoid lazy loading
            campaigns_result = await db.execute(
                select(Campaign).where(
                    Campaign.status == 'active'
                )
            )
            active_campaigns = campaigns_result.scalars().all()
            
            # Filter campaigns that apply to this place
            place_campaigns = []
            for campaign in active_campaigns:
                # Check if this campaign applies to this place
                campaign_place_result = await db.execute(
                    select(CampaignPlace).where(
                        CampaignPlace.campaign_id == campaign.id,
                        CampaignPlace.place_id == place.id
                    )
                )
                if campaign_place_result.scalar_one_or_none():
                    place_campaigns.append(campaign)
            
            # Convert campaigns to response format
            for campaign in place_campaigns:
                from datetime import datetime
                now = datetime.utcnow()
                days_remaining = 0
                
                if campaign.config and 'end_datetime' in campaign.config:
                    try:
                        end_datetime = datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00'))
                        days_remaining = (end_datetime - now).days
                    except (ValueError, TypeError):
                        days_remaining = 0
                
                # Extract campaign details from config
                config = campaign.config or {}
                
                campaign_response = ActiveCampaignResponse(
                    id=campaign.id,
                    name=campaign.name,
                    banner_message=config.get('banner_message', ''),
                    campaign_type=campaign.type,
                    end_datetime=datetime.fromisoformat(config['end_datetime'].replace('Z', '+00:00')) if config.get('end_datetime') else None,
                    discount_type=config.get('discount_type'),
                    discount_value=config.get('discount_value'),
                    rewards_multiplier=config.get('rewards_multiplier'),
                    rewards_bonus_points=config.get('rewards_bonus_points'),
                    free_service_type=config.get('free_service_type'),
                    buy_quantity=config.get('buy_quantity'),
                    get_quantity=config.get('get_quantity'),
                    days_remaining=days_remaining
                )
                
                campaign_responses.append(campaign_response)
        except Exception as e:
            print(f"Error getting campaigns: {e}")
            campaign_responses = []
        
        # Process services with basic pricing (without complex campaign calculations for now)
        services_with_prices = []
        for service, place_service in services_data:
            service_response = PlaceServiceResponse(
                id=service.id,
                name=service.name,
                category=service.category,
                description=service.description,
                price=place_service.price,
                duration=place_service.duration,
                is_bio_diamond=service.is_bio_diamond,
                is_available=place_service.is_available,
                updated_at=service.updated_at
            )
            services_with_prices.append(service_response)
        
        return PlaceResponse(
            id=place.id,
            codigo=place.codigo,
            nome=place.nome,
            slug=getattr(place, 'slug', None) or None,  # Handle missing slug column
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
            working_hours=_safe_get_working_hours(place),
            created_at=place.created_at,
            updated_at=place.updated_at,
            owner_id=place.owner_id,
            images=[
                PlaceImageResponse(
                    id=img.id,
                    image_url=img.image_url,
                    image_alt=img.alt_text,
                    is_primary=img.is_primary,
                    created_at=img.created_at
                )
                for img in images
            ],
            services=services_with_prices,
            active_campaigns=campaign_responses,
            employees=[
                PlaceEmployeePublicResponse(
                    id=emp.id,
                    place_id=emp.place_id,
                    name=emp.name,
                    role=emp.role,
                    specialty=emp.specialty,
                    color_code=emp.color_code,
                    photo_url=emp.photo_url,
                    is_active=emp.is_active,
                    working_hours=_safe_get_working_hours(emp),
                    created_at=emp.created_at,
                    updated_at=emp.updated_at
                )
                for emp in employees
            ],
            reviews=review_summary
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in get_place: {e}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
@router.get("/{place_id}/employees")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_employees(
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get employees for a specific place - public endpoint (no sensitive data)"""
    
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


@router.get("/{place_id}/employees/by-service/{service_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_employees_by_service(
    place_id: int,
    service_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get employees who can perform a specific service at a place"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Verify service exists and belongs to this place
    from models.place_existing import PlaceService
    result = await db.execute(
        select(PlaceService).where(
            PlaceService.place_id == place_id,
            PlaceService.service_id == service_id,
            PlaceService.is_available == True
        )
    )
    place_service = result.scalar_one_or_none()
    
    if not place_service:
        raise HTTPException(status_code=404, detail="Service not found or not available at this place")
    
    # Get employees who can perform this service
    from models.place_existing import EmployeeService, PlaceEmployee
    result = await db.execute(
        select(PlaceEmployee).join(EmployeeService).where(
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True,
            EmployeeService.service_id == service_id,
            EmployeeService.employee_id == PlaceEmployee.id
        )
    )
    employees = result.scalars().all()
    
    return [
        {
            "id": employee.id,
            "place_id": employee.place_id,
            "name": employee.name,
            "role": employee.role,
            "specialty": employee.specialty,
            "color_code": employee.color_code,
            "photo_url": employee.photo_url,
            "is_active": employee.is_active,
            "working_hours": employee.get_working_hours(),
            "created_at": employee.created_at,
            "updated_at": employee.updated_at
        }
        for employee in employees
    ]


@router.get("/{place_id}/services/by-employee/{employee_id}")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_services_by_employee(
    place_id: int,
    employee_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get services that a specific employee can perform at a place"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Verify employee exists and belongs to this place
    from models.place_existing import PlaceEmployee
    result = await db.execute(
        select(PlaceEmployee).where(
            PlaceEmployee.id == employee_id,
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found or not available at this place")
    
    # Get services that this employee can perform
    from models.place_existing import EmployeeService, PlaceService
    result = await db.execute(
        select(Service, PlaceService).join(
            EmployeeService, Service.id == EmployeeService.service_id
        ).join(
            PlaceService, Service.id == PlaceService.service_id
        ).where(
            EmployeeService.employee_id == employee_id,
            PlaceService.place_id == place_id,
            PlaceService.is_available == True
        )
    )
    services_data = result.all()
    
    return [
        {
            "id": service.id,
            "name": service.name,
            "category": service.category,
            "description": service.description,
            "price": place_service.price,
            "duration": place_service.duration,
            "is_bio_diamond": service.is_bio_diamond,
            "is_available": place_service.is_available,
            "updated_at": service.updated_at
        }
        for service, place_service in services_data
    ]


@router.get("/{place_id}/availability")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_availability(
    place_id: int,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    service_id: Optional[int] = Query(None, description="Optional service ID to filter by"),
    employee_id: Optional[int] = Query(None, description="Optional employee ID to check availability"),
    db: AsyncSession = Depends(get_db)
):
    """Get available time slots for a place on a specific date"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Parse date
    from datetime import datetime, date as date_type
    try:
        if isinstance(date, date_type):
            check_date = date
        else:
            # Ensure date is a string
            date_str = str(date)
            check_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Check place closed periods (full-day closures)
    closed_query = select(PlaceClosedPeriod).where(
        PlaceClosedPeriod.place_id == place_id,
        PlaceClosedPeriod.status == 'active',
        PlaceClosedPeriod.start_date <= check_date,
        PlaceClosedPeriod.end_date >= check_date
    )
    result = await db.execute(closed_query)
    closures = result.scalars().all()
    # Also consider recurring yearly closures
    if not closures:
        recur_query = select(PlaceClosedPeriod).where(
            PlaceClosedPeriod.place_id == place_id,
            PlaceClosedPeriod.status == 'active',
            PlaceClosedPeriod.is_recurring == True
        )
        recur_result = await db.execute(recur_query)
        recurring = recur_result.scalars().all()
        for c in recurring:
            if c.is_active_on_date(check_date):
                closures.append(c)
    if closures:
        # If any closure applies, block the entire day
        return {
            "place_id": place_id,
            "date": date,
            "service_id": service_id,
            "time_slots": [],
            "available_slots": [],
            "is_available": False,
            "reason": "Place is closed"
        }

    # Get working hours for the place
    working_hours = place.get_working_hours()
    
    # Get day of week (0=Monday, 6=Sunday)
    weekday = check_date.weekday()
    day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    day_key = day_names[weekday]
    
    # Check if place is open on this day
    day_hours = working_hours.get(day_key, {})
    is_open = day_hours.get('available', False)
    
    if not is_open:
        return {
            "place_id": place_id,
            "date": date,
            "service_id": service_id,
            "time_slots": [],
            "available_slots": [],
            "is_available": False,
            "reason": f"Place is closed on {day_key.title()}"
        }
    
    # Get opening and closing times
    start_time = day_hours.get('start', '09:00')
    end_time = day_hours.get('end', '17:00')
    
    # Generate time slots based on working hours
    from datetime import time, timedelta
    
    def time_to_minutes(time_str):
        """Convert time string (HH:MM) to minutes since midnight"""
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    
    def minutes_to_time(minutes):
        """Convert minutes since midnight to time string (HH:MM)"""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"
    
    # Generate 30-minute intervals between start and end time
    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    
    time_slots = []
    current_minutes = start_minutes
    while current_minutes < end_minutes:
        time_slots.append(minutes_to_time(current_minutes))
        current_minutes += 30  # 30-minute intervals
    
    # Helper function to map any booking time to its containing slot
    # A slot covers a 30-minute period: e.g., 09:00 slot covers 09:00-09:29:59
    def map_time_to_slot(booking_time_str: str) -> str:
        """Map any booking time to its containing slot by rounding down to nearest 30-minute interval"""
        try:
            hours, minutes = map(int, booking_time_str.split(':'))
            # Round down minutes to nearest 30-minute interval
            slot_minutes = (minutes // 30) * 30
            return f"{hours:02d}:{slot_minutes:02d}"
        except (ValueError, AttributeError):
            # If time format is invalid, return as-is for backward compatibility
            return booking_time_str
    
    # Check if place has employees
    result = await db.execute(
        select(PlaceEmployee).where(
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True
        )
    )
    employees = result.scalars().all()
    
    if not employees:
        return {
            "place_id": place_id,
            "date": date,
            "service_id": service_id,
            "time_slots": time_slots,
            "available_slots": [],
            "is_available": False,
            "reason": "No employees found for this place"
        }
    
    # Get existing bookings for the date to check conflicts
    # Use the main bookings table (not business_bookings which is empty)
    from models.place_existing import Booking
    from datetime import datetime, date as date_type
    
    # Convert date to date object for comparison
    if isinstance(date, date_type):
        check_date_obj = date
    else:
        check_date_obj = datetime.strptime(str(date), "%Y-%m-%d").date()
    
    # Query the main bookings table
    booking_query = select(Booking).where(
        Booking.place_id == place_id,
        Booking.booking_date == check_date_obj,
        Booking.status.in_(["pending", "confirmed"])
    )
    
    result = await db.execute(booking_query)
    existing_bookings = result.scalars().all()
    
    # Get booked time slots (map any booking time to its containing slot)
    booked_times = set()
    for booking in existing_bookings:
        if booking.booking_time:
            time_str = booking.booking_time.strftime("%H:%M")
            mapped_slot = map_time_to_slot(time_str)
            # Only add if the mapped slot exists in time_slots
            if mapped_slot in time_slots:
                booked_times.add(mapped_slot)
    
    # If employee_id is provided, only remove slots booked or time-off by that specific employee
    if employee_id:
        # Get bookings for the specific employee only
        employee_booking_query = select(Booking).where(
            Booking.place_id == place_id,
            Booking.booking_date == check_date_obj,
            Booking.employee_id == employee_id,
            Booking.status.in_(["pending", "confirmed"])
        )
        result = await db.execute(employee_booking_query)
        employee_bookings = result.scalars().all()
        
        # Get slots booked by this specific employee (map any booking time to its containing slot)
        employee_booked_times = set()
        for booking in employee_bookings:
            if booking.booking_time:
                time_str = booking.booking_time.strftime("%H:%M")
                mapped_slot = map_time_to_slot(time_str)
                # Only add if the mapped slot exists in time_slots
                if mapped_slot in time_slots:
                    employee_booked_times.add(mapped_slot)
        
        # Check time-off for this employee
        to_query = select(PlaceEmployeeTimeOff).where(
            PlaceEmployeeTimeOff.place_id == place_id,
            PlaceEmployeeTimeOff.employee_id == employee_id,
            PlaceEmployeeTimeOff.status == 'approved',
            PlaceEmployeeTimeOff.start_date <= check_date,
            PlaceEmployeeTimeOff.end_date >= check_date
        )
        to_result = await db.execute(to_query)
        timeoffs = to_result.scalars().all()
        # Include recurring
        recur_to_query = select(PlaceEmployeeTimeOff).where(
            PlaceEmployeeTimeOff.place_id == place_id,
            PlaceEmployeeTimeOff.employee_id == employee_id,
            PlaceEmployeeTimeOff.status == 'approved',
            PlaceEmployeeTimeOff.is_recurring == True
        )
        recur_to_res = await db.execute(recur_to_query)
        recurring_timeoffs = recur_to_res.scalars().all()
        for t in recurring_timeoffs:
            if t.is_active_on_date(check_date):
                timeoffs.append(t)

        # Determine off slots
        employee_off_full_day = any(t.is_full_day for t in timeoffs)
        employee_off_am = any((not t.is_full_day and t.half_day_period == 'AM') for t in timeoffs)
        employee_off_pm = any((not t.is_full_day and t.half_day_period == 'PM') for t in timeoffs)

        def is_slot_off(slot_str: str) -> bool:
            if employee_off_full_day:
                return True
            hours, minutes = map(int, slot_str.split(':'))
            if employee_off_am and (hours < 12):
                return True
            if employee_off_pm and (hours >= 12):
                return True
            return False

        # Filter out slots booked or off for this employee
        available_slots = [slot for slot in time_slots if slot not in employee_booked_times and not is_slot_off(slot)]
    else:
        # If no employee specified, show slots as available if ANY employee is available
        # Filter out slots where ALL employees are booked
        available_slots = []
        
        # Preload time-off per employee
        employee_timeoff_map = {}
        emp_ids = [emp.id for emp in employees]
        if emp_ids:
            to_query = select(PlaceEmployeeTimeOff).where(
                PlaceEmployeeTimeOff.place_id == place_id,
                PlaceEmployeeTimeOff.employee_id.in_(emp_ids),
                PlaceEmployeeTimeOff.status == 'approved',
                PlaceEmployeeTimeOff.start_date <= check_date,
                PlaceEmployeeTimeOff.end_date >= check_date
            )
            to_result = await db.execute(to_query)
            for t in to_result.scalars().all():
                employee_timeoff_map.setdefault(t.employee_id, []).append(t)
            recur_query = select(PlaceEmployeeTimeOff).where(
                PlaceEmployeeTimeOff.place_id == place_id,
                PlaceEmployeeTimeOff.employee_id.in_(emp_ids),
                PlaceEmployeeTimeOff.status == 'approved',
                PlaceEmployeeTimeOff.is_recurring == True
            )
            recur_res = await db.execute(recur_query)
            for t in recur_res.scalars().all():
                if t.is_active_on_date(check_date):
                    employee_timeoff_map.setdefault(t.employee_id, []).append(t)

        for slot in time_slots:
            # Check if at least one employee is available at this time slot
            slot_available = False
            
            for employee in employees:
                # Check if this employee is booked at this specific slot
                # Map any booking time to its containing slot
                employee_booked = False
                for booking in existing_bookings:
                    if booking.employee_id == employee.id and booking.booking_time:
                        booking_time_str = booking.booking_time.strftime("%H:%M")
                        mapped_slot = map_time_to_slot(booking_time_str)
                        if mapped_slot == slot:
                            employee_booked = True
                            break
                
                # Check time-off for this employee at this slot
                def is_slot_off_for_employee(emp_id: int, slot_str: str) -> bool:
                    tos = employee_timeoff_map.get(emp_id, [])
                    if not tos:
                        return False
                    if any(t.is_full_day for t in tos):
                        return True
                    hours, minutes = map(int, slot_str.split(':'))
                    if any((not t.is_full_day and t.half_day_period == 'AM') for t in tos) and hours < 12:
                        return True
                    if any((not t.is_full_day and t.half_day_period == 'PM') for t in tos) and hours >= 12:
                        return True
                    return False

                # If this employee is not booked and not off, the slot is available
                if not employee_booked and not is_slot_off_for_employee(employee.id, slot):
                    slot_available = True
                    break
            
            if slot_available:
                available_slots.append(slot)
    
    # Campaign data will be fetched separately by the frontend
    slots_with_campaigns = {}
    
    # booked_times and employee_booked_times are already mapped to slots
    # Just convert to sorted list for the response
    booked_slots = sorted(list(employee_booked_times if employee_id else booked_times))
    
    return {
        "place_id": place_id,
        "date": date,
        "service_id": service_id,
        "time_slots": time_slots,
        "available_slots": available_slots,
        "is_available": len(available_slots) > 0,
        "available_employees": [emp.id for emp in employees],
        "booked_slots": booked_slots,
        "slots_with_campaigns": slots_with_campaigns
    }


@router.get("/{place_id}/reviews")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_reviews(
    place_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get reviews for a specific place"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get reviews for this place with pagination
    offset = (page - 1) * per_page
    query = select(Review).where(Review.place_id == place_id).order_by(Review.created_at.desc())
    query = query.offset(offset).limit(per_page)
    
    result = await db.execute(query)
    reviews = result.scalars().all()
    
    # Get total count for pagination
    count_query = select(func.count(Review.id)).where(Review.place_id == place_id)
    count_result = await db.execute(count_query)
    total_reviews = count_result.scalar()
    
    # Calculate pagination info
    total_pages = (total_reviews + per_page - 1) // per_page
    
    return {
        "reviews": [
            {
                "id": review.id,
                "customer_name": review.customer_name,
                "rating": review.rating,
                "title": review.title,
                "comment": review.comment,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "is_verified": review.is_verified
            }
            for review in reviews
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total_reviews,
            "pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@router.post("/{place_id}/reviews")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_place_review(
    place_id: int,
    review_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Create a new review for a place"""
    
    # Verify place exists
    result = await db.execute(
        select(Place).where(Place.id == place_id, Place.is_active == True)
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Create new review
    review = Review(
        place_id=place_id,
        customer_name=review_data.get('customer_name'),
        customer_email=review_data.get('customer_email', ''),
        rating=review_data.get('rating'),
        title=review_data.get('title'),
        comment=review_data.get('comment'),
        is_verified=False
    )
    
    db.add(review)
    await db.commit()
    await db.refresh(review)
    
    return {
        "id": review.id,
        "customer_name": review.customer_name,
        "rating": review.rating,
        "title": review.title,
        "comment": review.comment,
        "created_at": review.created_at.isoformat() if review.created_at else None,
        "is_verified": review.is_verified
    }


# Booking schemas
class BookingCreate(BaseModel):
    """Schema for creating a booking"""
    salon_id: int
    service_ids: List[int]  # Changed to support multiple services
    employee_id: int  # Required - every booking must be associated with an employee
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    booking_date: str  # YYYY-MM-DD format
    booking_time: str  # HH:MM format
    any_employee_selected: Optional[bool] = False  # New field to track if customer selected "any employee"
    # Campaign fields - optional, included if booking is made during an active campaign
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None


class BookingResponse(BaseModel):
    """Schema for booking response"""
    id: int
    salon_id: int
    service_id: int
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    booking_date: str
    booking_time: str
    duration: Optional[int] = None
    status: str
    any_employee_selected: Optional[bool] = False  # New field to track if customer selected "any employee"
    created_at: str
    # Campaign fields
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("/{place_id}/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    place_id: int,
    booking_data: BookingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new booking for a place (public endpoint - no auth required)"""
    
    # Verify place exists and has booking enabled
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.is_active == True,
            Place.booking_enabled == True
        )
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(
            status_code=404, 
            detail="Place not found or booking not enabled"
        )
    
    # Verify all services exist and get their details
    from models.place_existing import BookingService
    services = []
    total_price = 0
    total_duration = 0
    
    for service_id in booking_data.service_ids:
        # Get service from place_services table
        result = await db.execute(
            select(PlaceService).where(
                PlaceService.id == service_id,
                PlaceService.place_id == place_id,
                PlaceService.is_available == True
            )
        )
        place_service = result.scalar_one_or_none()
        
        if not place_service:
            raise HTTPException(status_code=404, detail=f"Service with ID {service_id} not found or not available")
        
        # Get service details
        result = await db.execute(
            select(Service).where(Service.id == place_service.service_id)
        )
        service = result.scalar_one_or_none()
        
        if not service:
            raise HTTPException(status_code=404, detail=f"Service details not found for ID {service_id}")
        
        services.append({
            'place_service_id': place_service.id,
            'service_id': service.id,
            'service_name': service.name,
            'service_price': place_service.price or 0,
            'service_duration': place_service.duration or 0
        })
        
        total_price += place_service.price or 0
        total_duration += place_service.duration or 0
    
    # Handle employee assignment based on any_employee_selected flag
    from models.place_existing import PlaceEmployee
    employee_id_to_use = booking_data.employee_id
    
    if booking_data.any_employee_selected:
        # Customer selected "any available employee" - find the best available employee
        # Get all active employees for this place
        result = await db.execute(
            select(PlaceEmployee).where(
                PlaceEmployee.place_id == place_id,
                PlaceEmployee.is_active == True
            )
        )
        available_employees = result.scalars().all()
        
        if not available_employees:
            raise HTTPException(
                status_code=400,
                detail="No employees available at this place"
            )
        
        # For now, assign the first available employee
        # In a more sophisticated implementation, you could consider:
        # - Employee workload
        # - Employee specialization for the service
        # - Employee availability patterns
        employee_id_to_use = available_employees[0].id
    else:
        # Customer selected a specific employee - verify they exist and are available
        result = await db.execute(
            select(PlaceEmployee).where(
                PlaceEmployee.id == booking_data.employee_id,
                PlaceEmployee.place_id == place_id,
                PlaceEmployee.is_active == True
            )
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise HTTPException(
                status_code=404, 
                detail="Employee not found or not available at this place"
            )
    
    # Parse date and time strings to datetime objects
    try:
        booking_date_obj = datetime.strptime(booking_data.booking_date, "%Y-%m-%d")
        booking_time_obj = datetime.strptime(booking_data.booking_time, "%H:%M")
        
        # Combine date and time into a single datetime
        booking_datetime = datetime.combine(booking_date_obj.date(), booking_time_obj.time())
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time. Error: {str(e)}"
        )
    
    # Check if employee is already booked at this time
    from models.place_existing import Booking
    existing_booking_query = select(Booking).where(
        Booking.place_id == place_id,
        Booking.employee_id == employee_id_to_use,
        Booking.booking_date == booking_date_obj.date(),
        Booking.booking_time == booking_time_obj.time(),
        Booking.status.in_(["pending", "confirmed"])
    )
    result = await db.execute(existing_booking_query)
    existing_booking = result.scalar_one_or_none()
    
    if existing_booking:
        raise HTTPException(
            status_code=400,
            detail="Employee is already booked at this time"
        )
    
    # Try to link booking to user if customer email matches a registered user
    user_id = None
    if booking_data.customer_email:
        from models.user import User
        user_query = select(User).where(User.email == booking_data.customer_email)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if user:
            user_id = user.id
    
    # Create new booking
    booking = Booking(
        salon_id=place_id,  # Keep for backwards compatibility
        place_id=place_id,   # New field for places compatibility
        service_id=services[0]['service_id'],  # Use first service for backwards compatibility
        employee_id=employee_id_to_use,  # Use the determined employee ID
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        booking_date=booking_date_obj.date(),
        booking_time=booking_time_obj.time(),
        duration=total_duration,  # Store total duration
        any_employee_selected=booking_data.any_employee_selected,  # Store the flag
        status='pending',
        user_id=user_id,  # Link to user if found
        total_price=total_price,  # Store total price
        total_duration=total_duration,  # Store total duration
        # Campaign fields - store snapshot if campaign data provided
        campaign_id=booking_data.campaign_id,
        campaign_name=booking_data.campaign_name,
        campaign_type=booking_data.campaign_type,
        campaign_discount_type=booking_data.campaign_discount_type,
        campaign_discount_value=booking_data.campaign_discount_value,
        campaign_banner_message=booking_data.campaign_banner_message
    )
    
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    
    # Create booking services entries for all selected services
    for service in services:
        booking_service = BookingService(
            booking_id=booking.id,
            service_id=service['service_id'],
            service_name=service['service_name'],
            service_price=service['service_price'],
            service_duration=service['service_duration']
        )
        db.add(booking_service)
    
    await db.commit()
    
    # Prepare services data for email notification
    services_data = []
    for service in services:
        services_data.append({
            'service_name': service['service_name'],
            'service_price': float(service['service_price']),
            'service_duration': service['service_duration']
        })
    
    # Send email notification with services data
    try:
        from email_service import EmailService
        email_service = EmailService()
        email_data = {
            'customer_name': booking.customer_name,
            'customer_email': booking.customer_email,
            'salon_name': place.nome,
            'booking_date': booking_data.booking_date,
            'booking_time': booking_data.booking_time,
            'duration': total_duration,
            'total_price': float(total_price),
            'services': services_data
        }
        email_service.send_booking_request_notification(email_data)
    except Exception as e:
        print(f"Failed to send email notification: {str(e)}")
    
    return BookingResponse(
        id=booking.id,
        salon_id=booking.salon_id,
        service_id=booking.service_id,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking_data.booking_date,
        booking_time=booking_data.booking_time,
        duration=booking.duration,
        status=booking.status,
        created_at=booking.created_at.isoformat() if booking.created_at else datetime.now().isoformat(),
        # Campaign fields
        campaign_id=booking.campaign_id,
        campaign_name=booking.campaign_name,
        campaign_type=booking.campaign_type,
        campaign_discount_type=booking.campaign_discount_type,
        campaign_discount_value=float(booking.campaign_discount_value) if booking.campaign_discount_value else None,
        campaign_banner_message=booking.campaign_banner_message
    )
