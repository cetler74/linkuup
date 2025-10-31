"""
Owner campaigns API - full implementation for campaign management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

try:
    from core.database import get_db
    from core.dependencies import get_current_business_owner
    from core.config import settings
    from models.user import User
    from models.place_existing import Place
    from models.campaign import Campaign, CampaignPlace, CampaignService
    from models.place_existing import PlaceService
    from schemas.campaign import (
        CampaignCreate, CampaignUpdate, CampaignResponse, CampaignListResponse,
        CampaignStatsResponse, MessagingCustomerResponse, CampaignRecipientResponse,
        MessagingStatsResponse
    )
    from services.campaign_service import CampaignService as CampaignBusinessService
    from services.feature_access import has_feature
except ImportError:
    from core.database import get_db
    from core.dependencies import get_current_business_owner
    from core.config import settings
    from models.user import User
    from models.place_existing import Place
    from models.campaign import Campaign, CampaignPlace, CampaignService
    from models.place_existing import PlaceService
    from schemas.campaign import (
        CampaignCreate, CampaignUpdate, CampaignResponse, CampaignListResponse,
        CampaignStatsResponse, MessagingCustomerResponse, CampaignRecipientResponse,
        MessagingStatsResponse
    )
    from services.campaign_service import CampaignService as CampaignBusinessService
    from services.feature_access import has_feature

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/", response_model=CampaignListResponse)
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_campaigns(
    request: Request,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None, regex="^(active|scheduled|expired|all)$")
):
    """Get all campaigns for the owner with pagination and filtering"""
    
    # Build base query
    query = (
        select(Campaign)
        .options(
            selectinload(Campaign.campaign_places).selectinload(CampaignPlace.place),
            selectinload(Campaign.campaign_services).selectinload(CampaignService.service)
        )
        .where(Campaign.created_by == current_user.id)
        .order_by(desc(Campaign.created_at))
    )
    
    # Apply status filter
    now = datetime.utcnow()
    if status_filter == "active":
        query = query.where(Campaign.status == 'active')
    elif status_filter == "scheduled":
        query = query.where(Campaign.status == 'active')
    elif status_filter == "expired":
        query = query.where(Campaign.status == 'expired')
    
    # Get total count
    count_query = select(Campaign).where(Campaign.created_by == current_user.id)
    if status_filter and status_filter != "all":
        if status_filter == "active":
            count_query = count_query.where(Campaign.status == 'active')
        elif status_filter == "scheduled":
            count_query = count_query.where(Campaign.status == 'active')
        elif status_filter == "expired":
            count_query = count_query.where(Campaign.status == 'expired')
    
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    
    result = await db.execute(query)
    campaigns = result.scalars().all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return CampaignListResponse(
        campaigns=[CampaignResponse(
            id=campaign.id,
            created_by=campaign.created_by,
            name=campaign.name,
            description=campaign.description,
            campaign_type=campaign.type,
            status=campaign.status,
            config=campaign.config,
            automation_rules=campaign.automation_rules,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            banner_message=campaign.config.get('banner_message') if campaign.config else None,
            start_datetime=datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00')) if campaign.config and 'start_datetime' in campaign.config else None,
            end_datetime=datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00')) if campaign.config and 'end_datetime' in campaign.config else None,
            is_active=campaign.config.get('is_active') if campaign.config else None,
            discount_type=campaign.config.get('discount_type') if campaign.config else None,
            discount_value=campaign.config.get('discount_value') if campaign.config else None,
            rewards_multiplier=campaign.config.get('rewards_multiplier') if campaign.config else None,
            rewards_bonus_points=campaign.config.get('rewards_bonus_points') if campaign.config else None,
            free_service_type=campaign.config.get('free_service_type') if campaign.config else None,
            buy_quantity=campaign.config.get('buy_quantity') if campaign.config else None,
            get_quantity=campaign.config.get('get_quantity') if campaign.config else None
        ) for campaign in campaigns],
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/{campaign_id}", response_model=CampaignResponse)
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_campaign(
    request: Request,
    campaign_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific campaign by ID"""
    
    query = (
        select(Campaign)
        .options(
            selectinload(Campaign.campaign_places).selectinload(CampaignPlace.place),
            selectinload(Campaign.campaign_services).selectinload(CampaignService.service)
        )
        .where(
            and_(
                Campaign.id == campaign_id,
                Campaign.created_by == current_user.id
            )
        )
    )
    
    result = await db.execute(query)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return CampaignResponse(
        id=campaign.id,
        created_by=campaign.created_by,
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.type,
        status=campaign.status,
        config=campaign.config,
        automation_rules=campaign.automation_rules,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        banner_message=campaign.config.get('banner_message') if campaign.config else None,
        start_datetime=datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00')) if campaign.config and 'start_datetime' in campaign.config else None,
        end_datetime=datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00')) if campaign.config and 'end_datetime' in campaign.config else None,
        is_active=campaign.config.get('is_active') if campaign.config else None,
        discount_type=campaign.config.get('discount_type') if campaign.config else None,
        discount_value=campaign.config.get('discount_value') if campaign.config else None,
        rewards_multiplier=campaign.config.get('rewards_multiplier') if campaign.config else None,
        rewards_bonus_points=campaign.config.get('rewards_bonus_points') if campaign.config else None,
        free_service_type=campaign.config.get('free_service_type') if campaign.config else None,
        buy_quantity=campaign.config.get('buy_quantity') if campaign.config else None,
        get_quantity=campaign.config.get('get_quantity') if campaign.config else None
    )


@router.post("/", response_model=CampaignResponse)
@limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_campaign(
    request: Request,
    campaign_data: CampaignCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new campaign"""
    
    # Get places owned by the current user
    place_query = select(Place.id).where(Place.owner_id == current_user.id)
    place_result = await db.execute(place_query)
    user_places = place_result.scalars().all()
    
    if not user_places:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business owner must have at least one place to create a campaign."
        )
    
    # Determine which places to use for the campaign
    if campaign_data.place_ids:
        # Use selected places, but verify ownership
        selected_places = []
        for place_id in campaign_data.place_ids:
            if place_id in user_places:
                selected_places.append(place_id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Place {place_id} is not owned by the current user."
                )
        campaign_places = selected_places
    else:
        # Use all owner's places if none selected
        campaign_places = user_places
    
    # Use the first place as the primary place_id for the campaign (for backwards compatibility)
    place_id = campaign_places[0]

    # Feature gating per campaign type: resolve required feature by type
    feature_required_map = {
        'messaging_email': 'campaigns_email',
        'messaging_sms': 'campaigns_sms',
        'messaging_whatsapp': 'campaigns_whatsapp',
        'promotions': 'promotions',
        'rewards_increase': 'rewards',
    }
    # Choose a representative place for gating checks
    gating_place_id = place_id
    required_feature = None
    if campaign_data.campaign_type in ('messaging_email', 'messaging_sms', 'messaging_whatsapp'):
        required_feature = feature_required_map[campaign_data.campaign_type]
    elif campaign_data.campaign_type in ('price_reduction', 'promotions'):
        required_feature = 'promotions'
    elif campaign_data.campaign_type == 'rewards_increase':
        required_feature = 'rewards'
    
    if required_feature and not await has_feature(db, current_user.id, gating_place_id, required_feature):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"feature_not_available: {required_feature}")

    # Create campaign
    campaign = Campaign(
        created_by=current_user.id,
        place_id=place_id, # Assign the retrieved place_id
        name=campaign_data.name,
        description=campaign_data.description,
        type=campaign_data.campaign_type,
        status='active' if campaign_data.is_active else 'draft',
        config={
            'banner_message': campaign_data.banner_message,
            'start_datetime': campaign_data.start_datetime.isoformat(),
            'end_datetime': campaign_data.end_datetime.isoformat(),
            'is_active': campaign_data.is_active
        }
    )
    
    # Set campaign type specific fields in config
    if campaign_data.campaign_type == 'price_reduction' and campaign_data.price_reduction_config:
        campaign.config['discount_type'] = campaign_data.price_reduction_config.discount_type
        campaign.config['discount_value'] = float(campaign_data.price_reduction_config.discount_value)
    
    elif campaign_data.campaign_type == 'rewards_increase' and campaign_data.rewards_increase_config:
        campaign.config['rewards_multiplier'] = float(campaign_data.rewards_increase_config.rewards_multiplier) if campaign_data.rewards_increase_config.rewards_multiplier else None
        campaign.config['rewards_bonus_points'] = campaign_data.rewards_increase_config.rewards_bonus_points
    
    elif campaign_data.campaign_type == 'free_service' and campaign_data.free_service_config:
        campaign.config['free_service_type'] = campaign_data.free_service_config.free_service_type
        campaign.config['buy_quantity'] = campaign_data.free_service_config.buy_quantity
        campaign.config['get_quantity'] = campaign_data.free_service_config.get_quantity
    
    db.add(campaign)
    await db.flush()  # Get the campaign ID
    
    # Add places using the determined campaign_places list
    for place_id in campaign_places:
        campaign_place = CampaignPlace(
            campaign_id=campaign.id,
            place_id=place_id
        )
        db.add(campaign_place)
    
    # Add services - if none specified, add all services from all owner's places
    if campaign_data.service_ids:
        # Add specific services
        for service_id in campaign_data.service_ids:
            campaign_service = CampaignService(
                campaign_id=campaign.id,
                service_id=service_id
            )
            db.add(campaign_service)
    else:
        # If no services specified, add all services from all owner's places
        # Get all services from all places owned by the user
        services_query = (
            select(PlaceService.service_id)
            .join(Place, PlaceService.place_id == Place.id)
            .where(Place.owner_id == current_user.id)
        )
        services_result = await db.execute(services_query)
        all_service_ids = services_result.scalars().all()
        
        for service_id in all_service_ids:
            campaign_service = CampaignService(
                campaign_id=campaign.id,
                service_id=service_id
            )
            db.add(campaign_service)
    
    # Add place-service combinations (if specified)
    if campaign_data.place_service_ids:
        for place_service_id in campaign_data.place_service_ids:
            # Verify place-service ownership
            place_service_query = select(PlaceService).join(Place, PlaceService.place_id == Place.id).where(
                and_(
                    PlaceService.id == place_service_id,
                    Place.owner_id == current_user.id
                )
            )
            place_service_result = await db.execute(place_service_query)
            place_service = place_service_result.scalar_one_or_none()
            if not place_service:
                raise HTTPException(status_code=404, detail=f"Place service {place_service_id} not found")
            
            campaign_service = CampaignService(
                campaign_id=campaign.id,
                service_id=place_service.service_id,
                place_service_id=place_service_id
            )
            db.add(campaign_service)
    
    await db.commit()
    await db.refresh(campaign)
    
    # Create response manually to avoid relationship loading issues
    return CampaignResponse(
        id=campaign.id,
        created_by=campaign.created_by,
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.type,
        status=campaign.status,
        config=campaign.config,
        automation_rules=campaign.automation_rules,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        banner_message=campaign.config.get('banner_message') if campaign.config else None,
        start_datetime=datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00')) if campaign.config and 'start_datetime' in campaign.config else None,
        end_datetime=datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00')) if campaign.config and 'end_datetime' in campaign.config else None,
        is_active=campaign.config.get('is_active') if campaign.config else None,
        discount_type=campaign.config.get('discount_type') if campaign.config else None,
        discount_value=campaign.config.get('discount_value') if campaign.config else None,
        rewards_multiplier=campaign.config.get('rewards_multiplier') if campaign.config else None,
        rewards_bonus_points=campaign.config.get('rewards_bonus_points') if campaign.config else None,
        free_service_type=campaign.config.get('free_service_type') if campaign.config else None,
        buy_quantity=campaign.config.get('buy_quantity') if campaign.config else None,
        get_quantity=campaign.config.get('get_quantity') if campaign.config else None
    )


@router.put("/{campaign_id}", response_model=CampaignResponse)
@limiter.limit(settings.RATE_LIMIT_WRITE)
async def update_campaign(
    request: Request,
    campaign_id: int,
    campaign_data: CampaignUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update a campaign"""
    
    # Get existing campaign
    query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    result = await db.execute(query)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Update basic fields
    if campaign_data.name is not None:
        campaign.name = campaign_data.name
    if campaign_data.description is not None:
        campaign.description = campaign_data.description
    if campaign_data.campaign_type is not None:
        campaign.type = campaign_data.campaign_type
    
    # Update config fields
    if campaign_data.banner_message is not None:
        campaign.config['banner_message'] = campaign_data.banner_message
    if campaign_data.start_datetime is not None:
        campaign.config['start_datetime'] = campaign_data.start_datetime.isoformat()
    if campaign_data.end_datetime is not None:
        campaign.config['end_datetime'] = campaign_data.end_datetime.isoformat()
    if campaign_data.is_active is not None:
        campaign.config['is_active'] = campaign_data.is_active
        campaign.status = 'active' if campaign_data.is_active else 'draft'
    
    # Update campaign type specific fields in config
    if campaign_data.price_reduction_config:
        campaign.config['discount_type'] = campaign_data.price_reduction_config.discount_type
        campaign.config['discount_value'] = float(campaign_data.price_reduction_config.discount_value)
    
    if campaign_data.rewards_increase_config:
        campaign.config['rewards_multiplier'] = float(campaign_data.rewards_increase_config.rewards_multiplier) if campaign_data.rewards_increase_config.rewards_multiplier else None
        campaign.config['rewards_bonus_points'] = campaign_data.rewards_increase_config.rewards_bonus_points
    
    if campaign_data.free_service_config:
        campaign.config['free_service_type'] = campaign_data.free_service_config.free_service_type
        campaign.config['buy_quantity'] = campaign_data.free_service_config.buy_quantity
        campaign.config['get_quantity'] = campaign_data.free_service_config.get_quantity
    
    # Update places if specified
    if campaign_data.place_ids is not None:
        # Remove existing place associations
        delete_places_query = select(CampaignPlace).where(CampaignPlace.campaign_id == campaign_id)
        delete_places_result = await db.execute(delete_places_query)
        existing_places = delete_places_result.scalars().all()
        for place in existing_places:
            await db.delete(place)
        
        # Add new place associations
        for place_id in campaign_data.place_ids:
            # Verify place ownership
            place_query = select(Place).where(
                and_(
                    Place.id == place_id,
                    Place.owner_id == current_user.id
                )
            )
            place_result = await db.execute(place_query)
            place = place_result.scalar_one_or_none()
            if not place:
                raise HTTPException(status_code=404, detail=f"Place {place_id} not found")
            
            campaign_place = CampaignPlace(
                campaign_id=campaign_id,
                place_id=place_id
            )
            db.add(campaign_place)
    
    # Update services if specified
    if campaign_data.service_ids is not None:
        # Remove existing service associations
        delete_services_query = select(CampaignService).where(CampaignService.campaign_id == campaign_id)
        delete_services_result = await db.execute(delete_services_query)
        existing_services = delete_services_result.scalars().all()
        for service in existing_services:
            await db.delete(service)
        
        # Add new service associations
        for service_id in campaign_data.service_ids:
            campaign_service = CampaignService(
                campaign_id=campaign_id,
                service_id=service_id
            )
            db.add(campaign_service)
    
    await db.commit()
    await db.refresh(campaign)
    
    return CampaignResponse(
        id=campaign.id,
        created_by=campaign.created_by,
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.type,
        status=campaign.status,
        config=campaign.config,
        automation_rules=campaign.automation_rules,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        banner_message=campaign.config.get('banner_message') if campaign.config else None,
        start_datetime=datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00')) if campaign.config and 'start_datetime' in campaign.config else None,
        end_datetime=datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00')) if campaign.config and 'end_datetime' in campaign.config else None,
        is_active=campaign.config.get('is_active') if campaign.config else None,
        discount_type=campaign.config.get('discount_type') if campaign.config else None,
        discount_value=campaign.config.get('discount_value') if campaign.config else None,
        rewards_multiplier=campaign.config.get('rewards_multiplier') if campaign.config else None,
        rewards_bonus_points=campaign.config.get('rewards_bonus_points') if campaign.config else None,
        free_service_type=campaign.config.get('free_service_type') if campaign.config else None,
        buy_quantity=campaign.config.get('buy_quantity') if campaign.config else None,
        get_quantity=campaign.config.get('get_quantity') if campaign.config else None
    )


@router.delete("/{campaign_id}")
@limiter.limit(settings.RATE_LIMIT_WRITE)
async def delete_campaign(
    request: Request,
    campaign_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete a campaign"""
    
    # Get campaign and verify ownership
    query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    result = await db.execute(query)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    await db.delete(campaign)
    await db.commit()
    
    return {"message": "Campaign deleted successfully"}


@router.get("/places/{place_id}/campaigns", response_model=List[CampaignResponse])
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_campaigns(
    request: Request,
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all campaigns for a specific place"""
    
    # Verify place ownership
    place_query = select(Place).where(
        and_(
            Place.id == place_id,
            Place.owner_id == current_user.id
        )
    )
    place_result = await db.execute(place_query)
    place = place_result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get campaigns for this place
    query = (
        select(Campaign)
        .join(CampaignPlace, Campaign.id == CampaignPlace.campaign_id)
        .options(
            selectinload(Campaign.campaign_places).selectinload(CampaignPlace.place),
            selectinload(Campaign.campaign_services).selectinload(CampaignService.service)
        )
        .where(
            and_(
                CampaignPlace.place_id == place_id,
                Campaign.created_by == current_user.id
            )
        )
        .order_by(desc(Campaign.created_at))
    )
    
    result = await db.execute(query)
    campaigns = result.scalars().all()
    
    return [CampaignResponse(
        id=campaign.id,
        created_by=campaign.created_by,
        name=campaign.name,
        description=campaign.description,
        campaign_type=campaign.type,
        status=campaign.status,
        config=campaign.config,
        automation_rules=campaign.automation_rules,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        banner_message=campaign.config.get('banner_message') if campaign.config else None,
        start_datetime=datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00')) if campaign.config and 'start_datetime' in campaign.config else None,
        end_datetime=datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00')) if campaign.config and 'end_datetime' in campaign.config else None,
        is_active=campaign.config.get('is_active') if campaign.config else None,
        discount_type=campaign.config.get('discount_type') if campaign.config else None,
        discount_value=campaign.config.get('discount_value') if campaign.config else None,
        rewards_multiplier=campaign.config.get('rewards_multiplier') if campaign.config else None,
        rewards_bonus_points=campaign.config.get('rewards_bonus_points') if campaign.config else None,
        free_service_type=campaign.config.get('free_service_type') if campaign.config else None,
        buy_quantity=campaign.config.get('buy_quantity') if campaign.config else None,
        get_quantity=campaign.config.get('get_quantity') if campaign.config else None
    ) for campaign in campaigns]


@router.get("/stats/overview", response_model=CampaignStatsResponse)
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_campaign_stats(
    request: Request,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get campaign statistics for the owner"""
    
    campaign_service = CampaignBusinessService(db)
    stats = await campaign_service.get_campaign_stats_for_owner(current_user.id)
    
    return CampaignStatsResponse(**stats)


# Messaging Campaign Endpoints

@router.get("/messaging/customers", response_model=List[MessagingCustomerResponse])
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_messaging_campaign_customers(
    request: Request,
    place_ids: List[int] = Query(..., description="List of place IDs to get customers from"),
    filter_by: Optional[str] = Query(None, description="Filter: all, has_email, has_phone, marketing_consent"),
    search: Optional[str] = Query(None, description="Search term for name or email"),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get customers eligible for messaging campaigns from selected places"""
    
    # Verify owner has access to all requested places
    places_query = select(Place).where(
        and_(
            Place.id.in_(place_ids),
            Place.owner_id == current_user.id
        )
    )
    places_result = await db.execute(places_query)
    owner_places = places_result.scalars().all()
    
    if len(owner_places) != len(place_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to all requested places"
        )
    
    # Prepare filters
    filters = {}
    if filter_by and filter_by != 'all':
        if filter_by == 'has_email':
            filters['has_email'] = True
        elif filter_by == 'has_phone':
            filters['has_phone'] = True
        elif filter_by == 'marketing_consent':
            filters['marketing_consent'] = True
    
    if search:
        filters['search'] = search
    
    # Get eligible customers
    from services.messaging_campaign_service import messaging_campaign_service
    customers = await messaging_campaign_service.get_eligible_customers(db, place_ids, filters)
    
    return customers


@router.post("/{campaign_id}/recipients")
@limiter.limit(settings.RATE_LIMIT_WRITE)
async def add_campaign_recipients(
    request: Request,
    campaign_id: int,
    user_ids: List[int],
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Add recipients to a messaging campaign"""
    
    # Verify campaign exists and belongs to owner
    campaign_query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    campaign_result = await db.execute(campaign_query)
    campaign = campaign_result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign.type != 'messaging':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not a messaging campaign"
        )
    
    # Add recipients
    from services.messaging_campaign_service import messaging_campaign_service
    result = await messaging_campaign_service.add_recipients(db, campaign_id, user_ids)
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
    
    return result


@router.get("/{campaign_id}/recipients", response_model=List[CampaignRecipientResponse])
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_campaign_recipients(
    request: Request,
    campaign_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all recipients for a messaging campaign"""
    
    # Verify campaign exists and belongs to owner
    campaign_query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    campaign_result = await db.execute(campaign_query)
    campaign = campaign_result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign.type != 'messaging':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not a messaging campaign"
        )
    
    # Get recipients
    from services.messaging_campaign_service import messaging_campaign_service
    recipients = await messaging_campaign_service.get_campaign_recipients(db, campaign_id)
    
    return recipients


@router.delete("/{campaign_id}/recipients/{recipient_id}")
@limiter.limit(settings.RATE_LIMIT_WRITE)
async def remove_campaign_recipient(
    request: Request,
    campaign_id: int,
    recipient_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Remove a recipient from a messaging campaign"""
    
    # Verify campaign exists and belongs to owner
    campaign_query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    campaign_result = await db.execute(campaign_query)
    campaign = campaign_result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign.type != 'messaging':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not a messaging campaign"
        )
    
    # Remove recipient
    from services.messaging_campaign_service import messaging_campaign_service
    result = await messaging_campaign_service.remove_recipient(db, campaign_id, recipient_id)
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
    
    return result


@router.post("/{campaign_id}/send")
@limiter.limit(settings.RATE_LIMIT_WRITE)
async def send_messaging_campaign(
    request: Request,
    campaign_id: int,
    send_immediately: bool = False,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Send a messaging campaign"""
    
    # Verify campaign exists and belongs to owner
    campaign_query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    campaign_result = await db.execute(campaign_query)
    campaign = campaign_result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign.type != 'messaging':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not a messaging campaign"
        )
    
    # Send campaign
    from services.messaging_campaign_service import messaging_campaign_service
    result = await messaging_campaign_service.send_campaign(db, campaign_id)
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
    
    return result


@router.get("/{campaign_id}/messaging-stats", response_model=MessagingStatsResponse)
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_messaging_campaign_stats(
    request: Request,
    campaign_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a messaging campaign"""
    
    # Verify campaign exists and belongs to owner
    campaign_query = select(Campaign).where(
        and_(
            Campaign.id == campaign_id,
            Campaign.created_by == current_user.id
        )
    )
    campaign_result = await db.execute(campaign_query)
    campaign = campaign_result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    if campaign.type != 'messaging':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not a messaging campaign"
        )
    
    # Get stats
    from services.messaging_campaign_service import messaging_campaign_service
    stats = await messaging_campaign_service.get_campaign_stats(db, campaign_id)
    
    return stats