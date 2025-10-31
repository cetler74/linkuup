"""
Admin-specific Pydantic schemas for API requests and responses.
"""

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserTypeEnum(str, Enum):
    CUSTOMER = "customer"
    BUSINESS_OWNER = "business_owner"
    EMPLOYEE = "employee"
    PLATFORM_ADMIN = "platform_admin"

class AdminStatsResponse(BaseModel):
    users: Dict[str, int]
    places: Dict[str, int]
    bookings: Dict[str, int]
    time_period: str
    generated_at: datetime

class AdminUserResponse(BaseModel):
    id: int
    name: str
    email: str
    user_type: UserTypeEnum
    is_admin: bool
    is_active: bool
    is_owner: bool
    place_count: int
    total_bookings: int
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class AdminOwnerDetailsResponse(BaseModel):
    user: AdminUserResponse
    places: List[Dict[str, Any]]
    total_places: int
    total_bookings: int
    total_services: int
    bio_diamond_places: int

class AdminPlaceResponse(BaseModel):
    id: int
    nome: str
    tipo: str
    cidade: str
    regiao: str
    estado: str
    telefone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    booking_enabled: bool
    is_bio_diamond: bool
    owner: Dict[str, Any]
    services_count: int
    bookings_count: int
    created_at: datetime

class AdminBookingResponse(BaseModel):
    id: int
    place_name: str
    owner_name: str
    customer_name: str
    customer_email: str
    service_name: str
    booking_date: datetime
    booking_time: str
    status: str
    created_at: datetime

class AdminBookingStatsResponse(BaseModel):
    total_bookings: int
    by_place: List[Dict[str, Any]]
    by_owner: List[Dict[str, Any]]
    by_status: Dict[str, int]
    recent_trends: List[Dict[str, Any]]

class CampaignStatusEnum(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class CampaignChannelEnum(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"

class CampaignTargetEnum(str, Enum):
    EXISTING_OWNERS = "existing_owners"
    NEW_OWNERS = "new_owners"
    BOTH = "both"

class AdminCampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_audience: CampaignTargetEnum
    channels: List[CampaignChannelEnum]
    content: str
    scheduled_at: Optional[datetime] = None
    is_active: bool = True

class AdminCampaignResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    target_audience: CampaignTargetEnum
    channels: List[CampaignChannelEnum]
    content: str
    status: CampaignStatusEnum
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    analytics: Optional[Dict[str, Any]] = None

class AdminCampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[CampaignTargetEnum] = None
    channels: Optional[List[CampaignChannelEnum]] = None
    content: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class AdminMessageCreate(BaseModel):
    subject: str
    content: str
    recipient_owner_ids: List[int]
    is_urgent: bool = False
    scheduled_at: Optional[datetime] = None

class AdminMessageResponse(BaseModel):
    id: int
    subject: str
    content: str
    sender_id: int
    sender_name: str
    is_urgent: bool
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    recipients: List[Dict[str, Any]]

class AdminMessageThreadResponse(BaseModel):
    message: AdminMessageResponse
    replies: List[Dict[str, Any]]
    total_recipients: int
    read_count: int
    reply_count: int

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool
