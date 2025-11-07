"""
Notification Service
Handles creation and management of notifications for owners
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional
from datetime import datetime, date

from models.notification import Notification, NotificationTypeEnum
from models.place_existing import Booking, Place, Service
from models.user import User


class NotificationService:
    """Service for managing owner notifications"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_notification(
        self,
        owner_id: int,
        notification_type: str,
        title: str,
        message: str,
        booking_id: Optional[int] = None,
        place_id: Optional[int] = None
    ) -> Notification:
        """
        Create a new notification for an owner
        
        Args:
            owner_id: ID of the owner user
            notification_type: Type of notification ('new_booking', 'cancellation', 'daily_reminder')
            title: Notification title
            message: Notification message
            booking_id: Optional booking ID if notification is related to a booking
            place_id: Optional place ID if notification is related to a place
            
        Returns:
            Created Notification object
        """
        notification = Notification(
            owner_id=owner_id,
            type=notification_type,
            title=title,
            message=message,
            booking_id=booking_id,
            place_id=place_id,
            is_read=False
        )
        
        self.db.add(notification)
        # Always commit the notification - this works in both regular and background task contexts
        await self.db.commit()
        await self.db.refresh(notification)
        
        return notification
    
    async def create_booking_notification(
        self,
        owner_id: int,
        booking: Booking,
        place: Place,
        service: Optional[Service] = None
    ) -> Notification:
        """
        Create a notification for a new booking
        
        Args:
            owner_id: ID of the owner user
            booking: Booking object
            place: Place object
            service: Optional Service object
            
        Returns:
            Created Notification object
        """
        service_name = getattr(service, 'name', None) if service else None
        if not service_name:
            service_name = "Service"
        booking_date_str = booking.booking_date.strftime("%Y-%m-%d") if booking.booking_date else "N/A"
        booking_time_str = booking.booking_time.strftime("%H:%M") if booking.booking_time else "N/A"
        
        title = f"New Booking: {booking.customer_name}"
        message = (
            f"{booking.customer_name} has made a new booking for {service_name} "
            f"at {place.nome} on {booking_date_str} at {booking_time_str}."
        )
        
        return await self.create_notification(
            owner_id=owner_id,
            notification_type=NotificationTypeEnum.NEW_BOOKING.value,
            title=title,
            message=message,
            booking_id=booking.id,
            place_id=place.id
        )
    
    async def create_cancellation_notification(
        self,
        owner_id: int,
        booking: Booking,
        place: Place,
        service: Optional[Service] = None
    ) -> Notification:
        """
        Create a notification for a booking cancellation
        
        Args:
            owner_id: ID of the owner user
            booking: Booking object
            place: Place object
            service: Optional Service object
            
        Returns:
            Created Notification object
        """
        service_name = getattr(service, 'name', None) if service else None
        if not service_name:
            service_name = "Service"
        booking_date_str = booking.booking_date.strftime("%Y-%m-%d") if booking.booking_date else "N/A"
        booking_time_str = booking.booking_time.strftime("%H:%M") if booking.booking_time else "N/A"
        
        title = f"Booking Cancelled: {booking.customer_name}"
        message = (
            f"The booking for {service_name} at {place.nome} "
            f"on {booking_date_str} at {booking_time_str} with {booking.customer_name} has been cancelled."
        )
        
        return await self.create_notification(
            owner_id=owner_id,
            notification_type=NotificationTypeEnum.CANCELLATION.value,
            title=title,
            message=message,
            booking_id=booking.id,
            place_id=place.id
        )
    
    async def create_daily_reminder_notification(
        self,
        owner_id: int,
        booking: Booking,
        place: Place,
        service: Optional[Service] = None
    ) -> Notification:
        """
        Create a daily reminder notification for a booking scheduled today
        
        Args:
            owner_id: ID of the owner user
            booking: Booking object
            place: Place object
            service: Optional Service object
            
        Returns:
            Created Notification object
        """
        service_name = getattr(service, 'name', None) if service else None
        if not service_name:
            service_name = "Service"
        booking_time_str = booking.booking_time.strftime("%H:%M") if booking.booking_time else "N/A"
        
        title = f"Upcoming Booking Today: {booking.customer_name}"
        message = (
            f"You have a booking with {booking.customer_name} for {service_name} "
            f"at {place.nome} today at {booking_time_str}."
        )
        
        return await self.create_notification(
            owner_id=owner_id,
            notification_type=NotificationTypeEnum.DAILY_REMINDER.value,
            title=title,
            message=message,
            booking_id=booking.id,
            place_id=place.id
        )

