from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional, Dict, Any
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.rewards import CustomerReward, RewardTransaction
from schemas.rewards import (
    CustomerRewardResponse,
    RewardTransactionResponse,
    RedemptionRequest,
    RedemptionResponse
)
from services.rewards_service import RewardsService

router = APIRouter()


@router.get("/", response_model=List[CustomerRewardResponse])
async def get_customer_rewards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get customer rewards across all places"""
    
    # Get all customer rewards for this user
    query = select(CustomerReward).where(CustomerReward.user_id == current_user.id)
    result = await db.execute(query)
    customer_rewards = result.scalars().all()
    
    return [
        CustomerRewardResponse(
            id=reward.id,
            user_id=reward.user_id,
            place_id=reward.place_id,
            points_balance=reward.points_balance,
            total_points_earned=reward.total_points_earned,
            total_points_redeemed=reward.total_points_redeemed,
            tier=reward.tier,
            created_at=reward.created_at,
            updated_at=reward.updated_at
        ) for reward in customer_rewards
    ]


@router.get("/{place_id}", response_model=Optional[CustomerRewardResponse])
async def get_customer_rewards_for_place(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get customer rewards for a specific place"""
    
    query = select(CustomerReward).where(
        and_(
            CustomerReward.user_id == current_user.id,
            CustomerReward.place_id == place_id
        )
    )
    result = await db.execute(query)
    customer_reward = result.scalar_one_or_none()
    
    if not customer_reward:
        return None
    
    return CustomerRewardResponse(
        id=customer_reward.id,
        user_id=customer_reward.user_id,
        place_id=customer_reward.place_id,
        points_balance=customer_reward.points_balance,
        total_points_earned=customer_reward.total_points_earned,
        total_points_redeemed=customer_reward.total_points_redeemed,
        tier=customer_reward.tier,
        created_at=customer_reward.created_at,
        updated_at=customer_reward.updated_at
    )


@router.get("/{place_id}/transactions", response_model=List[RewardTransactionResponse])
async def get_customer_reward_transactions(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get reward transaction history for a specific place"""
    
    # Get customer reward
    reward_query = select(CustomerReward).where(
        and_(
            CustomerReward.user_id == current_user.id,
            CustomerReward.place_id == place_id
        )
    )
    reward_result = await db.execute(reward_query)
    customer_reward = reward_result.scalar_one_or_none()
    
    if not customer_reward:
        return []
    
    # Get transactions
    transactions_query = select(RewardTransaction).where(
        RewardTransaction.customer_reward_id == customer_reward.id
    ).order_by(RewardTransaction.created_at.desc())
    
    transactions_result = await db.execute(transactions_query)
    transactions = transactions_result.scalars().all()
    
    return [
        RewardTransactionResponse(
            id=transaction.id,
            customer_reward_id=transaction.customer_reward_id,
            booking_id=transaction.booking_id,
            transaction_type=transaction.transaction_type,
            points_change=transaction.points_change,
            points_balance_after=transaction.points_balance_after,
            description=transaction.description,
            created_at=transaction.created_at
        ) for transaction in transactions
    ]


@router.post("/{place_id}/redeem", response_model=RedemptionResponse)
async def redeem_points(
    place_id: int,
    redemption_request: RedemptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Redeem points for a discount or free service"""
    
    rewards_service = RewardsService(db)
    
    return await rewards_service.redeem_points(
        user_id=current_user.id,
        place_id=place_id,
        redemption_request=redemption_request
    )


@router.post("/{place_id}/opt-in")
async def opt_in_to_rewards(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Opt-in to rewards program for a specific place"""
    
    rewards_service = RewardsService(db)
    
    # Check if customer already has rewards for this place
    existing_reward = await rewards_service.get_customer_reward(current_user.id, place_id)
    
    if existing_reward:
        return {"message": "Already opted in to rewards program", "status": "already_opted_in"}
    
    # Create new customer reward entry
    customer_reward = await rewards_service.create_customer_reward(
        user_id=current_user.id,
        place_id=place_id,
        initial_points=0
    )
    
    return {
        "message": "Successfully opted in to rewards program",
        "status": "opted_in",
        "reward_id": customer_reward.id
    }


@router.delete("/{place_id}/opt-out")
async def opt_out_of_rewards(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Opt-out of rewards program for a specific place"""
    
    rewards_service = RewardsService(db)
    
    # Check if customer has rewards for this place
    existing_reward = await rewards_service.get_customer_reward(current_user.id, place_id)
    
    if not existing_reward:
        return {"message": "Not currently opted in to rewards program", "status": "not_opted_in"}
    
    # Delete the customer reward entry
    await rewards_service.delete_customer_reward(current_user.id, place_id)
    
    return {
        "message": "Successfully opted out of rewards program",
        "status": "opted_out"
    }


@router.get("/{place_id}/summary")
async def get_customer_reward_summary(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed reward summary for a specific place"""
    
    rewards_service = RewardsService(db)
    
    summary = await rewards_service.get_customer_reward_summary(
        user_id=current_user.id,
        place_id=place_id
    )
    
    if not summary:
        return {
            "message": "No rewards found for this place",
            "points_balance": 0,
            "tier": "bronze",
            "recent_transactions": []
        }
    
    return summary