"""
Public bookings API - backwards compatibility endpoint
Redirects to the proper RESTful endpoint at /places/{place_id}/bookings
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime

from core.database import get_db
from models.place_existing import Place, Service, Booking
from pydantic import BaseModel, EmailStr

router = APIRouter()


# Booking schemas (duplicate from places.py for standalone use)
class BookingCreate(BaseModel):
    """Schema for creating a booking"""
    salon_id: int
    service_ids: List[int]  # Changed to support multiple services
    employee_id: int  # Required - every booking must be associated with an employee
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    booking_date: str  # YYYY-MM-DD format
    booking_time: str  # HH:MM format
    any_employee_selected: Optional[bool] = False  # New field to track if customer selected "any employee"
    
    # Campaign fields - optional, included if booking is made during an active campaign
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None


class BookingResponse(BaseModel):
    """Schema for booking response"""
    id: int
    salon_id: int
    service_id: int
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    booking_date: str
    booking_time: str
    duration: Optional[int] = None
    status: str
    any_employee_selected: Optional[bool] = False  # New field to track if customer selected "any employee"
    
    # Campaign fields
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None
    
    created_at: str
    
    class Config:
        from_attributes = True


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Create a new booking (public endpoint - no auth required)
    
    This is a backwards-compatible endpoint. The proper RESTful endpoint is:
    POST /places/{place_id}/bookings
    """
    
    place_id = booking_data.salon_id
    
    # Verify place exists and has booking enabled
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.is_active == True,
            Place.booking_enabled == True
        )
    )
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(
            status_code=404, 
            detail="Place not found or booking not enabled"
        )
    
    # Verify service exists
    result = await db.execute(
        select(Service).where(Service.id == booking_data.service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Handle employee assignment based on any_employee_selected flag
    from models.place_existing import PlaceEmployee
    employee_id_to_use = booking_data.employee_id
    
    if booking_data.any_employee_selected:
        # Customer selected "any available employee" - find the best available employee
        # Get all active employees for this place
        result = await db.execute(
            select(PlaceEmployee).where(
                PlaceEmployee.place_id == place_id,
                PlaceEmployee.is_active == True
            )
        )
        available_employees = result.scalars().all()
        
        if not available_employees:
            raise HTTPException(
                status_code=400,
                detail="No employees available at this place"
            )
        
        # For now, assign the first available employee
        # In a more sophisticated implementation, you could consider:
        # - Employee workload
        # - Employee specialization for the service
        # - Employee availability patterns
        employee_id_to_use = available_employees[0].id
    else:
        # Customer selected a specific employee - verify they exist and are available
        result = await db.execute(
            select(PlaceEmployee).where(
                PlaceEmployee.id == booking_data.employee_id,
                PlaceEmployee.place_id == place_id,
                PlaceEmployee.is_active == True
            )
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise HTTPException(
                status_code=404, 
                detail="Employee not found or not available at this place"
            )
    
    # Parse date and time strings to datetime objects
    try:
        booking_date_obj = datetime.strptime(booking_data.booking_date, "%Y-%m-%d")
        booking_time_obj = datetime.strptime(booking_data.booking_time, "%H:%M")
        
        # Combine date and time into a single datetime
        booking_datetime = datetime.combine(booking_date_obj.date(), booking_time_obj.time())
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time. Error: {str(e)}"
        )
    
    # Check if employee is already booked at this time
    from models.place_existing import Booking
    existing_booking_query = select(Booking).where(
        Booking.place_id == place_id,
        Booking.employee_id == employee_id_to_use,
        Booking.booking_date == booking_date_obj.date(),
        Booking.booking_time == booking_time_obj.time(),
        Booking.status.in_(["pending", "confirmed"])
    )
    result = await db.execute(existing_booking_query)
    existing_booking = result.scalar_one_or_none()
    
    if existing_booking:
        raise HTTPException(
            status_code=400,
            detail="Employee is already booked at this time"
        )
    
    # Try to link booking to user if customer email matches a registered user
    user_id = None
    if booking_data.customer_email:
        from models.user import User
        user_query = select(User).where(User.email == booking_data.customer_email)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if user:
            user_id = user.id
    
    # Create new booking
    booking = Booking(
        salon_id=place_id,  # Keep for backwards compatibility
        place_id=place_id,   # New field for places compatibility
        service_id=booking_data.service_id,
        employee_id=employee_id_to_use,  # Use the determined employee ID
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        booking_date=booking_datetime,
        booking_time=booking_datetime,
        any_employee_selected=booking_data.any_employee_selected,  # Store the flag
        status='pending',
        user_id=user_id,  # Link to user if found
        # Campaign fields - store snapshot if campaign data provided
        campaign_id=booking_data.campaign_id,
        campaign_name=booking_data.campaign_name,
        campaign_type=booking_data.campaign_type,
        campaign_discount_type=booking_data.campaign_discount_type,
        campaign_discount_value=booking_data.campaign_discount_value,
        campaign_banner_message=booking_data.campaign_banner_message
    )
    
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    
    # Create notification for owner about new booking (asynchronous - don't fail booking if this fails)
    if place.owner_id:
        try:
            from services.notification_background import create_notification_async
            
            # Get service ID for notification
            service_id = booking.service_id if booking.service_id else None
            
            # Add background task to create notification asynchronously
            background_tasks.add_task(
                create_notification_async,
                booking_id=booking.id,
                owner_id=place.owner_id,
                place_id=place.id,
                service_id=service_id
            )
        except Exception as e:
            # Log error but don't fail the booking
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"❌ Error scheduling notification task for booking {booking.id}: {str(e)}")
            print(f"⚠️ Failed to schedule notification task: {str(e)}")
    
    return BookingResponse(
        id=booking.id,
        salon_id=booking.salon_id,
        service_id=booking.service_id,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking_data.booking_date,
        booking_time=booking_data.booking_time,
        duration=booking.duration,
        status=booking.status,
        any_employee_selected=booking.any_employee_selected,  # Include the flag in response
        campaign_id=booking.campaign_id,
        campaign_name=booking.campaign_name,
        campaign_type=booking.campaign_type,
        campaign_discount_type=booking.campaign_discount_type,
        campaign_discount_value=float(booking.campaign_discount_value) if booking.campaign_discount_value else None,
        campaign_banner_message=booking.campaign_banner_message,
        created_at=booking.created_at.isoformat() if booking.created_at else datetime.now().isoformat()
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get booking details by ID (public endpoint - no auth required)"""
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Extract date and time from datetime objects
    booking_date_str = booking.booking_date.strftime("%Y-%m-%d") if booking.booking_date else ""
    booking_time_str = booking.booking_time.strftime("%H:%M") if booking.booking_time else ""
    
    return BookingResponse(
        id=booking.id,
        salon_id=booking.salon_id,
        service_id=booking.service_id,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking_date_str,
        booking_time=booking_time_str,
        duration=booking.duration,
        status=booking.status,
        created_at=booking.created_at.isoformat() if booking.created_at else datetime.now().isoformat()
    )

