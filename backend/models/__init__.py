"""
Unified model imports for SQLAlchemy relationships.
This file ensures all models are imported in the correct order to resolve cross-file relationships.
"""

# Import base first
from .base import Base

# Import models in dependency order
from .user import User, UserTypeEnum
from .place_existing import (
    Place, Service, PlaceService, PlaceImage, PlaceManager, 
    Booking, Review, PlaceEmployee
)
from .campaign import Campaign, CampaignPlace, CampaignService
from .rewards import CustomerReward, RewardTransaction, RewardSetting
from .customer_existing import CustomerPlaceAssociation, PlaceFeatureSetting
from .subscription import (
    Plan,
    Feature,
    PlanFeature,
    UserPlaceSubscription,
    SubscriptionEvent,
)
from .billing import BillingCustomer, Subscription as BillingSubscription, Invoice

# Export all models for easy importing
__all__ = [
    'Base',
    'User', 'UserTypeEnum',
    'Place', 'Service', 'PlaceService', 'PlaceImage', 'PlaceManager',
    'Booking', 'Review', 'PlaceEmployee',
    'Campaign', 'CampaignPlace', 'CampaignService',
    'CustomerReward', 'RewardTransaction', 'RewardSetting',
    'CustomerPlaceAssociation', 'PlaceFeatureSetting',
    'Plan', 'Feature', 'PlanFeature', 'UserPlaceSubscription', 'SubscriptionEvent'
    , 'BillingCustomer', 'BillingSubscription', 'Invoice'
]
