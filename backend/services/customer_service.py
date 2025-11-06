"""
Customer Service
Handles automatic customer data population from bookings and customer management
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, case
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from models.customer_existing import CustomerPlaceAssociation
from models.place_existing import Booking, Place, Service
from models.user import User
from models.rewards import CustomerReward
from schemas.customer import CustomerResponse, CustomerListResponse


class CustomerService:
    """Service for managing customer data and automatic population from bookings"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def populate_customer_from_booking(self, booking: Booking) -> CustomerPlaceAssociation:
        """
        Create or update customer-place association from a booking
        This is called whenever a new booking is created
        """
        # Check if customer-place association already exists
        existing_query = select(CustomerPlaceAssociation).where(
            and_(
                CustomerPlaceAssociation.user_id == booking.user_id,
                CustomerPlaceAssociation.place_id == booking.place_id
            )
        )
        result = await self.db.execute(existing_query)
        association = result.scalar_one_or_none()
        
        if association:
            # Update existing association
            association.last_booking_date = booking.booking_date
            association.total_bookings += 1
            
            # Update first booking date if this is earlier
            if not association.first_booking_date or booking.booking_date < association.first_booking_date:
                association.first_booking_date = booking.booking_date
        else:
            # Create new association
            association = CustomerPlaceAssociation(
                user_id=booking.user_id,
                place_id=booking.place_id,
                first_booking_date=booking.booking_date,
                last_booking_date=booking.booking_date,
                total_bookings=1
            )
            self.db.add(association)
        
        await self.db.commit()
        await self.db.refresh(association)
        return association
    
    async def get_customers_for_place(
        self, 
        place_id: int, 
        search_term: Optional[str] = None,
        tier_filter: Optional[str] = None,
        booking_status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> CustomerListResponse:
        """
        Get customers for a place with filtering and pagination
        This method aggregates data from bookings to create customer records
        """
        offset = (page - 1) * page_size
        
        # Build base query to get unique customers from bookings
        base_query = select(
            Booking.customer_email,
            Booking.customer_name,
            Booking.customer_phone,
            Booking.place_id,
            func.min(Booking.booking_date).label('first_booking_date'),
            func.max(Booking.booking_date).label('last_booking_date'),
            func.count(Booking.id).label('total_bookings'),
            func.sum(
                case(
                    (Booking.status == 'completed', 1),
                    else_=0
                )
            ).label('completed_bookings')
        ).where(
            Booking.place_id == place_id
        ).group_by(
            Booking.customer_email, 
            Booking.customer_name, 
            Booking.customer_phone,
            Booking.place_id
        )
        
        # Apply search filter
        if search_term:
            base_query = base_query.where(
                or_(
                    Booking.customer_name.ilike(f"%{search_term}%"),
                    Booking.customer_email.ilike(f"%{search_term}%")
                )
            )
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar()
        
        # Apply pagination and ordering
        base_query = base_query.order_by(desc('last_booking_date')).offset(offset).limit(page_size)
        
        result = await self.db.execute(base_query)
        booking_data = result.fetchall()
        
        # Build customer responses
        customers = []
        for row in booking_data:
            # Get user details from users table if customer exists
            user_query = select(User).where(User.email == row.customer_email)
            user_result = await self.db.execute(user_query)
            user = user_result.scalar_one_or_none()
            user_id = user.id if user else None
            
            # Get reward details if rewards are enabled
            points_balance = None
            tier = None
            
            if user_id:
                reward_query = select(CustomerReward).where(
                    and_(
                        CustomerReward.user_id == user_id,
                        CustomerReward.place_id == place_id
                    )
                )
                reward_result = await self.db.execute(reward_query)
                customer_reward = reward_result.scalar_one_or_none()
                
                if customer_reward:
                    points_balance = customer_reward.points_balance
                    tier = customer_reward.tier
            
            # Get last service and campaign info
            last_booking_query = select(Booking, Service.name.label('service_name')).outerjoin(
                Service, Booking.service_id == Service.id
            ).where(
                and_(
                    Booking.place_id == place_id,
                    Booking.customer_email == row.customer_email
                )
            ).order_by(desc(Booking.booking_date)).limit(1)
            
            last_booking_result = await self.db.execute(last_booking_query)
            last_booking_row = last_booking_result.first()
            
            last_service_name = None
            if last_booking_row:
                last_booking = last_booking_row[0]  # Booking object
                last_service_name = last_booking_row[1] if len(last_booking_row) > 1 else None  # Service name from join
            else:
                last_booking = None
            
            customer = CustomerResponse(
                user_id=user_id or 0,  # Use 0 if user doesn't exist in users table
                place_id=place_id,
                user_name=row.customer_name,
                user_email=row.customer_email,
                user_phone=row.customer_phone,
                total_bookings=row.total_bookings,
                completed_bookings=row.completed_bookings,
                last_booking_date=row.last_booking_date,
                first_booking_date=row.first_booking_date,
                points_balance=points_balance,
                tier=tier,
                # Additional fields for enhanced display
                last_service_name=last_service_name,
                last_campaign_name=last_booking.campaign_name if last_booking else None,
                last_campaign_type=last_booking.campaign_type if last_booking else None,
                # Subscription and opt-in information
                gdpr_data_processing_consent=user.gdpr_data_processing_consent if user else None,
                gdpr_data_processing_consent_date=user.gdpr_data_processing_consent_date if user else None,
                gdpr_marketing_consent=user.gdpr_marketing_consent if user else None,
                gdpr_marketing_consent_date=user.gdpr_marketing_consent_date if user else None,
                gdpr_consent_version=user.gdpr_consent_version if user else None,
                rewards_program_subscribed=customer_reward is not None if user_id else None,
                is_active_user=user.is_active if user else None
            )
            
            # Apply tier filter
            if tier_filter and tier != tier_filter:
                continue
                
            # Apply booking status filter
            if booking_status_filter:
                if booking_status_filter == 'completed' and row.completed_bookings == 0:
                    continue
                elif booking_status_filter == 'pending' and row.total_bookings == row.completed_bookings:
                    continue
                elif booking_status_filter == 'cancelled' and row.total_bookings > 0:
                    continue
            
            customers.append(customer)
        
        return CustomerListResponse(
            customers=customers,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    
    async def get_customer_details(self, place_id: int, customer_email: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific customer
        """
        # Get all bookings for this customer at this place
        bookings_query = select(Booking).where(
            and_(
                Booking.place_id == place_id,
                Booking.customer_email == customer_email
            )
        ).order_by(desc(Booking.booking_date))
        
        bookings_result = await self.db.execute(bookings_query)
        bookings = bookings_result.scalars().all()
        
        if not bookings:
            return None
        
        # Calculate statistics
        total_bookings = len(bookings)
        completed_bookings = sum(1 for booking in bookings if booking.status == 'completed')
        first_booking = min(bookings, key=lambda b: b.booking_date)
        last_booking = max(bookings, key=lambda b: b.booking_date)
        
        # Get user_id if customer exists in users table
        user_query = select(User.id).where(User.email == customer_email)
        user_result = await self.db.execute(user_query)
        user_id = user_result.scalar_one_or_none()
        
        # Get reward details
        points_balance = None
        tier = None
        reward_transactions = []
        
        if user_id:
            reward_query = select(CustomerReward).where(
                and_(
                    CustomerReward.user_id == user_id,
                    CustomerReward.place_id == place_id
                )
            )
            reward_result = await self.db.execute(reward_query)
            customer_reward = reward_result.scalar_one_or_none()
            
            if customer_reward:
                points_balance = customer_reward.points_balance
                tier = customer_reward.tier
                
                # Get reward transactions
                from models.rewards import RewardTransaction
                transactions_query = select(RewardTransaction).where(
                    RewardTransaction.customer_reward_id == customer_reward.id
                ).order_by(desc(RewardTransaction.created_at))
                
                transactions_result = await self.db.execute(transactions_query)
                reward_transactions = transactions_result.scalars().all()
        
        # Get place name
        place_query = select(Place.nome).where(Place.id == place_id)
        place_result = await self.db.execute(place_query)
        place_name = place_result.scalar_one_or_none() or f"Place {place_id}"
        
        return {
            'user_id': user_id or 0,
            'place_id': place_id,
            'user_name': first_booking.customer_name,
            'user_email': customer_email,
            'user_phone': first_booking.customer_phone,
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'last_booking_date': last_booking.booking_date,
            'first_booking_date': first_booking.booking_date,
            'points_balance': points_balance,
            'tier': tier,
            'place_name': place_name,
            'bookings_history': [
                {
                    'id': booking.id,
                    'service_id': booking.service_id,
                    'service_name': f"Service {booking.service_id}",  # Would need to join with services
                    'employee_id': booking.employee_id,
                    'employee_name': None,  # Would need to join with employees
                    'booking_date': booking.booking_date,
                    'booking_time': str(booking.booking_time),
                    'status': booking.status,
                    'points_earned': booking.rewards_points_earned,
                    'points_redeemed': booking.rewards_points_redeemed,
                    'campaign_name': booking.campaign_name,
                    'campaign_type': booking.campaign_type,
                    'created_at': booking.created_at
                } for booking in bookings
            ],
            'reward_transactions': [
                {
                    'id': transaction.id,
                    'transaction_type': transaction.transaction_type,
                    'points_change': transaction.points_change,
                    'points_balance_after': transaction.points_balance_after,
                    'description': transaction.description,
                    'booking_id': transaction.booking_id,
                    'created_at': transaction.created_at
                } for transaction in reward_transactions
            ]
        }
    
    async def sync_customer_data_from_bookings(self, place_id: int) -> int:
        """
        Sync all customer data from existing bookings for a place
        This can be used to populate customer data for existing bookings
        """
        # Get all unique customers from bookings for this place
        customers_query = select(
            Booking.customer_email,
            Booking.customer_name,
            Booking.customer_phone,
            func.min(Booking.booking_date).label('first_booking_date'),
            func.max(Booking.booking_date).label('last_booking_date'),
            func.count(Booking.id).label('total_bookings')
        ).where(
            Booking.place_id == place_id
        ).group_by(
            Booking.customer_email, 
            Booking.customer_name, 
            Booking.customer_phone
        )
        
        result = await self.db.execute(customers_query)
        customers_data = result.fetchall()
        
        synced_count = 0
        
        for row in customers_data:
            # Check if customer-place association already exists
            existing_query = select(CustomerPlaceAssociation).where(
                and_(
                    CustomerPlaceAssociation.place_id == place_id,
                    # We need to find by email since we don't have user_id yet
                    CustomerPlaceAssociation.user_id.in_(
                        select(User.id).where(User.email == row.customer_email)
                    )
                )
            )
            existing_result = await self.db.execute(existing_query)
            existing_association = existing_result.scalar_one_or_none()
            
            if not existing_association:
                # Get user_id from users table
                user_query = select(User.id).where(User.email == row.customer_email)
                user_result = await self.db.execute(user_query)
                user_id = user_result.scalar_one_or_none()
                
                if user_id:
                    # Create new association
                    association = CustomerPlaceAssociation(
                        user_id=user_id,
                        place_id=place_id,
                        first_booking_date=row.first_booking_date,
                        last_booking_date=row.last_booking_date,
                        total_bookings=row.total_bookings
                    )
                    self.db.add(association)
                    synced_count += 1
        
        await self.db.commit()
        return synced_count
