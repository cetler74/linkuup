from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base

class Business(Base):
    """Business/Place model - maps to businesses table"""
    __tablename__ = 'businesses'
    
    id = Column(Integer, primary_key=True, index=True)
    subdomain = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    sector = Column(String(50), nullable=False)
    description = Column(Text)
    address = Column(String(500))
    city = Column(String(100))
    postal_code = Column(String(20))
    phone = Column(String(20))
    email = Column(String(100))
    logo_url = Column(Text)
    hero_images = Column(Text)
    primary_color = Column(String(7))
    secondary_color = Column(String(7))
    custom_domain = Column(String(200))
    booking_enabled = Column(Boolean, default=True, nullable=False)
    call_enabled = Column(Boolean, default=True, nullable=False)
    message_enabled = Column(Boolean, default=True, nullable=False)
    rewards_enabled = Column(Boolean, default=False, nullable=False)
    reviews_enabled = Column(Boolean, default=True, nullable=False)
    customers_enabled = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner_id = Column(Integer, nullable=False)
    
    # New columns for business owner features
    location_type = Column(String(20), default='fixed')
    service_areas = Column(JSON)  # JSON array for mobile places
    
    # Relationships
    employees = relationship('BusinessEmployee', back_populates='business', cascade='all, delete-orphan')
    services = relationship('BusinessService', back_populates='business', cascade='all, delete-orphan')
    bookings = relationship('BusinessBooking', back_populates='business', cascade='all, delete-orphan')
    messages = relationship('BusinessMessage', back_populates='business', cascade='all, delete-orphan')
    # campaigns = relationship('Campaign', back_populates='business', cascade='all, delete-orphan')  # Temporarily disabled due to missing foreign key
    employee_time_off = relationship('EmployeeTimeOff', back_populates='business', cascade='all, delete-orphan')
    closed_periods = relationship('BusinessClosedPeriod', back_populates='business', cascade='all, delete-orphan')
    
    def get_service_areas_list(self):
        """Get service areas as a list"""
        if self.service_areas:
            return self.service_areas
        return []
    
    def set_service_areas_list(self, areas):
        """Set service areas from a list"""
        self.service_areas = areas

class BusinessEmployee(Base):
    """Business Employee model"""
    __tablename__ = 'business_employees'
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(50), default='Employee')
    is_active = Column(Boolean, default=True)
    working_hours = Column(JSON)  # JSON for working hours
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    business = relationship('Business', back_populates='employees')
    services = relationship('BusinessEmployeeService', back_populates='employee', cascade='all, delete-orphan')
    bookings = relationship('BusinessBooking', back_populates='employee')
    time_off = relationship('EmployeeTimeOff', back_populates='employee', cascade='all, delete-orphan')
    
    def get_working_hours(self):
        """Get working hours as dict"""
        if self.working_hours:
            # If it's a string (JSON), parse it
            if isinstance(self.working_hours, str):
                import json
                try:
                    return json.loads(self.working_hours)
                except (json.JSONDecodeError, TypeError):
                    return {}
            # If it's already a dict, return it
            return self.working_hours
        return {}
    
    def set_working_hours(self, hours):
        """Set working hours from dict"""
        self.working_hours = hours

class BusinessService(Base):
    """Business Service model"""
    __tablename__ = 'business_services'
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(String(20), nullable=True)
    duration = Column(Integer, nullable=True)  # in minutes
    is_bookable = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    business = relationship('Business', back_populates='services')
    employees = relationship('BusinessEmployeeService', back_populates='service', cascade='all, delete-orphan')
    bookings = relationship('BusinessBooking', back_populates='service')

class BusinessEmployeeService(Base):
    """Many-to-many relationship between employees and services"""
    __tablename__ = 'business_employee_services'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('business_employees.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('business_services.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    employee = relationship('BusinessEmployee', back_populates='services')
    service = relationship('BusinessService', back_populates='employees')

class BusinessBooking(Base):
    """Business Booking model"""
    __tablename__ = 'business_bookings'
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('business_services.id'), nullable=True)
    employee_id = Column(Integer, ForeignKey('business_employees.id'), nullable=True)
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=True)
    booking_date = Column(DateTime(timezone=True), nullable=False)
    booking_time = Column(DateTime(timezone=True), nullable=False)
    duration = Column(Integer, nullable=True)  # in minutes
    status = Column(String(20), default='pending')  # pending, confirmed, cancelled, completed
    color_code = Column(String(7), nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(JSON, nullable=True)
    recurrence_end_date = Column(DateTime(timezone=True), nullable=True)
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    business = relationship('Business', back_populates='bookings')
    service = relationship('BusinessService', back_populates='bookings')
    employee = relationship('BusinessEmployee', back_populates='bookings')
    
    def get_recurrence_pattern(self):
        """Get recurrence pattern as dict"""
        if self.recurrence_pattern:
            return self.recurrence_pattern
        return {}
    
    def set_recurrence_pattern(self, pattern):
        """Set recurrence pattern from dict"""
        self.recurrence_pattern = pattern

class EmployeeTimeOff(Base):
    """Employee Time-off model"""
    __tablename__ = 'employee_time_off'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('business_employees.id'), nullable=False)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    time_off_type = Column(String(20), nullable=False)  # holiday, sick_leave, personal_day, vacation
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_full_day = Column(Boolean, default=True)
    half_day_period = Column(String(2), nullable=True)  # AM, PM
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(JSON, nullable=True)
    status = Column(String(20), default='pending')  # pending, approved, rejected, cancelled
    requested_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship('BusinessEmployee', back_populates='time_off')
    business = relationship('Business', back_populates='employee_time_off')
    # requester = relationship('User', foreign_keys=[requested_by], back_populates='requested_time_off')
    # approver = relationship('User', foreign_keys=[approved_by], back_populates='approved_time_off')
    
    def is_active_on_date(self, date):
        """Check if this time-off is active on a specific date"""
        if self.status != 'approved':
            return False
        
        if self.start_date <= date <= self.end_date:
            return True
        
        # Check recurring pattern
        if self.is_recurring and self.recurrence_pattern:
            pattern = self.get_recurrence_pattern()
            if pattern.get('frequency') == 'yearly':
                month = pattern.get('month')
                day = pattern.get('day')
                if month and day and date.month == month and date.day == day:
                    return True
        
        return False
    
    def conflicts_with(self, other_timeoff):
        """Check if this time-off conflicts with another time-off"""
        if self.employee_id != other_timeoff.employee_id:
            return False
        
        # Check date overlap
        if (self.start_date <= other_timeoff.end_date and 
            self.end_date >= other_timeoff.start_date):
            return True
        
        return False
    
    def get_recurrence_pattern(self):
        """Get recurrence pattern as dict"""
        if self.recurrence_pattern:
            return self.recurrence_pattern
        return {}
    
    def set_recurrence_pattern(self, pattern):
        """Set recurrence pattern from dict"""
        self.recurrence_pattern = pattern
    
    def expand_recurring_for_year(self, year):
        """Generate actual dates for a specific year if this is recurring"""
        if not self.is_recurring or not self.recurrence_pattern:
            return []
        
        pattern = self.get_recurrence_pattern()
        if pattern.get('frequency') == 'yearly':
            month = pattern.get('month')
            day = pattern.get('day')
            if month and day:
                try:
                    from datetime import date
                    return [date(year, month, day)]
                except ValueError:
                    return []
        
        return []

class BusinessClosedPeriod(Base):
    """Business-wide closed periods (public holidays, maintenance)"""
    __tablename__ = 'business_closed_periods'

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    name = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_full_day = Column(Boolean, default=True, nullable=False)
    half_day_period = Column(String(2), nullable=True)  # AM, PM
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_pattern = Column(JSON, nullable=True)
    status = Column(String(20), default='active')  # active, inactive
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    business = relationship('Business', back_populates='closed_periods')

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

class BusinessMessage(Base):
    """Business Message model"""
    __tablename__ = 'business_messages'
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String(100), nullable=True)
    customer_email = Column(String(100), nullable=False)
    sender_type = Column(String(20), nullable=False)  # customer, business
    sender_id = Column(Integer, nullable=True)
    message_type = Column(String(50), nullable=False)  # customer_message, business_reply, system_notification
    subject = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    template_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    parent_message_id = Column(Integer, nullable=True)
    attachments = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    business = relationship('Business', back_populates='messages')

# Campaign model moved to models/campaign.py