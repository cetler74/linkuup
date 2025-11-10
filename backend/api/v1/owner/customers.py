from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.user import User
from models.customer_existing import CustomerPlaceAssociation
from models.rewards import CustomerReward, RewardTransaction
# from models.business import BusinessBooking  # Temporarily disabled due to relationship issues
from models.place_existing import Booking
from schemas.customer import (
    CustomerResponse, 
    CustomerDetailResponse, 
    CustomerListResponse,
    CustomerSearchRequest,
    CustomerRewardAdjustment,
    CustomerCreateRequest,
    CSVImportResponse
)
from schemas.rewards import RewardTransactionResponse
from services.rewards_service import RewardsService
from services.customer_service import CustomerService

router = APIRouter()


@router.get("/places/{place_id}/customers", response_model=CustomerListResponse)
async def get_place_customers(
    place_id: int,
    search_term: Optional[str] = Query(None),
    tier_filter: Optional[str] = Query(None),
    booking_status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all customers for a specific place with filtering and pagination"""
    
    # Use the new customer service
    customer_service = CustomerService(db)
    return await customer_service.get_customers_for_place(
        place_id=place_id,
        search_term=search_term,
        tier_filter=tier_filter,
        booking_status_filter=booking_status_filter,
        page=page,
        page_size=page_size
    )


@router.get("/places/{place_id}/customers/{user_id}", response_model=CustomerDetailResponse)
async def get_customer_details(
    place_id: int,
    user_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific customer"""
    
    # Get user details first
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Use the customer service to get detailed information
    customer_service = CustomerService(db)
    customer_details = await customer_service.get_customer_details(place_id, user.email)
    
    if not customer_details:
        raise HTTPException(
            status_code=404,
            detail="Customer not found for this place"
        )
    
    return CustomerDetailResponse(**customer_details)


@router.post("/places/{place_id}/customers", response_model=CustomerResponse)
async def create_customer(
    place_id: int,
    customer_data: CustomerCreateRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a customer record manually"""
    
    customer_service = CustomerService(db)
    
    try:
        result = await customer_service.create_customer_manually(
            place_id=place_id,
            name=customer_data.name,
            email=customer_data.email,
            phone=customer_data.phone
        )
        
        # Return customer response in the same format as get_customers_for_place
        return CustomerResponse(
            user_id=result['user_id'],
            place_id=result['place_id'],
            user_name=result['user_name'],
            user_email=result['user_email'],
            user_phone=result['user_phone'],
            total_bookings=0,
            completed_bookings=0,
            last_booking_date=None,
            first_booking_date=None,
            points_balance=None,
            tier=None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")


@router.post("/places/{place_id}/customers/import-csv", response_model=CSVImportResponse)
async def import_customers_from_csv(
    place_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Import customers from CSV file"""
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    # Read file content
    try:
        csv_content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    customer_service = CustomerService(db)
    
    try:
        result = await customer_service.import_customers_from_csv(place_id, csv_content)
        return CSVImportResponse(
            total_rows=result['total_rows'],
            successful=result['successful'],
            failed=result['failed'],
            errors=result['errors']
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import customers: {str(e)}")


@router.post("/places/{place_id}/customers/sync")
async def sync_customer_data(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Sync customer data from existing bookings for a place"""
    
    customer_service = CustomerService(db)
    synced_count = await customer_service.sync_customer_data_from_bookings(place_id)
    
    return {
        "success": True,
        "message": f"Successfully synced {synced_count} customers from bookings",
        "synced_count": synced_count
    }


@router.put("/places/{place_id}/customers/{user_id}/rewards")
async def adjust_customer_rewards(
    place_id: int,
    user_id: int,
    adjustment: CustomerRewardAdjustment,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Manually adjust customer reward points"""
    
    # Get or create customer reward
    reward_query = select(CustomerReward).where(
        and_(
            CustomerReward.user_id == user_id,
            CustomerReward.place_id == place_id
        )
    )
    reward_result = await db.execute(reward_query)
    customer_reward = reward_result.scalar_one_or_none()
    
    if not customer_reward:
        # Create new customer reward record
        customer_reward = CustomerReward(
            user_id=user_id,
            place_id=place_id,
            points_balance=0,
            total_points_earned=0,
            total_points_redeemed=0,
            tier="bronze"
        )
        db.add(customer_reward)
        await db.commit()
        await db.refresh(customer_reward)
    
    # Update points
    old_balance = customer_reward.points_balance
    customer_reward.points_balance += adjustment.points_change
    
    # Update totals
    if adjustment.points_change > 0:
        customer_reward.total_points_earned += adjustment.points_change
    else:
        customer_reward.total_points_redeemed += abs(adjustment.points_change)
    
    # Update tier
    customer_reward.update_tier()
    
    # Create transaction record
    transaction = RewardTransaction(
        customer_reward_id=customer_reward.id,
        transaction_type=adjustment.transaction_type,
        points_change=adjustment.points_change,
        points_balance_after=customer_reward.points_balance,
        description=adjustment.description
    )
    
    db.add(transaction)
    await db.commit()
    await db.refresh(customer_reward)
    await db.refresh(transaction)
    
    return {
        "success": True,
        "message": f"Successfully adjusted points by {adjustment.points_change}",
        "new_balance": customer_reward.points_balance,
        "old_balance": old_balance,
        "tier": customer_reward.tier
    }


@router.get("/places/{place_id}/customers/{user_id}/reward-history", response_model=List[RewardTransactionResponse])
async def get_customer_reward_history(
    place_id: int,
    user_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get reward transaction history for a customer"""
    
    # Get customer reward
    reward_query = select(CustomerReward).where(
        and_(
            CustomerReward.user_id == user_id,
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
    ).order_by(desc(RewardTransaction.created_at))
    
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
