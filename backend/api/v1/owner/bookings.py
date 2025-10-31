from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, date, time
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from models.user import User
from models.place_existing import Place, Booking, Service, PlaceService, PlaceEmployee
from schemas.place_existing import PlaceBookingCreate, PlaceBookingUpdate, PlaceBookingResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.get("/places/{place_id}/bookings", response_model=List[PlaceBookingResponse])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_bookings(
    place_id: int,
    status_filter: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all bookings for a specific place with optional filters"""
    try:
        # Verify place ownership
        result = await db.execute(
            select(Place).where(
                Place.id == place_id,
                Place.owner_id == current_user.id,
                Place.is_active == True
            )
        )
        place = result.scalar_one_or_none()
        if not place:
            raise HTTPException(status_code=404, detail="Place not found")
        
        # Query bookings for this place using the correct Booking model
        from models.place_existing import Booking
        from datetime import datetime as dt
        
        query = select(Booking).where(Booking.place_id == place_id)
        
        # Apply filters
        if status_filter:
            query = query.where(Booking.status == status_filter)
        
        if date_from:
            query = query.where(Booking.booking_date >= date_from)
        
        if date_to:
            query = query.where(Booking.booking_date <= date_to)
        
        # Order by booking date and time
        query = query.order_by(Booking.booking_date, Booking.booking_time)
        
        result = await db.execute(query)
        bookings = result.scalars().all()
        
        # Convert to response format matching PlaceBookingResponse
        booking_responses = []
        for booking in bookings:
            try:
                # Skip bookings without required fields
                if not booking.service_id or not booking.booking_date or not booking.booking_time:
                    print(f"⚠️ Skipping booking {booking.id}: missing required fields (service_id={booking.service_id}, date={booking.booking_date}, time={booking.booking_time})")
                    continue
                
                # Get service name
                service_name = None
                if booking.service_id:
                    service_result = await db.execute(
                        select(Service).where(Service.id == booking.service_id)
                    )
                    service = service_result.scalar_one_or_none()
                    if service:
                        service_name = service.name
                
                # Get booking services for multi-service support
                from models.place_existing import BookingService
                booking_services_result = await db.execute(
                    select(BookingService).where(BookingService.booking_id == booking.id)
                )
                booking_services = booking_services_result.scalars().all()
                
                # Prepare services data
                services_data = []
                if booking_services:
                    for bs in booking_services:
                        services_data.append({
                            'service_id': bs.service_id,
                            'service_name': bs.service_name,
                            'service_price': float(bs.service_price) if bs.service_price else 0,
                            'service_duration': bs.service_duration or 0
                        })
                
                # Get employee name
                employee_name = None
                if booking.employee_id:
                    employee_result = await db.execute(
                        select(PlaceEmployee).where(PlaceEmployee.id == booking.employee_id)
                    )
                    employee = employee_result.scalar_one_or_none()
                    if employee:
                        employee_name = employee.name
                
                # Convert date and time to datetime objects
                # Combine booking_date (Date) and booking_time (Time) into datetime
                booking_datetime = dt.combine(booking.booking_date, booking.booking_time)
                
                # Ensure created_at is a datetime
                created_at = booking.created_at if isinstance(booking.created_at, dt) else dt.now()
                
                # Convert services data to BookingServiceResponse format
                services_response = []
                for service_data in services_data:
                    services_response.append({
                        'service_id': service_data['service_id'],
                        'service_name': service_data['service_name'],
                        'service_price': service_data['service_price'],
                        'service_duration': service_data['service_duration']
                    })

                booking_responses.append(PlaceBookingResponse(
                    id=booking.id,
                    place_id=booking.place_id,
                    service_id=booking.service_id,
                    employee_id=booking.employee_id,
                    service_name=service_name,
                    employee_name=employee_name,
                    customer_name=booking.customer_name,
                    customer_email=booking.customer_email,
                    customer_phone=booking.customer_phone,
                    booking_date=booking.booking_date.strftime("%Y-%m-%d"),
                    booking_time=booking.booking_time.strftime("%H:%M"),
                    duration=booking.duration,
                    status=booking.status or "pending",
                    any_employee_selected=booking.any_employee_selected,  # Include the flag in response
                    # Multi-service support
                    services=services_response,
                    total_price=float(booking.total_price) if booking.total_price else None,
                    total_duration=booking.total_duration,
                    # Campaign fields
                    campaign_id=booking.campaign_id,
                    campaign_name=booking.campaign_name,
                    campaign_type=booking.campaign_type,
                    campaign_discount_type=booking.campaign_discount_type,
                    campaign_discount_value=float(booking.campaign_discount_value) if booking.campaign_discount_value else None,
                    campaign_banner_message=booking.campaign_banner_message,
                    created_at=created_at,
                    updated_at=booking.updated_at
                ))
            except Exception as booking_error:
                print(f"🔥 Error processing booking {booking.id}: {str(booking_error)}")
                print(f"   Booking data: service_id={booking.service_id}, date={booking.booking_date}, time={booking.booking_time}")
                continue
        
        return booking_responses
    except HTTPException:
        raise
    except Exception as e:
        print(f"🔥 Unhandled exception in get_place_bookings: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"🔥 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch bookings: {str(e)}"
        )

@router.post("/places/{place_id}/bookings", response_model=PlaceBookingResponse, status_code=status.HTTP_201_CREATED)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_booking(
    place_id: int,
    booking_data: PlaceBookingCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new booking for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Verify all services exist and get their details
    from models.place_existing import BookingService
    services = []
    total_price = 0
    total_duration = 0
    
    for service_id in booking_data.service_ids:
        result = await db.execute(
            select(Service).where(Service.id == service_id)
        )
        service = result.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail=f"Service with ID {service_id} not found")
        
        services.append({
            'service_id': service.id,
            'service_name': service.name,
            'service_price': float(service.price) if service.price else 0,
            'service_duration': service.duration or 0
        })
        total_price += float(service.price) if service.price else 0
        total_duration += service.duration or 0
    
    # Parse booking date and time
    from datetime import datetime, date, time

    try:
        # First, try to parse both as full ISO 8601 datetime strings if 'T' is present
        if isinstance(booking_data.booking_date, str) and 'T' in booking_data.booking_date:
            full_date_time = datetime.fromisoformat(booking_data.booking_date.replace('Z', '+00:00'))
            booking_date = full_date_time.date()
        else:
            booking_date = datetime.strptime(str(booking_data.booking_date), "%Y-%m-%d").date()

        if isinstance(booking_data.booking_time, str):
            if 'T' in booking_data.booking_time:
                # If 'T' is present, assume it's part of a full ISO datetime string
                booking_time = datetime.fromisoformat(booking_data.booking_time.replace('Z', '+00:00')).time()
            elif '.' in booking_data.booking_time and 'Z' in booking_data.booking_time:
                # Handle time strings like "10:00:00.000Z"
                # This format expects a full time with milliseconds and timezone offset.
                # Replace 'Z' with '+00:00' for strptime compatibility.
                booking_time = datetime.strptime(booking_data.booking_time.replace('Z', '+00:00'), "%H:%M:%S.%f%z").time()
            else:
                booking_time = datetime.strptime(booking_data.booking_time, "%H:%M").time()
        else:
            booking_time = booking_data.booking_time

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time, or ISO 8601 format. Error: {str(e)}"
        )
    
    # If "any employee" is selected, find an available employee
    if booking_data.any_employee_selected:
        # First, get all employees for this place
        all_employees_result = await db.execute(
            select(PlaceEmployee).where(PlaceEmployee.place_id == place_id, PlaceEmployee.is_active == True)
        )
        all_employees = all_employees_result.scalars().all()

        if not all_employees:
            raise HTTPException(status_code=400, detail="No employees available for this place")

        available_employee_id = None
        for employee in all_employees:
            # Check if this specific employee is available at the requested time
            existing_booking_query = select(Booking).where(
                Booking.place_id == place_id,
                Booking.employee_id == employee.id,
                Booking.booking_date == booking_date,
                Booking.booking_time == booking_time,
                Booking.status.in_(["pending", "confirmed"])
            )
            result = await db.execute(existing_booking_query)
            existing_booking = result.scalar_one_or_none()

            if not existing_booking:
                available_employee_id = employee.id
                break # Found an available employee

        if available_employee_id is None:
            raise HTTPException(
                status_code=400,
                detail="No employees available at this time. All employees are booked."
            )
        
        # Assign the found available employee to the booking
        booking_data.employee_id = available_employee_id
        employee_id_to_check = available_employee_id
    else:
        employee_id_to_check = booking_data.employee_id

    if employee_id_to_check: # Only check if an employee is selected
        # Verify employee belongs to the place (moved here to ensure it's checked for both cases)
        result = await db.execute(
            select(PlaceEmployee).where(
                PlaceEmployee.id == employee_id_to_check,
                PlaceEmployee.place_id == place_id
            )
        )
        employee = result.scalar_one_or_none()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        existing_booking_query = select(Booking).where(
            Booking.place_id == place_id,
            Booking.employee_id == employee_id_to_check,
            Booking.booking_date == booking_date,
            Booking.booking_time == booking_time,
            Booking.status.in_(["pending", "confirmed"])
        )
        result = await db.execute(existing_booking_query)
        existing_booking = result.scalar_one_or_none()
        
        if existing_booking:
            raise HTTPException(
                status_code=400,
                detail="Employee is already booked at this time"
            )
        # If a specific employee was selected and is available, update the booking_data.employee_id for later use
        booking_data.employee_id = employee_id_to_check

    # Parse recurrence end date if provided
    recurrence_end_date = None
    if booking_data.recurrence_end_date:
        recurrence_end_date = datetime.fromisoformat(booking_data.recurrence_end_date.replace('Z', '+00:00'))
    
    # Determine booking color based on employee color
    booking_color = booking_data.color_code  # Default to provided color
    if booking_data.employee_id:
        # Get employee color from the database
        employee_result = await db.execute(
            select(PlaceEmployee).where(PlaceEmployee.id == booking_data.employee_id)
        )
        employee = employee_result.scalar_one_or_none()
        if employee and employee.color_code:
            booking_color = employee.color_code
    
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
        salon_id=place_id,  # Use salon_id for compatibility with existing table
        place_id=place_id,  # Also set place_id for new compatibility
        service_id=services[0]['service_id'],  # Use first service for backwards compatibility
        employee_id=booking_data.employee_id,
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        booking_date=booking_date,
        booking_time=booking_time,
        duration=total_duration,  # Use total duration
        status=booking_data.status,
        color_code=booking_color,
        is_recurring=booking_data.is_recurring,
        recurrence_pattern=booking_data.recurrence_pattern,
        recurrence_end_date=recurrence_end_date,
        any_employee_selected=booking_data.any_employee_selected,
        user_id=user_id,  # Link to user if found
        total_price=total_price,  # Store total price
        total_duration=total_duration,  # Store total duration
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
    
    # Create booking services entries for all selected services
    for service in services:
        booking_service = BookingService(
            booking_id=booking.id,
            service_id=service['service_id'],
            service_name=service['service_name'],
            service_price=service['service_price'],
            service_duration=service['service_duration']
        )
        db.add(booking_service)
    await db.commit()
    
    # Get service name for response
    service_name = None
    if booking.service_id:
        service_result = await db.execute(
            select(Service).where(Service.id == booking.service_id)
        )
        service = service_result.scalar_one_or_none()
        if service:
            service_name = service.name
    
    # Get employee name for response
    employee_name = None
    if booking.employee_id:
        employee_result = await db.execute(
            select(PlaceEmployee).where(PlaceEmployee.id == booking.employee_id)
        )
        employee = employee_result.scalar_one_or_none()
        if employee:
            employee_name = employee.name

    # Send email notification with services data
    try:
        from email_service import EmailService
        email_service = EmailService()
        email_data = {
            'customer_name': booking.customer_name,
            'customer_email': booking.customer_email,
            'salon_name': place.nome,
            'booking_date': booking.booking_date.strftime("%Y-%m-%d"),
            'booking_time': booking.booking_time.strftime("%H:%M"),
            'duration': total_duration,
            'total_price': float(total_price),
            'services': services
        }
        email_service.send_booking_request_notification(email_data)
    except Exception as e:
        print(f"Failed to send email notification: {str(e)}")

    # Convert services data to BookingServiceResponse format
    services_response = []
    for service in services:
        services_response.append({
            'service_id': service['service_id'],
            'service_name': service['service_name'],
            'service_price': service['service_price'],
            'service_duration': service['service_duration']
        })

    return PlaceBookingResponse(
        id=booking.id,
        place_id=booking.place_id,
        service_id=booking.service_id,
        employee_id=booking.employee_id,
        service_name=service_name,
        employee_name=employee_name,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking.booking_date.strftime("%Y-%m-%d"),
        booking_time=booking.booking_time.strftime("%H:%M"),
        duration=booking.duration,
        status=booking.status or "pending",
        color_code=booking.color_code,
        is_recurring=booking.is_recurring,
        recurrence_pattern=booking.recurrence_pattern,
        recurrence_end_date=booking.recurrence_end_date.isoformat() if booking.recurrence_end_date else None,
        any_employee_selected=booking.any_employee_selected,
        # Multi-service support
        services=services_response,
        total_price=float(booking.total_price) if booking.total_price else None,
        total_duration=booking.total_duration,
        # Campaign fields
        campaign_id=booking.campaign_id,
        campaign_name=booking.campaign_name,
        campaign_type=booking.campaign_type,
        campaign_discount_type=booking.campaign_discount_type,
        campaign_discount_value=float(booking.campaign_discount_value) if booking.campaign_discount_value else None,
        campaign_banner_message=booking.campaign_banner_message,
        created_at=booking.created_at,
        updated_at=booking.updated_at
    )

@router.get("/{booking_id}", response_model=PlaceBookingResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific booking"""
    # Use the same table as get_place_bookings for consistency
    from models.place_existing import Booking
    from datetime import datetime as dt
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify place ownership using Place model
    from models.place_existing import Place
    result = await db.execute(
        select(Place).where(
            Place.id == booking.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get service name
    service_name = None
    if booking.service_id:
        from models.place_existing import Service
        result = await db.execute(
            select(Service).where(Service.id == booking.service_id)
        )
        service = result.scalar_one_or_none()
        if service:
            service_name = service.name
    
    # Get employee name
    employee_name = None
    if booking.employee_id:
        from models.place_existing import PlaceEmployee
        result = await db.execute(
            select(PlaceEmployee).where(PlaceEmployee.id == booking.employee_id)
        )
        employee = result.scalar_one_or_none()
        if employee:
            employee_name = employee.name
    
    # Convert date and time to datetime objects
    booking_datetime = dt.combine(booking.booking_date, booking.booking_time)
    created_at = booking.created_at if isinstance(booking.created_at, dt) else dt.now()
    
    return PlaceBookingResponse(
        id=booking.id,
        place_id=booking.place_id,
        service_id=booking.service_id,
        employee_id=booking.employee_id,
        service_name=service_name,
        employee_name=employee_name,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking.booking_date.strftime("%Y-%m-%d"),
        booking_time=booking.booking_time.strftime("%H:%M"),
        status=booking.status or "pending",
        any_employee_selected=booking.any_employee_selected,  # Include the flag in response
        created_at=created_at,
        updated_at=booking.updated_at
    )

@router.put("/{booking_id}", response_model=PlaceBookingResponse)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def update_booking(
    booking_id: int,
    booking_data: PlaceBookingUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update a booking"""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == booking.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = booking_data.model_dump(exclude_unset=True)

    try:
        # Handle date and time separately to ensure correct types
        if "booking_date" in update_data and update_data["booking_date"] is not None:
            # Assuming booking_date comes as ISO 8601 string (e.g., "2023-10-27T00:00:00.000Z")
            booking_date_str = update_data["booking_date"]
            if 'T' in booking_date_str and 'Z' in booking_date_str:
                # Parse ISO 8601 with milliseconds and Z timezone
                booking.booking_date = datetime.strptime(booking_date_str, "%Y-%m-%dT%H:%M:%S.%fZ").date()
            else:
                # Fallback for plain date string
                booking.booking_date = datetime.strptime(booking_date_str, "%Y-%m-%d").date()
            del update_data["booking_date"]

        if "booking_time" in update_data and update_data["booking_time"] is not None:
            # Assuming booking_time comes as ISO 8601 string (e.g., "2023-10-27T00:00:00.000Z")
            booking_time_str = update_data["booking_time"]
            if 'T' in booking_time_str and 'Z' in booking_time_str:
                # Parse ISO 8601 with milliseconds and Z timezone
                booking.booking_time = datetime.strptime(booking_time_str, "%Y-%m-%dT%H:%M:%S.%fZ").time()
            else:
                # Fallback for plain time string
                booking.booking_time = datetime.strptime(booking_time_str, "%H:%M").time()
            del update_data["booking_time"]

        # Check if status is being changed to completed
        old_status = booking.status
        new_status = update_data.get('status')
        
        for field, value in update_data.items():
            if hasattr(booking, field):
                setattr(booking, field, value)
        
        await db.commit()
        await db.refresh(booking)
        
        # Send email notification if status changed
        if new_status and new_status != old_status and booking.customer_email:
            try:
                from email_service import EmailService
                from models.place_existing import Service
                
                # Get service name for email
                service_name = None
                if booking.service_id:
                    service_result = await db.execute(
                        select(Service).where(Service.id == booking.service_id)
                    )
                    service = service_result.scalar_one_or_none()
                    if service:
                        service_name = service.name
                
                email_service = EmailService()
                email_data = {
                    'customer_name': booking.customer_name,
                    'customer_email': booking.customer_email,
                    'salon_name': place.nome,
                    'service_name': service_name or 'Multiple Services',
                    'booking_date': booking.booking_date.strftime("%Y-%m-%d"),
                    'booking_time': booking.booking_time.strftime("%H:%M"),
                    'duration': booking.duration or 0,
                    'status': new_status
                }
                email_service.send_booking_status_notification(email_data)
            except Exception as e:
                print(f"Failed to send status change email notification: {str(e)}")
        
        # Award points if booking is completed and user is registered
        if (old_status != 'completed' and new_status == 'completed' and 
            booking.user_id and booking.place_id):
            
            from services.rewards_service import RewardsService
            from models.customer_existing import PlaceFeatureSetting
            
            # Check if rewards are enabled for this place
            feature_query = select(PlaceFeatureSetting).where(
                PlaceFeatureSetting.place_id == booking.place_id
            )
            feature_result = await db.execute(feature_query)
            feature_settings = feature_result.scalar_one_or_none()
            
            if feature_settings and feature_settings.rewards_enabled:
                rewards_service = RewardsService(db)
                
                # Calculate points for this booking
                points_calculation = await rewards_service.calculate_points_for_booking(
                    booking_id=booking.id,
                    place_id=booking.place_id
                )
                
                if points_calculation.points_earned > 0:
                    # Award points
                    success = await rewards_service.award_points(
                        user_id=booking.user_id,
                        place_id=booking.place_id,
                        booking_id=booking.id,
                        points=points_calculation.points_earned,
                        description=f"Points earned from completed booking"
                    )
                    
                    if success:
                        # Update booking with points earned
                        booking.rewards_points_earned = points_calculation.points_earned
                        await db.commit()
                        await db.refresh(booking)
    except Exception as e:
        print(f"🔥 Error updating booking {booking_id}: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"🔥 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update booking: {str(e)}"
        )

    # Get service name
    service_name = None
    if booking.service_id:
        service_result = await db.execute(
            select(Service).where(Service.id == booking.service_id)
        )
        service = service_result.scalar_one_or_none()
        if service:
            service_name = service.name
    
    # Get employee name
    employee_name = None
    if booking.employee_id:
        employee_result = await db.execute(
            select(PlaceEmployee).where(PlaceEmployee.id == booking.employee_id)
        )
        employee = employee_result.scalar_one_or_none()
        if employee:
            employee_name = employee.name
    
    return PlaceBookingResponse(
        id=booking.id,
        place_id=booking.place_id,
        service_id=booking.service_id,
        employee_id=booking.employee_id,
        service_name=service_name,
        employee_name=employee_name,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        booking_date=booking.booking_date.strftime("%Y-%m-%d"),
        booking_time=booking.booking_time.strftime("%H:%M"),
        status=booking.status or "pending",
        any_employee_selected=booking.any_employee_selected,
        created_at=booking.created_at,
        updated_at=booking.updated_at
    )

@router.delete("/{booking_id}")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a booking (soft delete by setting status to cancelled)"""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == booking.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    booking.status = "cancelled"
    await db.commit()
    
    # Send email notification for cancellation
    if booking.customer_email:
        try:
            from email_service import EmailService
            from models.place_existing import Service
            
            # Get service name for email
            service_name = None
            if booking.service_id:
                service_result = await db.execute(
                    select(Service).where(Service.id == booking.service_id)
                )
                service = service_result.scalar_one_or_none()
                if service:
                    service_name = service.name
            
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
    
    return {"message": "Booking cancelled successfully"}

@router.put("/{booking_id}/accept")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def accept_booking(
    booking_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Accept a pending booking"""
    # Use the correct Booking model from place_existing
    from models.place_existing import Booking, Place
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify place ownership using Place model
    result = await db.execute(
        select(Place).where(
            Place.id == booking.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if booking.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be accepted")
    
    booking.status = "confirmed"
    await db.commit()
    
    # Send email notification for confirmation
    if booking.customer_email:
        try:
            from email_service import EmailService
            from models.place_existing import Service
            
            # Get service name for email
            service_name = None
            if booking.service_id:
                service_result = await db.execute(
                    select(Service).where(Service.id == booking.service_id)
                )
                service = service_result.scalar_one_or_none()
                if service:
                    service_name = service.name
            
            email_service = EmailService()
            email_data = {
                'customer_name': booking.customer_name,
                'customer_email': booking.customer_email,
                'salon_name': place.nome,
                'service_name': service_name or 'Multiple Services',
                'booking_date': booking.booking_date.strftime("%Y-%m-%d"),
                'booking_time': booking.booking_time.strftime("%H:%M"),
                'duration': booking.duration or 0,
                'status': 'confirmed'
            }
            email_service.send_booking_status_notification(email_data)
        except Exception as e:
            print(f"Failed to send confirmation email notification: {str(e)}")
    
    return {"message": "Booking accepted successfully"}

@router.put("/{booking_id}/assign-employee")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def assign_employee_to_booking(
    booking_id: int,
    assignment_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Assign an employee to a booking"""
    if "employee_id" not in assignment_data:
        raise HTTPException(status_code=400, detail="Employee ID is required")
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == booking.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify employee belongs to the place
    result = await db.execute(
        select(PlaceEmployee).where(
            PlaceEmployee.id == assignment_data["employee_id"],
            PlaceEmployee.place_id == booking.place_id
        )
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    booking.employee_id = assignment_data["employee_id"]
    await db.commit()
    
    return {"message": "Employee assigned to booking successfully"}

@router.post("/recurring", response_model=List[PlaceBookingResponse], status_code=status.HTTP_201_CREATED)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_recurring_booking(
    recurring_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create recurring bookings"""
    # Implementation for recurring bookings
    # This would create multiple bookings based on the recurrence pattern
    return {"message": "Recurring bookings created successfully"}

@router.put("/{booking_id}/color")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def set_booking_color(
    booking_id: int,
    color_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Set booking color code"""
    if "color_code" not in color_data:
        raise HTTPException(status_code=400, detail="Color code is required")
    
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == booking.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    booking.color_code = color_data["color_code"]
    await db.commit()
    
    return {"message": "Booking color updated successfully"}
