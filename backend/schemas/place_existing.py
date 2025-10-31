"""
Pydantic schemas for the existing database models.
These schemas match the existing 'places' table structure.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from schemas.place_employee import PlaceEmployeePublicResponse
from schemas.campaign import ActiveCampaignResponse


class PlaceImageResponse(BaseModel):
    """Response schema for place images"""
    id: int
    image_url: str
    image_alt: Optional[str] = None
    is_primary: bool = False
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PlaceServiceResponse(BaseModel):
    """Response schema for place services with pricing"""
    id: int
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_percentage: Optional[float] = None
    is_free: Optional[bool] = None
    applied_campaigns: Optional[List[int]] = None
    duration: Optional[int] = None
    is_bio_diamond: Optional[bool] = None
    is_available: Optional[bool] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PlaceEmployeeResponse(BaseModel):
    """Response schema for place employees"""
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    color_code: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True


class PlaceResponse(BaseModel):
    """Response schema for places"""
    id: int
    codigo: Optional[str] = None
    nome: str
    tipo: str
    pais: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    rua: Optional[str] = None
    porta: Optional[str] = None
    cod_postal: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_type: Optional[str] = 'fixed'
    coverage_radius: Optional[float] = None
    booking_enabled: bool
    is_bio_diamond: bool
    about: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    owner_id: Optional[int] = None
    images: Optional[List[PlaceImageResponse]] = []
    services: Optional[List[PlaceServiceResponse]] = []
    employees: Optional[List[PlaceEmployeePublicResponse]] = []
    active_campaigns: Optional[List[ActiveCampaignResponse]] = []
    reviews: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class ServiceResponse(BaseModel):
    """Response schema for services"""
    id: int
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    is_bio_diamond: Optional[bool] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PlaceCreate(BaseModel):
    """Schema for creating a new place"""
    codigo: Optional[str] = None
    nome: str
    tipo: str = "salon"
    pais: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    rua: Optional[str] = None
    porta: Optional[str] = None
    cod_postal: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_type: Optional[str] = 'fixed'
    coverage_radius: Optional[float] = None
    booking_enabled: bool = False
    is_bio_diamond: bool = False
    about: Optional[str] = None


class PlaceUpdate(BaseModel):
    """Schema for updating a place"""
    codigo: Optional[str] = None
    nome: Optional[str] = None
    tipo: Optional[str] = None
    pais: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    rua: Optional[str] = None
    porta: Optional[str] = None
    cod_postal: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_type: Optional[str] = None
    coverage_radius: Optional[float] = None
    booking_enabled: Optional[bool] = None
    is_bio_diamond: Optional[bool] = None
    about: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None


class PlaceBookingCreate(BaseModel):
    """Schema for creating a place booking"""
    service_ids: List[int]  # Changed to support multiple services
    employee_id: Optional[int] = None
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    booking_date: str  # YYYY-MM-DD format
    booking_time: str  # HH:MM format
    duration: Optional[int] = None  # Duration in minutes
    status: Optional[str] = "pending"  # pending, confirmed, cancelled, completed
    color_code: Optional[str] = None  # Hex color code for booking
    is_recurring: Optional[bool] = False  # Whether this is a recurring booking
    recurrence_pattern: Optional[dict] = None  # Recurrence pattern for recurring bookings
    recurrence_end_date: Optional[str] = None  # End date for recurring bookings
    notes: Optional[str] = None
    any_employee_selected: Optional[bool] = False  # New field to track if customer selected "any employee"
    
    # Campaign fields - optional, included if booking is made during an active campaign
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None


class PlaceBookingUpdate(BaseModel):
    """Schema for updating a place booking"""
    service_ids: Optional[List[int]] = None
    employee_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    booking_date: Optional[str] = None  # YYYY-MM-DD format
    booking_time: Optional[str] = None  # HH:MM format
    status: Optional[str] = None
    notes: Optional[str] = None
    any_employee_selected: Optional[bool] = None  # New field to track if customer selected "any employee"


class BookingServiceResponse(BaseModel):
    """Response schema for individual services in a booking"""
    service_id: int
    service_name: str
    service_price: float
    service_duration: int
    
    class Config:
        from_attributes = True


class PlaceBookingResponse(BaseModel):
    """Response schema for place bookings"""
    id: int
    place_id: int
    service_id: int
    employee_id: Optional[int] = None
    service_name: Optional[str] = None
    employee_name: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    booking_date: str
    booking_time: str
    duration: Optional[int] = None
    status: Optional[str] = None
    color_code: Optional[str] = None
    is_recurring: Optional[bool] = False
    recurrence_pattern: Optional[dict] = None
    recurrence_end_date: Optional[str] = None
    notes: Optional[str] = None
    any_employee_selected: Optional[bool] = False  # New field to track if customer selected "any employee"
    
    # Multi-service support
    services: Optional[List[BookingServiceResponse]] = []
    total_price: Optional[float] = None
    total_duration: Optional[int] = None
    
    # Campaign fields
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
