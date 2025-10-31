from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# Place Feature Settings Schemas
class PlaceFeatureSettingsBase(BaseModel):
    bookings_enabled: bool = True
    rewards_enabled: bool = False
    time_off_enabled: bool = True
    campaigns_enabled: bool = True
    messaging_enabled: bool = True
    notifications_enabled: bool = True


class PlaceFeatureSettingsUpdate(BaseModel):
    bookings_enabled: Optional[bool] = None
    rewards_enabled: Optional[bool] = None
    time_off_enabled: Optional[bool] = None
    campaigns_enabled: Optional[bool] = None
    messaging_enabled: Optional[bool] = None
    notifications_enabled: Optional[bool] = None


class PlaceFeatureSettingsResponse(PlaceFeatureSettingsBase):
    id: int
    place_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Notification Settings Schemas
class NotificationSettingsBase(BaseModel):
    email_notifications: bool = True
    sms_notifications: bool = False
    push_notifications: bool = True
    booking_reminders: bool = True
    reward_notifications: bool = True
    marketing_emails: bool = False


class NotificationSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    booking_reminders: Optional[bool] = None
    reward_notifications: Optional[bool] = None
    marketing_emails: Optional[bool] = None


class NotificationSettingsResponse(NotificationSettingsBase):
    id: int
    place_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Combined Settings Response
class PlaceSettingsResponse(BaseModel):
    feature_settings: PlaceFeatureSettingsResponse
    reward_settings: Optional['RewardSettingsResponse'] = None
    notification_settings: Optional[NotificationSettingsResponse] = None


# Import here to avoid circular imports
try:
    from .rewards import RewardSettingsResponse
    PlaceSettingsResponse.model_rebuild()
except ImportError:
    # If rewards schema is not available, use a simple response
    class RewardSettingsResponse(BaseModel):
        id: int
        place_id: int
        calculation_method: str
        points_per_booking: Optional[int] = None
        is_active: bool = True
        created_at: datetime
        updated_at: datetime
        
        model_config = ConfigDict(from_attributes=True)
