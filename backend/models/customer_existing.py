"""
Customer management models using existing database tables.
This works with the existing 'places', 'users', and 'bookings' tables.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class CustomerPlaceAssociation(Base):
    """Customer-Place association using existing tables"""
    __tablename__ = 'customer_place_associations'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    first_booking_date = Column(Date, nullable=True)
    last_booking_date = Column(Date, nullable=True)
    total_bookings = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships (commented out to avoid circular imports)
    # user = relationship("User")
    # place = relationship("Place")


# Reward models moved to rewards.py to avoid conflicts


class PlaceFeatureSetting(Base):
    """Place feature settings using existing tables"""
    __tablename__ = 'place_feature_settings'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    bookings_enabled = Column(Boolean, nullable=False, default=True)
    rewards_enabled = Column(Boolean, nullable=False, default=False)
    time_off_enabled = Column(Boolean, nullable=False, default=True)
    campaigns_enabled = Column(Boolean, nullable=False, default=True)
    messaging_enabled = Column(Boolean, nullable=False, default=True)
    notifications_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    # place = relationship("Place")  # Commented out to avoid relationship conflicts
