"""
Campaign models for promotional campaigns and marketing features.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, DECIMAL, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Campaign(Base):
    """Campaign model for promotional campaigns"""
    __tablename__ = 'campaigns'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False) # Use places table instead of businesses
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)  # price_reduction, rewards_increase, free_service, messaging
    status = Column(String(20), nullable=True, default='draft')
    config = Column(JSON, nullable=True)
    automation_rules = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Timing and other fields are now in config JSON
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=True)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="campaigns")
    place = relationship("Place", back_populates="campaigns")
    campaign_places = relationship("CampaignPlace", back_populates="campaign", cascade="all, delete-orphan")
    campaign_services = relationship("CampaignService", back_populates="campaign", cascade="all, delete-orphan")
    campaign_recipients = relationship("CampaignRecipient", back_populates="campaign", cascade="all, delete-orphan")
    campaign_messages = relationship("CampaignMessage", back_populates="campaign", cascade="all, delete-orphan")
    
    @property
    def is_currently_active(self):
        """Check if campaign is currently active based on status and config"""
        from datetime import datetime
        
        def _parse_dt(value):
            """Parse datetime from multiple common formats to be robust to UI inputs."""
            if value is None:
                raise ValueError("empty datetime")
            if isinstance(value, datetime):
                return value
            text = str(value)
            try:
                return datetime.fromisoformat(text.replace('Z', '+00:00'))
            except Exception:
                pass
            # Fallback for formats like "11/3/2025, 5:31:00 PM"
            try:
                return datetime.strptime(text, "%m/%d/%Y, %I:%M:%S %p")
            except Exception:
                pass
            # Fallback for formats like "11/03/2025 17:31"
            try:
                return datetime.strptime(text, "%m/%d/%Y %H:%M")
            except Exception:
                pass
            raise ValueError(f"Unrecognized datetime format: {text}")

        now = datetime.utcnow()
        
        # Check if status is active
        if self.status != 'active':
            return False
            
        # Check timing from config if available
        if self.config and 'start_datetime' in self.config and 'end_datetime' in self.config:
            try:
                start = _parse_dt(self.config['start_datetime'])
                end = _parse_dt(self.config['end_datetime'])
                return start <= now <= end
            except (ValueError, TypeError):
                pass
                
        return True  # If no timing info, assume active if status is active


class CampaignPlace(Base):
    """Many-to-many relationship between campaigns and places"""
    __tablename__ = 'campaign_places'
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), nullable=False)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=True)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="campaign_places")
    place = relationship("Place", back_populates="campaign_places")


class CampaignService(Base):
    """Many-to-many relationship between campaigns and services"""
    __tablename__ = 'campaign_services'
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    place_service_id = Column(Integer, ForeignKey('place_services.id'), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=True)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="campaign_services")
    service = relationship("Service", back_populates="campaign_services")
    place_service = relationship("PlaceService", back_populates="campaign_services")


class CampaignRecipient(Base):
    """Campaign recipients for messaging campaigns"""
    __tablename__ = 'campaign_recipients'
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    customer_email = Column(String(100), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='pending')  # pending, sent, failed, bounced
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivery_status = Column(String(50), nullable=True)  # Twilio delivery status
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="campaign_recipients")
    user = relationship("User")


class CampaignMessage(Base):
    """Campaign messages for different channels (email, WhatsApp)"""
    __tablename__ = 'campaign_messages'
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), nullable=False)
    channel = Column(String(20), nullable=False)  # email, whatsapp
    subject = Column(String(255), nullable=True)  # For email campaigns
    message_body = Column(Text, nullable=False)
    template_variables = Column(JSON, nullable=True)  # For future template system
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="campaign_messages")
