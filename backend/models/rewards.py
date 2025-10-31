"""
Reward models for customer loyalty and rewards system.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class CustomerReward(Base):
    """Customer reward model - maps to existing 'customer_rewards' table"""
    __tablename__ = 'customer_rewards'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=False)
    points_balance = Column(Integer, nullable=False)
    total_points_earned = Column(Integer, nullable=False)
    total_points_redeemed = Column(Integer, nullable=False)
    tier = Column(String(20), nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    
    # Relationships - temporarily simplified
    # user = relationship("User", back_populates="customer_rewards")
    # place = relationship("Place", back_populates="customer_rewards")
    reward_transactions = relationship("RewardTransaction", back_populates="customer_reward", cascade="all, delete-orphan")
    
    def update_tier(self):
        """Update customer tier based on total points earned"""
        if self.total_points_earned >= 1000:
            self.tier = "platinum"
        elif self.total_points_earned >= 500:
            self.tier = "gold"
        elif self.total_points_earned >= 100:
            self.tier = "silver"
        else:
            self.tier = "bronze"


class RewardTransaction(Base):
    """Reward transaction model - maps to existing 'reward_transactions' table"""
    __tablename__ = 'reward_transactions'
    
    id = Column(Integer, primary_key=True, index=True)
    customer_reward_id = Column(Integer, ForeignKey('customer_rewards.id'), nullable=False)
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True)
    transaction_type = Column(String(20), nullable=False)  # earned, redeemed, expired, adjusted
    points_change = Column(Integer, nullable=False)
    points_balance_after = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    
    # Relationships - temporarily simplified
    customer_reward = relationship("CustomerReward", back_populates="reward_transactions")
    # booking = relationship("Booking", back_populates="reward_transactions")


class RewardSetting(Base):
    """Reward setting model - maps to existing 'reward_settings' table"""
    __tablename__ = 'reward_settings'
    
    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey('places.id'), nullable=True)
    calculation_method = Column(String(30), nullable=False, default="volume_based")  # volume_based calculation
    points_per_booking = Column(Integer, nullable=True)  # Kept for backward compatibility
    points_per_currency_unit = Column(Integer, nullable=True)  # Points per euro spent
    redemption_rules = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    
    # Relationships - temporarily simplified
    # place = relationship("Place", back_populates="reward_settings")
    
    def get_redemption_rules(self):
        """Get redemption rules as a dictionary"""
        import json
        if self.redemption_rules:
            try:
                return json.loads(self.redemption_rules)
            except:
                pass
        
        # Return default redemption rules
        return {
            "min_points_to_redeem": 100,
            "redemption_rate": 100,  # 100 points = $1 discount
            "max_points_per_redemption": 1000
        }
