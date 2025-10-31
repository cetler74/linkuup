from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, date

from models.customer_existing import CustomerPlaceAssociation
from models.rewards import CustomerReward, RewardTransaction, RewardSetting
# from models.business import BusinessBooking  # Temporarily disabled due to relationship issues
from models.place_existing import Booking
from schemas.rewards import (
    PointsCalculationResponse, 
    RedemptionResponse, 
    RewardTransactionCreate,
    RedemptionRequest
)


class RewardsService:
    """Service for handling reward calculations, awarding, and redemption"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def calculate_points_for_booking(
        self, 
        booking_id: int, 
        service_price: Optional[Decimal] = None,
        service_id: Optional[int] = None,
        place_id: int = None
    ) -> PointsCalculationResponse:
        """Calculate points to award for a completed booking"""
        
        # Get reward settings for the place
        reward_settings = await self._get_reward_settings(place_id)
        if not reward_settings or not reward_settings.is_active:
            return PointsCalculationResponse(
                points_earned=0,
                calculation_method="disabled",
                details={"message": "Rewards not enabled for this place"}
            )
        
        # Get booking details to calculate total price
        from models.place_existing import Booking
        booking_query = select(Booking).where(Booking.id == booking_id)
        booking_result = await self.db.execute(booking_query)
        booking = booking_result.scalar_one_or_none()
        
        if not booking:
            return PointsCalculationResponse(
                points_earned=0,
                calculation_method="error",
                details={"message": "Booking not found"}
            )
        
        # Use booking total price if available, otherwise fall back to service_price
        total_price = booking.total_price or service_price
        
        if not total_price:
            return PointsCalculationResponse(
                points_earned=0,
                calculation_method="error",
                details={"message": "No price information available for booking"}
            )
        
        # Calculate points based on volume (points per euro)
        points_per_euro = reward_settings.points_per_currency_unit or 1
        points_earned = int(float(total_price) * float(points_per_euro))
        
        details = {
            "method": "Volume-based calculation",
            "total_price": float(total_price),
            "points_per_euro": float(points_per_euro),
            "calculation": f"{float(total_price)} × {float(points_per_euro)} = {points_earned}"
        }
        
        return PointsCalculationResponse(
            points_earned=points_earned,
            calculation_method="volume_based",
            details=details
        )
    
    async def award_points(
        self, 
        user_id: int, 
        place_id: int, 
        booking_id: int, 
        points: int,
        description: str = "Points earned from completed booking"
    ) -> bool:
        """Award points to a customer for a completed booking"""
        
        try:
            # Get or create customer reward record
            customer_reward = await self._get_or_create_customer_reward(user_id, place_id)
            
            # Update points
            customer_reward.points_balance += points
            customer_reward.total_points_earned += points
            
            # Update tier
            old_tier = customer_reward.tier
            customer_reward.update_tier()
            
            # Create transaction record
            transaction = RewardTransaction(
                customer_reward_id=customer_reward.id,
                booking_id=booking_id,
                transaction_type="earned",
                points_change=points,
                points_balance_after=customer_reward.points_balance,
                description=description
            )
            
            self.db.add(transaction)
            await self.db.commit()
            await self.db.refresh(customer_reward)
            await self.db.refresh(transaction)
            
            # Update customer place association
            await self._update_customer_association(user_id, place_id)
            
            return True
            
        except Exception as e:
            await self.db.rollback()
            print(f"Error awarding points: {e}")
            return False
    
    async def redeem_points(
        self, 
        user_id: int, 
        place_id: int, 
        redemption_request: RedemptionRequest
    ) -> RedemptionResponse:
        """Redeem points for a discount or free service"""
        
        try:
            # Get customer reward record
            customer_reward = await self._get_customer_reward(user_id, place_id)
            if not customer_reward:
                return RedemptionResponse(
                    success=False,
                    points_redeemed=0,
                    discount_amount=Decimal('0'),
                    new_balance=0,
                    message="Customer reward record not found"
                )
            
            # Get reward settings for redemption rules
            reward_settings = await self._get_reward_settings(place_id)
            if not reward_settings:
                return RedemptionResponse(
                    success=False,
                    points_redeemed=0,
                    discount_amount=Decimal('0'),
                    new_balance=customer_reward.points_balance,
                    message="Reward settings not found"
                )
            
            redemption_rules = reward_settings.get_redemption_rules()
            
            # Validate redemption
            if customer_reward.points_balance < redemption_request.points_to_redeem:
                return RedemptionResponse(
                    success=False,
                    points_redeemed=0,
                    discount_amount=Decimal('0'),
                    new_balance=customer_reward.points_balance,
                    message="Insufficient points"
                )
            
            if redemption_request.points_to_redeem < redemption_rules.get("min_points_to_redeem", 100):
                return RedemptionResponse(
                    success=False,
                    points_redeemed=0,
                    discount_amount=Decimal('0'),
                    new_balance=customer_reward.points_balance,
                    message=f"Minimum {redemption_rules.get('min_points_to_redeem', 100)} points required"
                )
            
            # Calculate discount amount
            redemption_rate = redemption_rules.get("redemption_rate", 100)
            discount_amount = Decimal(str(redemption_request.points_to_redeem / redemption_rate))
            
            # Update customer reward
            customer_reward.points_balance -= redemption_request.points_to_redeem
            customer_reward.total_points_redeemed += redemption_request.points_to_redeem
            
            # Create transaction record
            transaction = RewardTransaction(
                customer_reward_id=customer_reward.id,
                booking_id=redemption_request.booking_id,
                transaction_type="redeemed",
                points_change=-redemption_request.points_to_redeem,
                points_balance_after=customer_reward.points_balance,
                description=redemption_request.description or f"Redeemed {redemption_request.points_to_redeem} points"
            )
            
            self.db.add(transaction)
            await self.db.commit()
            await self.db.refresh(customer_reward)
            await self.db.refresh(transaction)
            
            return RedemptionResponse(
                success=True,
                points_redeemed=redemption_request.points_to_redeem,
                discount_amount=discount_amount,
                new_balance=customer_reward.points_balance,
                message=f"Successfully redeemed {redemption_request.points_to_redeem} points for ${discount_amount} discount"
            )
            
        except Exception as e:
            await self.db.rollback()
            print(f"Error redeeming points: {e}")
            return RedemptionResponse(
                success=False,
                points_redeemed=0,
                discount_amount=Decimal('0'),
                new_balance=0,
                message=f"Error redeeming points: {str(e)}"
            )
    
    async def get_customer_reward_summary(self, user_id: int, place_id: int) -> Optional[Dict[str, Any]]:
        """Get customer reward summary for a specific place"""
        
        customer_reward = await self._get_customer_reward(user_id, place_id)
        if not customer_reward:
            return None
        
        # Get recent transactions
        transactions_query = select(RewardTransaction).where(
            RewardTransaction.customer_reward_id == customer_reward.id
        ).order_by(RewardTransaction.created_at.desc()).limit(10)
        
        result = await self.db.execute(transactions_query)
        recent_transactions = result.scalars().all()
        
        return {
            "points_balance": customer_reward.points_balance,
            "total_points_earned": customer_reward.total_points_earned,
            "total_points_redeemed": customer_reward.total_points_redeemed,
            "tier": customer_reward.tier,
            "recent_transactions": [
                {
                    "id": t.id,
                    "transaction_type": t.transaction_type,
                    "points_change": t.points_change,
                    "description": t.description,
                    "created_at": t.created_at
                } for t in recent_transactions
            ]
        }
    
    async def _get_reward_settings(self, place_id: int) -> Optional[RewardSetting]:
        """Get reward settings for a place (place-specific or global)"""
        
        # First try to get place-specific settings
        query = select(RewardSetting).where(
            and_(
                RewardSetting.place_id == place_id,
                RewardSetting.is_active == True
            )
        )
        result = await self.db.execute(query)
        place_settings = result.scalar_one_or_none()
        
        if place_settings:
            return place_settings
        
        # If no place-specific settings, get global settings
        query = select(RewardSetting).where(
            and_(
                RewardSetting.place_id.is_(None),
                RewardSetting.is_active == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _get_customer_reward(self, user_id: int, place_id: int) -> Optional[CustomerReward]:
        """Get customer reward record"""
        
        query = select(CustomerReward).where(
            and_(
                CustomerReward.user_id == user_id,
                CustomerReward.place_id == place_id
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _get_or_create_customer_reward(self, user_id: int, place_id: int) -> CustomerReward:
        """Get or create customer reward record"""
        
        customer_reward = await self._get_customer_reward(user_id, place_id)
        
        if not customer_reward:
            customer_reward = CustomerReward(
                user_id=user_id,
                place_id=place_id,
                points_balance=0,
                total_points_earned=0,
                total_points_redeemed=0,
                tier="bronze"
            )
            self.db.add(customer_reward)
            await self.db.commit()
            await self.db.refresh(customer_reward)
        
        return customer_reward
    
    async def _update_customer_association(self, user_id: int, place_id: int):
        """Update customer place association with booking counts"""
        
        # Get or create association
        query = select(CustomerPlaceAssociation).where(
            and_(
                CustomerPlaceAssociation.user_id == user_id,
                CustomerPlaceAssociation.place_id == place_id
            )
        )
        result = await self.db.execute(query)
        association = result.scalar_one_or_none()
        
        if not association:
            association = CustomerPlaceAssociation(
                user_id=user_id,
                place_id=place_id,
                total_bookings=0
            )
            self.db.add(association)
        
        # Update booking counts
        association.total_bookings += 1
        association.last_booking_date = date.today()
        
        if not association.first_booking_date:
            association.first_booking_date = date.today()
        
        await self.db.commit()
    
    async def get_customer_reward(self, user_id: int, place_id: int) -> Optional[CustomerReward]:
        """Get customer reward record"""
        query = select(CustomerReward).where(
            and_(
                CustomerReward.user_id == user_id,
                CustomerReward.place_id == place_id
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_customer_reward(self, user_id: int, place_id: int, initial_points: int = 0) -> CustomerReward:
        """Create a new customer reward record"""
        customer_reward = CustomerReward(
            user_id=user_id,
            place_id=place_id,
            points_balance=initial_points,
            total_points_earned=initial_points,
            total_points_redeemed=0,
            tier="bronze"
        )
        self.db.add(customer_reward)
        await self.db.commit()
        await self.db.refresh(customer_reward)
        return customer_reward
    
    async def delete_customer_reward(self, user_id: int, place_id: int) -> bool:
        """Delete customer reward record"""
        query = select(CustomerReward).where(
            and_(
                CustomerReward.user_id == user_id,
                CustomerReward.place_id == place_id
            )
        )
        result = await self.db.execute(query)
        customer_reward = result.scalar_one_or_none()
        
        if customer_reward:
            await self.db.delete(customer_reward)
            await self.db.commit()
            return True
        return False