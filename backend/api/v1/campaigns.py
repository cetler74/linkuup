"""
Public campaigns API for retrieving active campaigns and price calculations.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.config import settings
from models.place_existing import Place, PlaceService
from models.campaign import Campaign, CampaignPlace, CampaignService
from schemas.campaign import (
    ActiveCampaignResponse, ServicePriceCalculation
)
from services.campaign_service import CampaignService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/active/place/{place_id}", response_model=List[ActiveCampaignResponse])
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_active_campaigns_for_place(
    request: Request,
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all currently active campaigns for a specific place (public API)"""
    
    # Verify place exists and is active
    place_query = select(Place).where(
        and_(
            Place.id == place_id,
            Place.is_active == True
        )
    )
    place_result = await db.execute(place_query)
    place = place_result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get active campaigns
    campaign_service = CampaignService(db)
    campaigns = await campaign_service.get_active_campaigns_for_place(place_id)
    
    # Convert to response format
    active_campaigns = []
    for campaign in campaigns:
        # Calculate days remaining from config
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
        
        # Parse start and end datetimes
        start_datetime = None
        end_datetime = None
        
        if config.get('start_datetime'):
            try:
                start_datetime = datetime.fromisoformat(config['start_datetime'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                start_datetime = None
        
        if config.get('end_datetime'):
            try:
                end_datetime = datetime.fromisoformat(config['end_datetime'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                end_datetime = None
        
        active_campaign = ActiveCampaignResponse(
            id=campaign.id,
            name=campaign.name,
            banner_message=config.get('banner_message', ''),
            campaign_type=config.get('campaign_type', campaign.type),
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            discount_type=config.get('discount_type', ''),
            discount_value=config.get('discount_value', 0),
            rewards_multiplier=config.get('rewards_multiplier', 1),
            rewards_bonus_points=config.get('rewards_bonus_points', 0),
            free_service_type=config.get('free_service_type', ''),
            buy_quantity=config.get('buy_quantity', 0),
            get_quantity=config.get('get_quantity', 0),
            days_remaining=days_remaining
        )
        active_campaigns.append(active_campaign)
    
    return active_campaigns


@router.get("/active/timeslot", response_model=List[ActiveCampaignResponse])
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_campaigns_for_timeslot(
    request: Request,
    place_id: int,
    service_id: int,
    booking_date: str,  # YYYY-MM-DD
    booking_time: str,  # HH:MM
    db: AsyncSession = Depends(get_db)
):
    """Get active campaigns for a specific time slot (public API)"""
    from datetime import datetime
    
    # Verify place exists and is active
    place_query = select(Place).where(
        and_(
            Place.id == place_id,
            Place.is_active == True
        )
    )
    place_result = await db.execute(place_query)
    place = place_result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Parse datetime
    try:
        booking_datetime = datetime.strptime(f"{booking_date} {booking_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format")
    
    # Get campaigns for this service
    campaign_service = CampaignService(db)
    campaigns = await campaign_service.get_active_campaigns_for_service(place_id, service_id)
    
    # Filter campaigns by the specific datetime
    active_campaigns = []
    now = datetime.utcnow()
    
    def _parse_dt(value: str) -> datetime:
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except Exception:
            pass
        # Accept formats like "11/3/2025, 5:31:00 PM"
        try:
            return datetime.strptime(value, "%m/%d/%Y, %I:%M:%S %p")
        except Exception:
            pass
        # Accept formats like "11/03/2025 17:31"
        try:
            return datetime.strptime(value, "%m/%d/%Y %H:%M")
        except Exception:
            pass
        raise ValueError("Unsupported datetime format")

    for campaign in campaigns:
        # Check if campaign is active at this specific datetime
        if campaign.config and 'start_datetime' in campaign.config and 'end_datetime' in campaign.config:
            try:
                start = _parse_dt(campaign.config['start_datetime'])
                end = _parse_dt(campaign.config['end_datetime'])
                
                # Check if booking datetime falls within campaign period
                if start <= booking_datetime <= end:
                    # Calculate days remaining
                    days_remaining = (end - now).days if end > now else 0
                    
                    # Extract campaign details from config
                    config = campaign.config or {}
                    
                    active_campaign = ActiveCampaignResponse(
                        id=campaign.id,
                        name=campaign.name,
                        banner_message=config.get('banner_message', ''),
                        campaign_type=campaign.type,
                        end_datetime=end,
                        discount_type=config.get('discount_type'),
                        discount_value=config.get('discount_value'),
                        rewards_multiplier=config.get('rewards_multiplier'),
                        rewards_bonus_points=config.get('rewards_bonus_points'),
                        free_service_type=config.get('free_service_type'),
                        buy_quantity=config.get('buy_quantity'),
                        get_quantity=config.get('get_quantity'),
                        days_remaining=days_remaining
                    )
                    active_campaigns.append(active_campaign)
            except (ValueError, TypeError):
                continue
    
    return active_campaigns


@router.get("/price/place/{place_id}/service/{service_id}", response_model=ServicePriceCalculation)
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def calculate_service_price(
    request: Request,
    place_id: int,
    service_id: int,
    place_service_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Calculate the discounted price for a service with active campaigns"""
    
    # Get the place service to get the original price
    if place_service_id:
        place_service_query = select(PlaceService).where(
            and_(
                PlaceService.id == place_service_id,
                PlaceService.place_id == place_id,
                PlaceService.service_id == service_id
            )
        )
    else:
        place_service_query = select(PlaceService).where(
            and_(
                PlaceService.place_id == place_id,
                PlaceService.service_id == service_id
            )
        )
    
    place_service_result = await db.execute(place_service_query)
    place_service = place_service_result.scalar_one_or_none()
    
    if not place_service:
        raise HTTPException(status_code=404, detail="Service not found for this place")
    
    if not place_service.price:
        raise HTTPException(status_code=400, detail="Service has no price set")
    
    original_price = Decimal(str(place_service.price))
    
    # Get active campaigns for this service
    campaign_service = CampaignService(db)
    campaigns = await campaign_service.get_active_campaigns_for_service(
        place_id, service_id, place_service_id
    )
    
    # Calculate discounted price
    price_calculation = campaign_service.calculate_discounted_price(original_price, campaigns)
    price_calculation.service_id = service_id
    price_calculation.place_service_id = place_service_id
    
    return price_calculation


@router.get("/price/place/{place_id}/services", response_model=List[ServicePriceCalculation])
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def calculate_all_service_prices(
    request: Request,
    place_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Calculate discounted prices for all services in a place"""
    
    # Get all place services
    place_services_query = select(PlaceService).where(
        and_(
            PlaceService.place_id == place_id,
            PlaceService.is_available == True
        )
    )
    place_services_result = await db.execute(place_services_query)
    place_services = place_services_result.scalars().all()
    
    if not place_services:
        return []
    
    # Get active campaigns for this place
    campaign_service = CampaignService(db)
    campaigns = await campaign_service.get_active_campaigns_for_place(place_id)
    
    # Calculate prices for each service
    price_calculations = []
    for place_service in place_services:
        if place_service.price:
            original_price = Decimal(str(place_service.price))
            
            # Get campaigns that apply to this specific service
            service_campaigns = []
            for campaign in campaigns:
                is_eligible = await campaign_service.is_service_eligible_for_campaign(
                    campaign, place_service.service_id, place_service.id
                )
                if is_eligible:
                    service_campaigns.append(campaign)
            
            # Calculate discounted price
            price_calculation = campaign_service.calculate_discounted_price(
                original_price, service_campaigns
            )
            price_calculation.service_id = place_service.service_id
            price_calculation.place_service_id = place_service.id
            
            price_calculations.append(price_calculation)
    
    return price_calculations


@router.get("/rewards/place/{place_id}/calculate", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def calculate_rewards_points(
    request: Request,
    place_id: int,
    base_points: int,
    db: AsyncSession = Depends(get_db)
):
    """Calculate rewards points with active campaigns"""
    
    # Get active campaigns for this place
    campaign_service = CampaignService(db)
    campaigns = await campaign_service.get_active_campaigns_for_place(place_id)
    
    # Calculate rewards points
    rewards_calculation = campaign_service.calculate_rewards_points(base_points, campaigns)
    
    return rewards_calculation
