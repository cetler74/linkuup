from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import json


# Reward Settings Schemas
class RewardSettingsBase(BaseModel):
    calculation_method: str = "volume_based"  # volume_based calculation
    points_per_booking: Optional[int] = None  # Kept for backward compatibility
    points_per_currency_unit: Optional[Decimal] = None  # Points per euro spent
    redemption_rules: Optional[Dict[str, Any]] = None
    is_active: bool = True


class RewardSettingsCreate(RewardSettingsBase):
    place_id: Optional[int] = None


class RewardSettingsUpdate(BaseModel):
    calculation_method: Optional[str] = None
    points_per_booking: Optional[int] = None
    points_per_currency_unit: Optional[Decimal] = None
    redemption_rules: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class RewardSettingsResponse(RewardSettingsBase):
    id: int
    place_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_validator('redemption_rules', mode='before')
    @classmethod
    def parse_redemption_rules(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v


# Customer Reward Schemas
class CustomerRewardResponse(BaseModel):
    id: int
    user_id: int
    place_id: int
    points_balance: int
    total_points_earned: int
    total_points_redeemed: int
    tier: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CustomerRewardSummary(BaseModel):
    user_id: int
    place_id: int
    place_name: str
    points_balance: int
    tier: str
    total_bookings: int
    completed_bookings: int
    last_booking_date: Optional[date] = None


# Reward Transaction Schemas
class RewardTransactionResponse(BaseModel):
    id: int
    customer_reward_id: int
    booking_id: Optional[int] = None
    transaction_type: str
    points_change: int
    points_balance_after: int
    description: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RewardTransactionCreate(BaseModel):
    customer_reward_id: int
    booking_id: Optional[int] = None
    transaction_type: str
    points_change: int
    description: Optional[str] = None


# Redemption Schemas
class RedemptionRequest(BaseModel):
    points_to_redeem: int
    booking_id: Optional[int] = None
    description: Optional[str] = None


class RedemptionResponse(BaseModel):
    success: bool
    points_redeemed: int
    discount_amount: Decimal
    new_balance: int
    message: str


# Points Calculation Schemas
class PointsCalculationRequest(BaseModel):
    booking_id: int
    service_price: Optional[Decimal] = None
    service_id: Optional[int] = None


class PointsCalculationResponse(BaseModel):
    points_earned: int
    calculation_method: str
    details: Dict[str, Any]
