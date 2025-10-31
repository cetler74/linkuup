"""
Campaign schemas for API serialization.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from datetime import datetime
from decimal import Decimal


class CampaignBase(BaseModel):
    """Base campaign schema with common fields"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    banner_message: str = Field(..., min_length=1)
    campaign_type: str = Field(
        ..., 
        pattern="^(price_reduction|rewards_increase|free_service|promotions|messaging|messaging_email|messaging_sms|messaging_whatsapp)$"
    )
    start_datetime: datetime
    end_datetime: datetime
    is_active: bool = True
    
    @validator('end_datetime')
    def end_after_start(cls, v, values):
        if 'start_datetime' in values and v <= values['start_datetime']:
            raise ValueError('End datetime must be after start datetime')
        return v


class PriceReductionConfig(BaseModel):
    """Configuration for price reduction campaigns"""
    discount_type: str = Field(..., pattern="^(percentage|fixed_amount)$")
    discount_value: Decimal = Field(..., gt=0)
    
    @validator('discount_value')
    def validate_discount_value(cls, v, values):
        if 'discount_type' in values:
            if values['discount_type'] == 'percentage' and v > 100:
                raise ValueError('Percentage discount cannot exceed 100%')
        return v


class RewardsIncreaseConfig(BaseModel):
    """Configuration for rewards increase campaigns"""
    rewards_multiplier: Optional[Decimal] = Field(None, gt=0)
    rewards_bonus_points: Optional[int] = Field(None, ge=0)
    
    @validator('rewards_multiplier', 'rewards_bonus_points')
    def at_least_one_reward_config(cls, v, values):
        # Check if at least one of the reward fields has a meaningful value
        has_multiplier = values.get('rewards_multiplier') is not None and values.get('rewards_multiplier') > 0
        has_bonus_points = values.get('rewards_bonus_points') is not None and values.get('rewards_bonus_points') > 0
        if not (has_multiplier or has_bonus_points):
            raise ValueError('At least one reward configuration must be provided')
        return v


class FreeServiceConfig(BaseModel):
    """Configuration for free service campaigns"""
    free_service_type: str = Field(..., pattern="^(specific_free|buy_x_get_y)$")
    buy_quantity: Optional[int] = Field(None, gt=0)
    get_quantity: Optional[int] = Field(None, gt=0)
    
    @validator('buy_quantity', 'get_quantity')
    def validate_buy_x_get_y_quantities(cls, v, values):
        if 'free_service_type' in values and values['free_service_type'] == 'buy_x_get_y':
            if v is None:
                raise ValueError('Buy and get quantities are required for buy_x_get_y campaigns')
        return v


class MessagingConfig(BaseModel):
    """Configuration for messaging campaigns"""
    channels: List[str] = Field(..., min_items=1, description="List of channels: email, whatsapp")
    email_subject: Optional[str] = Field(None, max_length=255, description="Email subject line")
    email_body: Optional[str] = Field(None, description="Email message body (HTML supported)")
    whatsapp_message: Optional[str] = Field(None, max_length=1600, description="WhatsApp message (plain text)")
    scheduled_send_time: Optional[datetime] = Field(None, description="When to send the campaign")
    send_immediately: bool = Field(False, description="Send immediately instead of scheduling")
    
    @validator('channels')
    def validate_channels(cls, v):
        valid_channels = {'email', 'whatsapp'}
        if not all(channel in valid_channels for channel in v):
            raise ValueError('Channels must be from: email, whatsapp')
        return v
    
    @validator('email_subject')
    def validate_email_subject(cls, v, values):
        if 'channels' in values and 'email' in values['channels'] and not v:
            raise ValueError('Email subject is required when email channel is selected')
        return v
    
    @validator('email_body')
    def validate_email_body(cls, v, values):
        if 'channels' in values and 'email' in values['channels'] and not v:
            raise ValueError('Email body is required when email channel is selected')
        return v
    
    @validator('whatsapp_message')
    def validate_whatsapp_message(cls, v, values):
        if 'channels' in values and 'whatsapp' in values['channels'] and not v:
            raise ValueError('WhatsApp message is required when WhatsApp channel is selected')
        return v


class CampaignCreate(CampaignBase):
    """Schema for creating a new campaign"""
    place_ids: Optional[List[int]] = None  # None means all places
    service_ids: Optional[List[int]] = None  # None means all services
    place_service_ids: Optional[List[int]] = None  # Specific place-service combinations
    
    # Campaign type specific configurations
    price_reduction_config: Optional[PriceReductionConfig] = None
    rewards_increase_config: Optional[RewardsIncreaseConfig] = None
    free_service_config: Optional[FreeServiceConfig] = None
    messaging_config: Optional[MessagingConfig] = None
    
    @validator('price_reduction_config')
    def validate_price_reduction_config(cls, v, values):
        if values.get('campaign_type') == 'price_reduction' and not v:
            raise ValueError('Price reduction configuration is required for price reduction campaigns')
        return v
    
    @validator('rewards_increase_config')
    def validate_rewards_increase_config(cls, v, values):
        if values.get('campaign_type') == 'rewards_increase' and not v:
            raise ValueError('Rewards increase configuration is required for rewards increase campaigns')
        return v
    
    @validator('free_service_config')
    def validate_free_service_config(cls, v, values):
        if values.get('campaign_type') == 'free_service' and not v:
            raise ValueError('Free service configuration is required for free service campaigns')
        return v
    
    @validator('messaging_config')
    def validate_messaging_config(cls, v, values):
        ctype = values.get('campaign_type')
        if ctype and (ctype == 'messaging' or ctype.startswith('messaging_')) and not v:
            raise ValueError('Messaging configuration is required for messaging campaigns')
        return v


class CampaignUpdate(BaseModel):
    """Schema for updating a campaign"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    banner_message: Optional[str] = Field(None, min_length=1)
    campaign_type: Optional[str] = Field(
        None, 
        pattern="^(price_reduction|rewards_increase|free_service|promotions|messaging|messaging_email|messaging_sms|messaging_whatsapp)$"
    )
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    is_active: Optional[bool] = None
    place_ids: Optional[List[int]] = None
    service_ids: Optional[List[int]] = None
    place_service_ids: Optional[List[int]] = None
    
    # Campaign type specific configurations
    price_reduction_config: Optional[PriceReductionConfig] = None
    rewards_increase_config: Optional[RewardsIncreaseConfig] = None
    free_service_config: Optional[FreeServiceConfig] = None
    messaging_config: Optional[MessagingConfig] = None


class PlaceResponse(BaseModel):
    """Place information in campaign response"""
    id: int
    nome: str
    cidade: Optional[str] = None
    regiao: Optional[str] = None
    
    class Config:
        from_attributes = True


class ServiceResponse(BaseModel):
    """Service information in campaign response"""
    id: int
    name: str
    category: Optional[str] = None
    
    class Config:
        from_attributes = True


class CampaignPlaceResponse(BaseModel):
    """Campaign place relationship response"""
    id: int
    place: PlaceResponse
    
    class Config:
        from_attributes = True


class CampaignServiceResponse(BaseModel):
    """Campaign service relationship response"""
    id: int
    service: ServiceResponse
    place_service_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class CampaignResponse(BaseModel):
    """Full campaign response schema"""
    id: int
    created_by: int
    name: str
    description: Optional[str] = None
    campaign_type: str
    status: str
    config: Optional[dict] = None
    automation_rules: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    
    # Campaign type specific fields from config
    banner_message: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    is_active: Optional[bool] = None
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    rewards_multiplier: Optional[Decimal] = None
    rewards_bonus_points: Optional[int] = None
    free_service_type: Optional[str] = None
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    
    # Relationships
    campaign_places: List[CampaignPlaceResponse] = []
    campaign_services: List[CampaignServiceResponse] = []
    
    # Computed fields
    is_currently_active: bool = False
    days_remaining: Optional[int] = None
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to extract fields from config"""
        data = {
            'id': obj.id,
            'created_by': obj.created_by,
            'name': obj.name,
            'description': obj.description,
            'type': obj.type,
            'status': obj.status,
            'config': obj.config,
            'automation_rules': obj.automation_rules,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
            'campaign_places': [CampaignPlaceResponse.from_orm(cp) for cp in obj.campaign_places],
            'campaign_services': [CampaignServiceResponse.from_orm(cs) for cs in obj.campaign_services],
            'is_currently_active': obj.is_currently_active,
        }
        
        # Extract fields from config
        if obj.config:
            data.update({
                'banner_message': obj.config.get('banner_message'),
                'start_datetime': datetime.fromisoformat(obj.config['start_datetime']) if obj.config.get('start_datetime') else None,
                'end_datetime': datetime.fromisoformat(obj.config['end_datetime']) if obj.config.get('end_datetime') else None,
                'is_active': obj.config.get('is_active'),
                'discount_type': obj.config.get('discount_type'),
                'discount_value': Decimal(str(obj.config['discount_value'])) if obj.config.get('discount_value') else None,
                'rewards_multiplier': Decimal(str(obj.config['rewards_multiplier'])) if obj.config.get('rewards_multiplier') else None,
                'rewards_bonus_points': obj.config.get('rewards_bonus_points'),
                'free_service_type': obj.config.get('free_service_type'),
                'buy_quantity': obj.config.get('buy_quantity'),
                'get_quantity': obj.config.get('get_quantity'),
            })
        
        return cls(**data)
    
    class Config:
        from_attributes = True


class ActiveCampaignResponse(BaseModel):
    """Simplified response for active campaigns (public API)"""
    id: int
    name: str
    banner_message: str
    campaign_type: str
    start_datetime: Optional[datetime] = None
    end_datetime: datetime
    discount_type: Optional[str] = None
    discount_value: Optional[Decimal] = None
    rewards_multiplier: Optional[Decimal] = None
    rewards_bonus_points: Optional[int] = None
    free_service_type: Optional[str] = None
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    days_remaining: Optional[int] = None
    
    class Config:
        from_attributes = True


class CampaignListResponse(BaseModel):
    """Response for campaign list with pagination"""
    campaigns: List[CampaignResponse]
    total: int
    page: int
    size: int
    pages: int


class ServicePriceCalculation(BaseModel):
    """Service price calculation with campaign discounts"""
    service_id: int
    place_service_id: Optional[int] = None
    original_price: Decimal
    discounted_price: Decimal
    discount_amount: Decimal
    discount_percentage: Optional[Decimal] = None
    applied_campaigns: List[int] = []
    is_free: bool = False
    free_reason: Optional[str] = None  # "specific_free" or "buy_x_get_y"


class CampaignStatsResponse(BaseModel):
    """Campaign statistics response"""
    total_campaigns: int
    active_campaigns: int
    scheduled_campaigns: int
    expired_campaigns: int
    total_places_affected: int
    total_services_affected: int


class CampaignRecipientResponse(BaseModel):
    """Campaign recipient response schema"""
    id: int
    campaign_id: int
    user_id: int
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    delivery_status: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MessagingCustomerResponse(BaseModel):
    """Customer response for messaging campaign selection"""
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    gdpr_marketing_consent: bool
    last_booking_date: Optional[datetime] = None
    total_bookings: int
    is_selected: bool = False
    
    class Config:
        from_attributes = True


class MessagingStatsResponse(BaseModel):
    """Messaging campaign statistics response"""
    total_recipients: int
    sent_count: int
    failed_count: int
    pending_count: int
    delivery_rate: float  # percentage
    email_count: int
    whatsapp_count: int
    last_sent_at: Optional[datetime] = None
