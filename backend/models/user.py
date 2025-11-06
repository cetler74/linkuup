from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import enum
import uuid

class UserTypeEnum(enum.Enum):
    CUSTOMER = "customer"
    BUSINESS_OWNER = "business_owner"
    EMPLOYEE = "employee"
    PLATFORM_ADMIN = "platform_admin"

class User(Base):
    """User model - maps to existing 'users' table"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    name = Column(String(100), nullable=False)
    customer_id = Column(String(50), nullable=True)
    auth_token = Column(String(200), nullable=True)
    is_admin = Column(Boolean, nullable=True, default=False)
    is_active = Column(Boolean, nullable=True, default=True)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    user_type = Column(String(20), nullable=False, default='customer')
    is_business_owner = Column(Boolean, nullable=True, default=False)
    is_owner = Column(Boolean, nullable=True, default=False)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=True), nullable=True, server_default=func.current_timestamp())
    refresh_token = Column(String(200), nullable=True)
    token_expires_at = Column(DateTime(timezone=False), nullable=True)
    refresh_token_expires_at = Column(DateTime(timezone=False), nullable=True)
    last_login_at = Column(DateTime(timezone=False), nullable=True)
    
    # GDPR fields - matches existing schema
    gdpr_data_processing_consent = Column(Boolean, nullable=True, default=False)
    gdpr_data_processing_consent_date = Column(DateTime(timezone=False), nullable=True)
    gdpr_marketing_consent = Column(Boolean, nullable=True, default=False)
    gdpr_marketing_consent_date = Column(DateTime(timezone=False), nullable=True)
    gdpr_consent_version = Column(String(10), nullable=True, default='1.0')
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)
    oauth_id = Column(String(100), nullable=True)
    # profile_picture column - uncomment after running migration
    # profile_picture = Column(String(500), nullable=True)  # Profile picture URL from OAuth providers
    
    # Additional fields for compatibility (computed properties)
    @property
    def full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.name
    
    @property
    def is_business_owner_property(self):
        return self.user_type == 'business_owner' or self.is_business_owner or self.is_owner
    
    @property
    def is_owner_property(self):
        return self.user_type == 'business_owner' or self.is_owner
    
    @property
    def is_admin_property(self):
        return self.is_admin
    
    # Relationships - temporarily simplified
    # owned_places = relationship("Place", back_populates="owner")
    # managed_places = relationship("PlaceManager", back_populates="user")
    # bookings = relationship("Booking", back_populates="user")
    # reviews = relationship("Review", back_populates="user")  # No foreign key in reviews table
    campaigns = relationship("Campaign", back_populates="owner")
    # customer_rewards = relationship("CustomerReward", back_populates="user", cascade="all, delete-orphan")
    
    # Time-off relationships - temporarily commented out due to import issues
    # requested_time_off = relationship("EmployeeTimeOff", foreign_keys="EmployeeTimeOff.requested_by", back_populates="requester")
    # approved_time_off = relationship("EmployeeTimeOff", foreign_keys="EmployeeTimeOff.approved_by", back_populates="approver")
    
    def __repr__(self):
        return f'<User {self.id}: {self.email}>'

    # Trial fields for billing
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    trial_status = Column(String(20), nullable=True, default='active')
    
    # Password reset fields
    password_reset_token = Column(String(500), nullable=True)  # JWT tokens can be longer than 200 chars
    password_reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Language preference for email notifications
    language_preference = Column(String(10), nullable=True, default='en')  # en, pt, es, fr, de, it