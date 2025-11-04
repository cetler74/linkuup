"""
Place model that matches the existing database schema.
This model works with the existing 'places' table in the database.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Float, ForeignKey, Date, Time, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Place(Base):
    """Place model - maps to existing 'places' table"""
    __tablename__ = 'places'
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=True)
    nome = Column(String(200), nullable=False)
    slug = Column(String(50), nullable=True)  # Made nullable until migration is run (unique/index will be added by migration)
    tipo = Column(String(50), nullable=False, default='salon')
    pais = Column(String(100), nullable=True)
    nif = Column(String(50), nullable=True)
    estado = Column(String(20), nullable=True)
    telefone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    instagram = Column(String(200), nullable=True)
    pais_morada = Column(String(100), nullable=True)
    regiao = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    rua = Column(String(200), nullable=True)
    porta = Column(String(20), nullable=True)
    cod_postal = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    # fixed or mobile; determines whether to show coverage area on maps
    location_type = Column(String(20), nullable=False, default='fixed')
    coverage_radius = Column(Float, nullable=True, default=10.0) # Coverage radius in kilometers for mobile places
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    booking_enabled = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_bio_diamond = Column(Boolean, default=False)
    about = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    working_hours = Column(JSON, nullable=False, server_default='{}') # Default to empty JSON object
    
    def get_working_hours(self):
        """Get working hours as dict"""
        # Handle None case
        if self.working_hours is None:
            return {}
        
        # If it's a string (JSON), parse it
        if isinstance(self.working_hours, str):
            import json
            try:
                parsed = json.loads(self.working_hours)
                return parsed if isinstance(parsed, dict) else {}
            except (json.JSONDecodeError, TypeError):
                return {}
        
        # If it's already a dict, return it
        if isinstance(self.working_hours, dict):
            return self.working_hours
        
        # Fallback for any other type
        return {}
    
    def set_working_hours(self, hours):
        """Set working hours from dict"""
        self.working_hours = hours
    
    # Relationships - temporarily simplified to avoid SQLAlchemy issues
    # owner = relationship("User", back_populates="owned_places")
    # images = relationship("PlaceImage", back_populates="place", cascade="all, delete-orphan")
    # services = relationship("PlaceService", back_populates="place", cascade="all, delete-orphan")
    # managers = relationship("PlaceManager", back_populates="place", cascade="all, delete-orphan")
    # bookings = relationship("Booking", back_populates="place", cascade="all, delete-orphan")
    # reviews = relationship("Review", back_populates="place", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="place")
    campaign_places = relationship("CampaignPlace", back_populates="place")
    # customer_rewards = relationship("CustomerReward", back_populates="place", cascade="all, delete-orphan")
    # reward_settings = relationship("RewardSetting", back_populates="place", cascade="all, delete-orphan")
    # employees = relationship("PlaceEmployee", back_populates="place", cascade="all, delete-orphan")
    


class Service(Base):
    """Service model - maps to existing 'services' table"""
    __tablename__ = 'services'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_bio_diamond = Column(Boolean, nullable=True)
    updated_at = Column(DateTime(timezone=False), nullable=True)
    
    # Relationships - temporarily simplified
    # place_services = relationship("PlaceService", back_populates="service", cascade="all, delete-orphan")
    # bookings = relationship("Booking", back_populates="service", cascade="all, delete-orphan")
    campaign_services = relationship("CampaignService", back_populates="service")


class PlaceService(Base):
    """PlaceService model - maps to existing 'place_services' table"""
    __tablename__ = 'place_services'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    price = Column(Float, nullable=True)
    duration = Column(Integer, nullable=True)  # in minutes
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="services")
    # service = relationship("Service", back_populates="place_services")
    campaign_services = relationship("CampaignService", back_populates="place_service")


class PlaceImage(Base):
    """PlaceImage model - maps to existing 'place_images' table"""
    __tablename__ = 'place_images'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    image_url = Column(String(500), nullable=False)
    alt_text = Column(String(200), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="images")


class PlaceManager(Base):
    """PlaceManager model - maps to existing 'place_managers' table"""
    __tablename__ = 'place_managers'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    role = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="managers")
    # user = relationship("User", back_populates="managed_places")


class Booking(Base):
    """Booking model - maps to existing 'bookings' table"""
    __tablename__ = 'bookings'
    
    id = Column(Integer, primary_key=True, index=True)
    salon_id = Column(Integer, nullable=False)
    place_id = Column(Integer, nullable=True)  # New column for places compatibility
    service_id = Column(Integer, nullable=False)
    employee_id = Column(Integer, nullable=True)  # New column for employee assignment
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=True)
    booking_date = Column(Date, nullable=False)
    booking_time = Column(Time, nullable=False)
    duration = Column(Integer, nullable=True)
    status = Column(String(20), nullable=True)
    color_code = Column(String(7), nullable=True)  # Hex color code for booking
    is_recurring = Column(Boolean, nullable=True, default=False)  # Whether this is a recurring booking
    recurrence_pattern = Column(JSON, nullable=True)  # Recurrence pattern for recurring bookings
    recurrence_end_date = Column(DateTime(timezone=False), nullable=True)  # End date for recurring bookings
    any_employee_selected = Column(Boolean, nullable=True, default=False)  # New field for tracking if customer selected "any employee"
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Foreign key to users table
    rewards_points_earned = Column(Integer, nullable=True)
    rewards_points_redeemed = Column(Integer, nullable=True)
    
    # New fields for multi-service bookings
    total_price = Column(DECIMAL(10, 2), nullable=True)  # Total price for all services
    total_duration = Column(Integer, nullable=True)  # Total duration for all services
    
    # Campaign fields - snapshot of campaign data at booking time
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), nullable=True)
    campaign_name = Column(String(200), nullable=True)
    campaign_type = Column(String(50), nullable=True)
    campaign_discount_type = Column(String(50), nullable=True)
    campaign_discount_value = Column(DECIMAL(10, 2), nullable=True)
    campaign_banner_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    sync_version = Column(Integer, nullable=True)
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="bookings", foreign_keys=[place_id], primaryjoin="Booking.place_id == Place.id")
    # service = relationship("Service", back_populates="bookings")
    # user = relationship("User", back_populates="bookings")
    # reward_transactions = relationship("RewardTransaction", back_populates="booking")


class BookingService(Base):
    """Booking Service model - maps to booking_services table for multi-service bookings"""
    __tablename__ = 'booking_services'
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False)
    service_id = Column(Integer, nullable=False)
    service_name = Column(String(200), nullable=True)
    service_price = Column(DECIMAL(10, 2), nullable=True)
    service_duration = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    
    # Relationships
    # booking = relationship("Booking", back_populates="booking_services")


class Review(Base):
    """Review model - maps to existing 'reviews' table"""
    __tablename__ = 'reviews'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)  # Column is place_id in DB
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False)
    title = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    is_verified = Column(Boolean, default=False)
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="reviews")
    # user = relationship("User", back_populates="reviews")  # No foreign key in reviews table


class PlaceEmployee(Base):
    """Place Employee model - maps to existing 'place_employees' table"""
    __tablename__ = 'place_employees'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), default='Employee')
    specialty = Column(String(100), nullable=True)  # e.g., "Haircuts", "Manicure", "Pedicure", "Facial", etc.
    color_code = Column(String(7), nullable=True)  # Hex color code for employee
    photo_url = Column(String(500), nullable=True)  # URL for employee photo
    is_active = Column(Boolean, default=True)
    working_hours = Column(JSON, nullable=True)  # JSON for working hours
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    
    def get_working_hours(self):
        """Get working hours as dict"""
        # Handle None case
        if self.working_hours is None:
            return {}
        
        # If it's a string (JSON), parse it
        if isinstance(self.working_hours, str):
            import json
            try:
                parsed = json.loads(self.working_hours)
                return parsed if isinstance(parsed, dict) else {}
            except (json.JSONDecodeError, TypeError):
                return {}
        
        # If it's already a dict, return it
        if isinstance(self.working_hours, dict):
            return self.working_hours
        
        # Fallback for any other type
        return {}
    
    def set_working_hours(self, hours):
        """Set working hours from dict"""
        self.working_hours = hours
    
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="employees")


class EmployeeService(Base):
    """Junction table for employee-service relationships"""
    __tablename__ = 'employee_services'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('place_employees.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    
    # Relationships
    employee = relationship("PlaceEmployee")
    service = relationship("Service")
    

class PlaceClosedPeriod(Base):
    """Place-wide closed periods (public holidays, maintenance)"""
    __tablename__ = 'place_closed_periods'

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    name = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_full_day = Column(Boolean, default=True, nullable=False)
    half_day_period = Column(String(2), nullable=True)  # AM, PM
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_pattern = Column(JSON, nullable=True)
    status = Column(String(20), default='active')  # active, inactive
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())

    def is_active_on_date(self, date_value):
        if self.status != 'active':
            return False
        if self.start_date <= date_value <= self.end_date:
            return True
        if self.is_recurring and self.recurrence_pattern:
            pattern = self.recurrence_pattern or {}
            if pattern.get('frequency') == 'yearly':
                month = pattern.get('month')
                day = pattern.get('day')
                if month and day and date_value.month == month and date_value.day == day:
                    return True
        return False


class PlaceEmployeeTimeOff(Base):
    """Place-scoped employee time-off for availability checks"""
    __tablename__ = 'place_employee_time_off'

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    employee_id = Column(Integer, ForeignKey('place_employees.id'), nullable=False)
    time_off_type = Column(String(20), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_full_day = Column(Boolean, default=True, nullable=False)
    half_day_period = Column(String(2), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_pattern = Column(JSON, nullable=True)
    status = Column(String(20), default='approved')
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())
    updated_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())

    def is_active_on_date(self, date_value):
        if self.status != 'approved':
            return False
        if self.start_date <= date_value <= self.end_date:
            return True
        if self.is_recurring and self.recurrence_pattern:
            pattern = self.recurrence_pattern or {}
            if pattern.get('frequency') == 'yearly':
                month = pattern.get('month')
                day = pattern.get('day')
                if month and day and date_value.month == month and date_value.day == day:
                    return True
        return False
