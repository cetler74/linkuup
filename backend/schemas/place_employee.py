"""
Place Employee schemas for API responses
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class PlaceEmployeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "Employee"
    specialty: Optional[str] = None
    color_code: Optional[str] = None
    photo_url: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None

class PlaceEmployeeCreate(PlaceEmployeeBase):
    pass

class PlaceEmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    specialty: Optional[str] = None
    color_code: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: Optional[bool] = None
    working_hours: Optional[Dict[str, Any]] = None

class PlaceEmployeeResponse(PlaceEmployeeBase):
    id: int
    place_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PlaceEmployeePublicResponse(BaseModel):
    """Public employee response - excludes sensitive data like email and phone"""
    id: int
    place_id: int
    name: str
    role: str
    specialty: Optional[str] = None
    color_code: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool
    working_hours: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
