from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any

class BusinessBase(BaseModel):
    name: str
    sector: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class BusinessCreate(BusinessBase):
    location_type: str = "fixed"
    booking_enabled: bool = True
    call_enabled: bool = True
    message_enabled: bool = True
    rewards_enabled: bool = False
    reviews_enabled: bool = True
    customers_enabled: bool = False
    service_areas: Optional[List[str]] = None

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    location_type: Optional[str] = None
    booking_enabled: Optional[bool] = None
    call_enabled: Optional[bool] = None
    message_enabled: Optional[bool] = None
    rewards_enabled: Optional[bool] = None
    reviews_enabled: Optional[bool] = None
    customers_enabled: Optional[bool] = None
    service_areas: Optional[List[str]] = None

class BusinessResponse(BusinessBase):
    id: int
    subdomain: str
    location_type: str
    booking_enabled: bool
    call_enabled: bool
    message_enabled: bool
    rewards_enabled: bool
    reviews_enabled: bool
    customers_enabled: bool
    is_active: bool
    service_areas: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class BusinessEmployeeBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: str = "Employee"

class BusinessEmployeeCreate(BusinessEmployeeBase):
    working_hours: Optional[Dict[str, Any]] = None

class BusinessEmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    working_hours: Optional[Dict[str, Any]] = None

class BusinessEmployeeResponse(BusinessEmployeeBase):
    id: int
    business_id: int
    is_active: bool
    working_hours: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BusinessServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[str] = None
    duration: Optional[int] = None
    is_bookable: bool = True

class BusinessServiceCreate(BusinessServiceBase):
    pass

class BusinessServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    duration: Optional[int] = None
    is_bookable: Optional[bool] = None
    is_active: Optional[bool] = None

class BusinessServiceResponse(BusinessServiceBase):
    id: int
    business_id: int
    is_active: bool
    assigned_employees: List[str] = []
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BusinessBookingBase(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    booking_date: datetime
    booking_time: datetime
    duration: Optional[int] = None
    status: str = "pending"

class BusinessBookingCreate(BusinessBookingBase):
    business_id: int
    service_id: int
    employee_id: int  # Required - every booking must be associated with an employee
    color_code: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[Dict[str, Any]] = None
    recurrence_end_date: Optional[datetime] = None

class BusinessBookingUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    employee_id: Optional[int] = None
    booking_date: Optional[datetime] = None
    booking_time: Optional[datetime] = None
    duration: Optional[int] = None
    status: Optional[str] = None
    color_code: Optional[str] = None

class BusinessBookingResponse(BusinessBookingBase):
    id: int
    business_id: int
    business_name: Optional[str] = None
    service_id: int
    employee_id: Optional[int] = None
    service_name: Optional[str] = None
    employee_name: Optional[str] = None
    color_code: Optional[str] = None
    is_recurring: bool
    recurrence_pattern: Dict[str, Any]
    reminder_sent: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BusinessMessageBase(BaseModel):
    customer_email: EmailStr
    customer_name: Optional[str] = None
    subject: Optional[str] = None
    content: str
    message_type: str = "customer_message"

class BusinessMessageCreate(BusinessMessageBase):
    business_id: int
    template_id: Optional[int] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    parent_message_id: Optional[int] = None

class BusinessMessageResponse(BusinessMessageBase):
    id: int
    business_id: int
    customer_id: Optional[int] = None
    sender_type: str
    sender_id: Optional[int] = None
    template_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    parent_message_id: Optional[int] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str  # marketing, promotion, notification
    status: str = "draft"

class CampaignCreate(CampaignBase):
    business_id: int
    config: Optional[Dict[str, Any]] = None
    automation_rules: Optional[Dict[str, Any]] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    automation_rules: Optional[Dict[str, Any]] = None

class CampaignResponse(CampaignBase):
    id: int
    business_id: int
    business_name: Optional[str] = None
    config: Dict[str, Any]
    automation_rules: Dict[str, Any]
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
