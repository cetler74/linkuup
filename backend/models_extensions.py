"""
Database model extensions for mobile API support
This file contains the column additions needed for mobile features
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from datetime import datetime

def add_mobile_columns_to_models(db):
    """
    Add mobile-specific columns to existing models
    This should be called during database initialization
    """
    
    # User model extensions
    user_extensions = {
        'refresh_token': Column(String(200), unique=True, nullable=True),
        'token_expires_at': Column(DateTime, nullable=True),
        'refresh_token_expires_at': Column(DateTime, nullable=True),
        'last_login_at': Column(DateTime, nullable=True),
        'updated_at': Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    }
    
    # Salon model extensions
    salon_extensions = {
        'updated_at': Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    }
    
    # Service model extensions
    service_extensions = {
        'updated_at': Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    }
    
    # Booking model extensions
    booking_extensions = {
        'updated_at': Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
        'sync_version': Column(Integer, default=1)
    }
    
    return {
        'User': user_extensions,
        'Salon': salon_extensions,
        'Service': service_extensions,
        'Booking': booking_extensions
    }

# Device token model for push notifications (future)
class DeviceToken(db.Model):
    """Store device tokens for push notifications"""
    __tablename__ = 'device_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    device_id = db.Column(db.String(200), unique=True, nullable=False)
    token = db.Column(db.String(500), nullable=False)
    platform = db.Column(db.String(20))  # 'ios' or 'android'
    app_version = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    user = db.relationship('User', backref='device_tokens')

