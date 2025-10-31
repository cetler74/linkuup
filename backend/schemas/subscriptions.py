from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class FeatureResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None


class PlanFeatureResponse(BaseModel):
    feature: FeatureResponse
    enabled: bool
    limit_value: Optional[int] = None


class PlanResponse(BaseModel):
    id: int
    code: str
    name: str
    price_cents: int
    currency: str
    trial_days: int
    features: List[PlanFeatureResponse]


class PlansResponse(BaseModel):
    plans: List[PlanResponse]


class SubscriptionStatusResponse(BaseModel):
    place_id: int
    plan_code: Optional[str] = None
    plan_name: Optional[str] = None
    status: str
    trial_end_at: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None


class StartTrialRequest(BaseModel):
    place_id: int
    plan_code: str


class ChangePlanRequest(BaseModel):
    place_id: int
    plan_code: str
    feature_to_enable: Optional[str] = None  # e.g., 'rewards'


class CancelRequest(BaseModel):
    place_id: int


