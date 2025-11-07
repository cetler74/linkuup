"""
Background task service for creating notifications asynchronously.
This ensures notifications are created after bookings are committed,
without blocking or failing the booking process.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import AsyncSessionLocal
from services.notification_service import NotificationService
from models.place_existing import Booking, Place, Service

logger = logging.getLogger(__name__)


async def create_notification_async(
    booking_id: int,
    owner_id: int,
    place_id: int,
    service_id: int = None
):
    """
    Background task to create a notification for a new booking.
    This function runs asynchronously after the booking is committed.
    
    Args:
        booking_id: ID of the booking
        owner_id: ID of the owner user
        place_id: ID of the place
        service_id: Optional ID of the service
    """
    # Create a new database session for the background task
    async with AsyncSessionLocal() as db:
        try:
            # Fetch booking
            result = await db.execute(
                select(Booking).where(Booking.id == booking_id)
            )
            booking = result.scalar_one_or_none()
            
            if not booking:
                logger.warning(f"⚠️ Booking {booking_id} not found for notification creation")
                return
            
            # Fetch place
            result = await db.execute(
                select(Place).where(Place.id == place_id)
            )
            place = result.scalar_one_or_none()
            
            if not place:
                logger.warning(f"⚠️ Place {place_id} not found for notification creation")
                return
            
            # Fetch service if service_id is provided
            service_obj = None
            if service_id:
                try:
                    result = await db.execute(
                        select(Service).where(Service.id == service_id)
                    )
                    service_obj = result.scalar_one_or_none()
                except Exception as service_error:
                    logger.warning(f"⚠️ Error fetching service {service_id} for notification: {str(service_error)}")
                    service_obj = None
            
            # Create notification using NotificationService
            notification_service = NotificationService(db)
            notification = await notification_service.create_booking_notification(
                owner_id=owner_id,
                booking=booking,
                place=place,
                service=service_obj
            )
            
            # Commit the notification
            await db.commit()
            
            logger.info(f"✅ Notification created successfully for booking {booking_id} (owner {owner_id})")
            
        except Exception as e:
            # Log the error but don't raise - this is a background task
            logger.error(f"❌ Error creating notification for booking {booking_id}: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            # Rollback any pending changes
            try:
                await db.rollback()
            except Exception as rollback_error:
                logger.warning(f"⚠️ Error during rollback: {str(rollback_error)}")


async def create_cancellation_notification_async(
    booking_id: int,
    owner_id: int,
    place_id: int,
    service_id: int = None
):
    """
    Background task to create a notification for a booking cancellation.
    This function runs asynchronously after the cancellation is committed.
    
    Args:
        booking_id: ID of the booking
        owner_id: ID of the owner user
        place_id: ID of the place
        service_id: Optional ID of the service
    """
    # Create a new database session for the background task
    async with AsyncSessionLocal() as db:
        try:
            # Fetch booking
            result = await db.execute(
                select(Booking).where(Booking.id == booking_id)
            )
            booking = result.scalar_one_or_none()
            
            if not booking:
                logger.warning(f"⚠️ Booking {booking_id} not found for cancellation notification")
                return
            
            # Fetch place
            result = await db.execute(
                select(Place).where(Place.id == place_id)
            )
            place = result.scalar_one_or_none()
            
            if not place:
                logger.warning(f"⚠️ Place {place_id} not found for cancellation notification")
                return
            
            # Fetch service if service_id is provided
            service_obj = None
            if service_id:
                try:
                    result = await db.execute(
                        select(Service).where(Service.id == service_id)
                    )
                    service_obj = result.scalar_one_or_none()
                except Exception as service_error:
                    logger.warning(f"⚠️ Error fetching service {service_id} for cancellation notification: {str(service_error)}")
                    service_obj = None
            
            # Create notification using NotificationService
            notification_service = NotificationService(db)
            notification = await notification_service.create_cancellation_notification(
                owner_id=owner_id,
                booking=booking,
                place=place,
                service=service_obj
            )
            
            # Commit the notification
            await db.commit()
            
            logger.info(f"✅ Cancellation notification created successfully for booking {booking_id} (owner {owner_id})")
            
        except Exception as e:
            # Log the error but don't raise - this is a background task
            logger.error(f"❌ Error creating cancellation notification for booking {booking_id}: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            # Rollback any pending changes
            try:
                await db.rollback()
            except Exception as rollback_error:
                logger.warning(f"⚠️ Error during rollback: {str(rollback_error)}")

