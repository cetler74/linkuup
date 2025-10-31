from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, Column, Integer, String, Date, Time, DateTime, func, join
from sqlalchemy.orm import declarative_base
from typing import List, Optional
from datetime import datetime, date, time

from core.database import get_db, Base
from core.dependencies import get_current_user
from models.user import User
from pydantic import BaseModel

router = APIRouter()

# Import the actual models
from models.place_existing import Booking, Place, PlaceService, PlaceEmployee

# Response model for customer bookings
class CustomerBookingResponse(BaseModel):
    id: int
    salon_id: int
    salon_name: Optional[str] = None
    service_id: int
    service_name: Optional[str] = None
    service_price: Optional[float] = None
    service_duration: Optional[int] = None
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    employee_phone: Optional[str] = None
    employee_photo_url: Optional[str] = None
    employee_color_code: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: str
    customer_phone: Optional[str] = None
    booking_date: date
    booking_time: time
    duration: Optional[int] = None
    status: str
    any_employee_selected: Optional[bool] = False
    
    # Campaign information
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    campaign_type: Optional[str] = None
    campaign_discount_type: Optional[str] = None
    campaign_discount_value: Optional[float] = None
    campaign_banner_message: Optional[str] = None
    
    # Rewards information
    rewards_points_earned: Optional[int] = None
    rewards_points_redeemed: Optional[int] = None
    
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[CustomerBookingResponse])
async def get_customer_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all bookings for the current customer"""
    try:
        query = select(Booking).where(
            Booking.customer_email == current_user.email
        ).order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
        
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        return await _format_bookings(bookings, db)
    except Exception as e:
        print(f"Error in get_customer_bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/upcoming", response_model=List[CustomerBookingResponse])
async def get_upcoming_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get upcoming bookings for the current customer"""
    try:
        today = date.today()
        query = select(Booking).where(
            and_(
                Booking.customer_email == current_user.email,
                Booking.booking_date >= today,
                Booking.status.in_(["pending", "confirmed"])
            )
        ).order_by(Booking.booking_date.asc(), Booking.booking_time.asc())
        
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        return await _format_bookings(bookings, db)
    except Exception as e:
        print(f"Error in get_upcoming_bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/past", response_model=List[CustomerBookingResponse])
async def get_past_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get past bookings for the current customer (includes completed and cancelled bookings)"""
    try:
        today = date.today()
        query = select(Booking).where(
            and_(
                Booking.customer_email == current_user.email,
                or_(
                    Booking.booking_date < today,
                    Booking.status == "cancelled"
                )
            )
        ).order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
        
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        return await _format_bookings(bookings, db)
    except Exception as e:
        print(f"Error in get_past_bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/cancelled", response_model=List[CustomerBookingResponse])
async def get_cancelled_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get cancelled bookings for the current customer"""
    try:
        query = select(Booking).where(
            and_(
                Booking.customer_email == current_user.email,
                Booking.status == "cancelled"
            )
        ).order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
        
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        return await _format_bookings(bookings, db)
    except Exception as e:
        print(f"Error in get_cancelled_bookings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a booking"""
    # Get the booking
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify ownership
    if booking.customer_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
    
    # Check if booking can be cancelled
    if booking.status in ["cancelled", "completed"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {booking.status} booking")
    
    # Cancel the booking
    booking.status = "cancelled"
    await db.commit()
    
    # Send email notification for cancellation
    if booking.customer_email:
        try:
            from email_service import EmailService
            from models.place_existing import Place, Service
            
            # Get place and service information for email
            place_result = await db.execute(
                select(Place).where(Place.id == booking.place_id)
            )
            place = place_result.scalar_one_or_none()
            
            service_name = None
            if booking.service_id:
                service_result = await db.execute(
                    select(Service).where(Service.id == booking.service_id)
                )
                service = service_result.scalar_one_or_none()
                if service:
                    service_name = service.name
            
            if place:
                email_service = EmailService()
                email_data = {
                    'customer_name': booking.customer_name,
                    'customer_email': booking.customer_email,
                    'salon_name': place.nome,
                    'service_name': service_name or 'Multiple Services',
                    'booking_date': booking.booking_date.strftime("%Y-%m-%d"),
                    'booking_time': booking.booking_time.strftime("%H:%M"),
                    'duration': booking.duration or 0,
                    'status': 'cancelled'
                }
                email_service.send_booking_status_notification(email_data)
        except Exception as e:
            print(f"Failed to send cancellation email notification: {str(e)}")
    
    return {"message": "Booking cancelled successfully", "booking_id": booking_id}

async def _format_bookings(bookings: List[Booking], db: AsyncSession) -> List[CustomerBookingResponse]:
    """Helper function to format bookings with related data"""
    bookings_data = []
    
    for booking in bookings:
        # Get salon/place information
        salon_name = None
        try:
            place_query = select(Place).where(Place.id == booking.salon_id)
            place_result = await db.execute(place_query)
            place = place_result.scalar_one_or_none()
            if place:
                salon_name = place.nome
        except Exception as e:
            print(f"Error fetching place for booking {booking.id}: {e}")
        
        # Get service information
        service_name = None
        service_price = None
        service_duration = None
        try:
            service_query = select(PlaceService).where(PlaceService.id == booking.service_id)
            service_result = await db.execute(service_query)
            service = service_result.scalar_one_or_none()
            if service:
                service_name = service.name
                service_price = service.price
                service_duration = service.duration
        except Exception as e:
            print(f"Error fetching service for booking {booking.id}: {e}")
        
        # Get employee information
        employee_name = None
        employee_phone = None
        employee_photo_url = None
        employee_color_code = None
        if booking.employee_id:
            try:
                employee_query = select(PlaceEmployee).where(PlaceEmployee.id == booking.employee_id)
                employee_result = await db.execute(employee_query)
                employee = employee_result.scalar_one_or_none()
                if employee:
                    employee_name = employee.name
                    employee_phone = employee.phone
                    employee_photo_url = employee.photo_url
                    employee_color_code = employee.color_code
            except Exception as e:
                print(f"Error fetching employee for booking {booking.id}: {e}")
        
        bookings_data.append(CustomerBookingResponse(
            id=booking.id,
            salon_id=booking.salon_id,
            salon_name=salon_name,
            service_id=booking.service_id,
            service_name=service_name,
            service_price=service_price,
            service_duration=service_duration,
            employee_id=booking.employee_id,
            employee_name=employee_name,
            employee_phone=employee_phone,
            employee_photo_url=employee_photo_url,
            employee_color_code=employee_color_code,
            customer_name=booking.customer_name,
            customer_email=booking.customer_email,
            customer_phone=booking.customer_phone,
            booking_date=booking.booking_date,
            booking_time=booking.booking_time,
            duration=booking.duration,
            status=booking.status,
            any_employee_selected=booking.any_employee_selected or False,
            
            # Campaign information
            campaign_id=booking.campaign_id,
            campaign_name=booking.campaign_name,
            campaign_type=booking.campaign_type,
            campaign_discount_type=booking.campaign_discount_type,
            campaign_discount_value=float(booking.campaign_discount_value) if booking.campaign_discount_value else None,
            campaign_banner_message=booking.campaign_banner_message,
            
            # Rewards information
            rewards_points_earned=booking.rewards_points_earned,
            rewards_points_redeemed=booking.rewards_points_redeemed,
            
            created_at=booking.created_at
        ))
    
    return bookings_data

