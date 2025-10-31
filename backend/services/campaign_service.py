"""
Campaign business logic service for price calculations and stacking.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

try:
    from models.campaign import Campaign, CampaignPlace, CampaignService as CampaignModelService
    from models.place_existing import Place, Service, PlaceService
    from schemas.campaign import ServicePriceCalculation
except ImportError:
    from models.campaign import Campaign, CampaignPlace, CampaignService as CampaignModelService
    from models.place_existing import Place, Service, PlaceService
    from schemas.campaign import ServicePriceCalculation


class CampaignService:
    """Service class for campaign business logic"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_active_campaigns_for_place(self, place_id: int) -> List[Campaign]:
        """Get all currently active campaigns for a specific place"""
        now = datetime.utcnow()
        
        query = (
            select(Campaign)
            .join(CampaignPlace, Campaign.id == CampaignPlace.campaign_id)
            .options(
                selectinload(Campaign.campaign_places).selectinload(CampaignPlace.place)
            )
            .where(
                and_(
                    CampaignPlace.place_id == place_id,
                    Campaign.status == 'active'
                )
            )
        )
        
        result = await self.db.execute(query)
        campaigns = result.scalars().all()
        
        # Filter by timing using the config field
        active_campaigns = []
        for campaign in campaigns:
            if campaign.is_currently_active:
                active_campaigns.append(campaign)
        
        return active_campaigns
    
    async def get_active_campaigns_for_service(
        self, 
        place_id: int, 
        service_id: int, 
        place_service_id: Optional[int] = None
    ) -> List[Campaign]:
        """Get active campaigns that apply to a specific service"""
        now = datetime.utcnow()
        
        # Base query for campaigns affecting this place
        base_query = (
            select(Campaign)
            .join(CampaignPlace, Campaign.id == CampaignPlace.campaign_id)
            .where(
                and_(
                    CampaignPlace.place_id == place_id,
                    Campaign.status == 'active'
                )
            )
        )
        
        # If specific place_service_id is provided, check for exact matches
        if place_service_id:
            service_query = base_query.join(
                CampaignModelService, 
                and_(
                    Campaign.id == CampaignModelService.campaign_id,
                    or_(
                        CampaignModelService.service_id == service_id,
                        and_(
                            CampaignModelService.service_id == service_id,
                            CampaignModelService.place_service_id == place_service_id
                        )
                    )
                )
            )
        else:
            # Check for campaigns that target this service (either globally or specifically)
            service_query = base_query.join(
                CampaignModelService,
                and_(
                    Campaign.id == CampaignModelService.campaign_id,
                    CampaignModelService.service_id == service_id
                )
            )
        
        result = await self.db.execute(service_query)
        campaigns = result.scalars().all()
        
        # Filter by timing using the config field
        active_campaigns = []
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        print(f"DEBUG: Found {len(campaigns)} campaigns for service {service_id} at place {place_id}")
        print(f"DEBUG: Current time (UTC): {now}")
        
        # Filter by timing using the config field
        for campaign in campaigns:
            print(f"DEBUG: Checking campaign {campaign.id} - {campaign.name}")
            if campaign.config and 'start_datetime' in campaign.config and 'end_datetime' in campaign.config:
                try:
                    start = datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(campaign.config['end_datetime'].replace('Z', '+00:00'))
                    
                    print(f"DEBUG: Campaign {campaign.id} - Start: {start}, End: {end}")
                    print(f"DEBUG: Campaign {campaign.id} - Is active: {start <= now <= end}")
                    
                    # Check if campaign is currently active
                    if start <= now <= end:
                        active_campaigns.append(campaign)
                        print(f"DEBUG: Campaign {campaign.id} added to active campaigns")
                except (ValueError, TypeError) as e:
                    print(f"DEBUG: Error parsing campaign {campaign.id} datetime: {e}")
                    continue
            else:
                print(f"DEBUG: Campaign {campaign.id} missing datetime config")
        
        print(f"DEBUG: Returning {len(active_campaigns)} active campaigns")
        return active_campaigns
    
    def calculate_discounted_price(
        self, 
        original_price: Decimal, 
        campaigns: List[Campaign]
    ) -> ServicePriceCalculation:
        """Calculate the final discounted price with stacked campaigns"""
        if not campaigns:
            return ServicePriceCalculation(
                service_id=0,  # Will be set by caller
                original_price=original_price,
                discounted_price=original_price,
                discount_amount=Decimal('0'),
                applied_campaigns=[]
            )
        
        # For now, return original price since campaigns don't have the expected structure
        # This is a temporary fix until the campaign system is properly implemented
        return ServicePriceCalculation(
            service_id=0,  # Will be set by caller
            original_price=original_price,
            discounted_price=original_price,
            discount_amount=Decimal('0'),
            applied_campaigns=[]
        )
    
    def calculate_rewards_points(
        self, 
        base_points: int, 
        campaigns: List[Campaign]
    ) -> Dict[str, Any]:
        """Calculate final rewards points with stacked campaigns"""
        if not campaigns:
            return {
                'base_points': base_points,
                'final_points': base_points,
                'multiplier': Decimal('1'),
                'bonus_points': 0,
                'applied_campaigns': []
            }
        
        # For now, return base points since campaigns don't have the expected structure
        # This is a temporary fix until the campaign system is properly implemented
        return {
            'base_points': base_points,
            'final_points': base_points,
            'multiplier': Decimal('1'),
            'bonus_points': 0,
            'applied_campaigns': []
        }
    
    async def get_campaign_stats_for_owner(self, owner_id: int) -> Dict[str, Any]:
        """Get campaign statistics for an owner"""
        now = datetime.utcnow()
        
        # Total campaigns
        total_query = select(Campaign).where(Campaign.created_by == owner_id)
        total_result = await self.db.execute(total_query)
        total_campaigns = len(total_result.scalars().all())
        
        # Active campaigns (using status and config)
        active_query = select(Campaign).where(
            and_(
                Campaign.created_by == owner_id,
                Campaign.status == 'active'
            )
        )
        active_result = await self.db.execute(active_query)
        all_active_campaigns = active_result.scalars().all()
        
        # Filter by timing using the config field
        active_campaigns = 0
        scheduled_campaigns = 0
        expired_campaigns = 0
        
        for campaign in all_active_campaigns:
            if campaign.is_currently_active:
                active_campaigns += 1
            elif campaign.config and 'start_datetime' in campaign.config:
                try:
                    start = datetime.fromisoformat(campaign.config['start_datetime'].replace('Z', '+00:00'))
                    if start > now:
                        scheduled_campaigns += 1
                    else:
                        expired_campaigns += 1
                except (ValueError, TypeError):
                    pass
        
        # Places affected
        places_query = (
            select(CampaignPlace.place_id)
            .join(Campaign, CampaignPlace.campaign_id == Campaign.id)
            .where(Campaign.created_by == owner_id)
            .distinct()
        )
        places_result = await self.db.execute(places_query)
        total_places_affected = len(places_result.scalars().all())
        
        # Services affected
        services_query = (
            select(CampaignModelService.service_id)
            .join(Campaign, CampaignModelService.campaign_id == Campaign.id)
            .where(Campaign.created_by == owner_id)
            .distinct()
        )
        services_result = await self.db.execute(services_query)
        total_services_affected = len(services_result.scalars().all())
        
        return {
            'total_campaigns': total_campaigns,
            'active_campaigns': active_campaigns,
            'scheduled_campaigns': scheduled_campaigns,
            'expired_campaigns': expired_campaigns,
            'total_places_affected': total_places_affected,
            'total_services_affected': total_services_affected
        }
    
    async def is_service_eligible_for_campaign(
        self, 
        campaign: Campaign, 
        service_id: int, 
        place_service_id: Optional[int] = None
    ) -> bool:
        """Check if a service is eligible for a specific campaign"""
        # If campaign has no specific services, it applies to all
        if not campaign.campaign_services:
            return True
        
        # Check if service is in campaign services
        for campaign_service_obj in campaign.campaign_services:
            if campaign_service_obj.service_id == service_id:
                # If place_service_id is specified, check for exact match
                if place_service_id and campaign_service_obj.place_service_id:
                    return campaign_service_obj.place_service_id == place_service_id
                # If no place_service_id specified, any match is valid
                return True
        
        return False
