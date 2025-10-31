from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date


# Customer Base Schemas
class CustomerBase(BaseModel):
    user_id: int
    place_id: int


class CustomerResponse(BaseModel):
    user_id: int
    place_id: int
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    total_bookings: int
    completed_bookings: int
    last_booking_date: Optional[date] = None
    first_booking_date: Optional[date] = None
    points_balance: Optional[int] = None
    tier: Optional[str] = None
    # Additional fields for enhanced display
    last_service_name: Optional[str] = None
    last_campaign_name: Optional[str] = None
    last_campaign_type: Optional[str] = None
    # Subscription and opt-in information
    gdpr_data_processing_consent: Optional[bool] = None
    gdpr_data_processing_consent_date: Optional[datetime] = None
    gdpr_marketing_consent: Optional[bool] = None
    gdpr_marketing_consent_date: Optional[datetime] = None
    gdpr_consent_version: Optional[str] = None
    rewards_program_subscribed: Optional[bool] = None
    is_active_user: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)


class CustomerDetailResponse(CustomerResponse):
    bookings_history: List['BookingHistoryItem'] = []
    reward_transactions: List['RewardTransactionItem'] = []
    place_name: str


class BookingHistoryItem(BaseModel):
    id: int
    service_name: str
    employee_name: Optional[str] = None
    booking_date: date
    booking_time: str
    status: str
    points_earned: Optional[int] = None
    points_redeemed: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RewardTransactionItem(BaseModel):
    id: int
    transaction_type: str
    points_change: int
    points_balance_after: int
    description: Optional[str] = None
    booking_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Customer Management Schemas
class CustomerListResponse(BaseModel):
    customers: List[CustomerResponse]
    total_count: int
    page: int
    page_size: int


class CustomerSearchRequest(BaseModel):
    search_term: Optional[str] = None
    tier_filter: Optional[str] = None
    booking_status_filter: Optional[str] = None
    page: int = 1
    page_size: int = 20


class CustomerRewardAdjustment(BaseModel):
    points_change: int
    description: str
    transaction_type: str = "adjusted"


# Update forward references
CustomerDetailResponse.model_rebuild()
BookingHistoryItem.model_rebuild()
RewardTransactionItem.model_rebuild()
