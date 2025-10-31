from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from core.database import Base

class UserFeaturePermission(Base):
    """User-level feature permissions for billing and access control"""
    __tablename__ = 'user_feature_permissions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # Removed foreign key constraint temporarily
    feature_name = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'feature_name', name='uq_user_feature'),
    )
