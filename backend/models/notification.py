"""
Notification model for owner dashboard notifications.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
import enum


class NotificationTypeEnum(enum.Enum):
    NEW_BOOKING = "new_booking"
    CANCELLATION = "cancellation"
    DAILY_REMINDER = "daily_reminder"


class Notification(Base):
    """Notification model - maps to 'notifications' table"""
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    booking_id = Column(Integer, ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id', ondelete='SET NULL'), nullable=True, index=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships - temporarily simplified to avoid SQLAlchemy issues
    # owner = relationship("User", back_populates="notifications")
    # booking = relationship("Booking", back_populates="notifications")
    # place = relationship("Place", back_populates="notifications")

