from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class UserType(str, Enum):
    CUSTOMER = "customer"
    BUSINESS_OWNER = "business_owner"
    EMPLOYEE = "employee"
    PLATFORM_ADMIN = "platform_admin"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    user_type: UserType = UserType.CUSTOMER
    gdpr_data_processing_consent: bool = False
    gdpr_marketing_consent: bool = False
    # New fields for owner subscription setup
    selected_plan_code: Optional[str] = None  # 'basic' | 'pro'
    place_id: Optional[int] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    user_type: UserType
    is_active: bool
    is_owner: bool
    is_admin: bool
    gdpr_data_processing_consent: bool
    gdpr_marketing_consent: bool
    trial_start: Optional[str] = None
    trial_end: Optional[str] = None
    trial_status: Optional[str] = None

class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse

class ValidateTokenResponse(BaseModel):
    valid: bool
    user: Optional[UserResponse] = None
    expires_at: Optional[str] = None

class LogoutResponse(BaseModel):
    message: str = "Logout successful"
