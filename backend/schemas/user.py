from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    customer_id: Optional[str] = None
    gdpr_data_processing_consent: bool
    gdpr_marketing_consent: bool = False

class UserResponse(UserBase):
    id: int
    is_admin: bool
    is_business_owner: bool
    user_type: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    gdpr_marketing_consent: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    user_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserMe(BaseModel):
    id: int
    email: EmailStr
    name: str
    customer_id: Optional[str]
    is_admin: bool
    is_business_owner: bool
    user_type: str
    gdpr_data_processing_consent: bool
    gdpr_marketing_consent: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
