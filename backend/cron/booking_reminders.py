#!/usr/bin/env python3
"""
Automated booking reminder system.
Sends reminders 24 hours before appointments.
Creates daily reminder notifications for owners.
"""

import os
import sys
import logging
import asyncio
from datetime import datetime, timedelta, date
from sqlalchemy import func
from typing import List, Dict, Any

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('booking_reminders.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BookingReminderService:
    """Service for sending automated booking reminders."""
    
    def __init__(self):
        self.reminder_hours = 24  # Send reminders 24 hours before
        
    def get_upcoming_bookings(self) -> List[Dict[str, Any]]:
        """
        Get bookings that are 24 hours away and need reminders.
        Returns list of booking dictionaries with customer and business info.
        """
        try:
            # Calculate the target time (24 hours from now)
            target_time = datetime.now() + timedelta(hours=self.reminder_hours)
            target_date = target_time.date()
            target_time_str = target_time.strftime('%H:%M')
            
            # This would normally query the database
            # For now, we'll simulate with mock data
            upcoming_bookings = [
                {
                    'id': 1,
                    'customer_name': 'John Doe',
                    'customer_email': 'john@example.com',
                    'customer_phone': '+1234567890',
                    'booking_date': target_date.strftime('%Y-%m-%d'),
                    'booking_time': target_time_str,
                    'service_name': 'Haircut',
                    'business_name': 'Salon ABC',
                    'business_phone': '+1987654321',
                    'business_address': '123 Main St, City, State'
                },
                {
                    'id': 2,
                    'customer_name': 'Jane Smith',
                    'customer_email': 'jane@example.com',
                    'customer_phone': '+1234567891',
                    'booking_date': target_date.strftime('%Y-%m-%d'),
                    'booking_time': target_time_str,
                    'service_name': 'Manicure',
                    'business_name': 'Beauty Studio XYZ',
                    'business_phone': '+1987654322',
                    'business_address': '456 Oak Ave, City, State'
                }
            ]
            
            logger.info(f"Found {len(upcoming_bookings)} bookings for reminder")
            return upcoming_bookings
            
        except Exception as e:
            logger.error(f"Error fetching upcoming bookings: {str(e)}")
            return []
    
    def send_sms_reminder(self, booking: Dict[str, Any]) -> bool:
        """
        Send SMS reminder to customer.
        Returns True if successful, False otherwise.
        """
        try:
            # This would integrate with SMS service like Twilio
            message = f"""
Hi {booking['customer_name']}! 

This is a reminder that you have an appointment tomorrow:
- Service: {booking['service_name']}
- Date: {booking['booking_date']}
- Time: {booking['booking_time']}
- Location: {booking['business_name']}
- Address: {booking['business_address']}

If you need to reschedule, please call {booking['business_phone']}.

Thank you!
            """.strip()
            
            # Simulate SMS sending
            logger.info(f"SMS sent to {booking['customer_phone']}: {message[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Error sending SMS to {booking['customer_phone']}: {str(e)}")
            return False
    
    def send_email_reminder(self, booking: Dict[str, Any]) -> bool:
        """
        Send email reminder to customer.
        Returns True if successful, False otherwise.
        """
        try:
            # This would integrate with email service like SendGrid
            subject = f"Appointment Reminder - {booking['service_name']} tomorrow"
            
            html_content = f"""
            <html>
            <body>
                <h2>Appointment Reminder</h2>
                <p>Hi {booking['customer_name']},</p>
                <p>This is a reminder that you have an appointment tomorrow:</p>
                <ul>
                    <li><strong>Service:</strong> {booking['service_name']}</li>
                    <li><strong>Date:</strong> {booking['booking_date']}</li>
                    <li><strong>Time:</strong> {booking['booking_time']}</li>
                    <li><strong>Location:</strong> {booking['business_name']}</li>
                    <li><strong>Address:</strong> {booking['business_address']}</li>
                </ul>
                <p>If you need to reschedule, please call {booking['business_phone']}.</p>
                <p>Thank you!</p>
            </body>
            </html>
            """
            
            # Simulate email sending
            logger.info(f"Email sent to {booking['customer_email']}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {booking['customer_email']}: {str(e)}")
            return False
    
    def send_business_notification(self, booking: Dict[str, Any]) -> bool:
        """
        Send notification to business owner about upcoming appointment.
        Returns True if successful, False otherwise.
        """
        try:
            # This would send notification to business owner
            message = f"""
Upcoming appointment reminder:
- Customer: {booking['customer_name']}
- Service: {booking['service_name']}
- Time: {booking['booking_date']} at {booking['booking_time']}
- Contact: {booking['customer_phone']}
            """.strip()
            
            logger.info(f"Business notification sent: {message}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending business notification: {str(e)}")
            return False
    
    def process_reminders(self) -> Dict[str, int]:
        """
        Process all upcoming booking reminders.
        Returns statistics about sent reminders.
        """
        stats = {
            'total_bookings': 0,
            'sms_sent': 0,
            'emails_sent': 0,
            'business_notifications_sent': 0,
            'errors': 0
        }
        
        try:
            # Get upcoming bookings
            bookings = self.get_upcoming_bookings()
            stats['total_bookings'] = len(bookings)
            
            if not bookings:
                logger.info("No bookings found for reminder")
                return stats
            
            # Process each booking
            for booking in bookings:
                try:
                    # Send SMS reminder
                    if booking.get('customer_phone'):
                        if self.send_sms_reminder(booking):
                            stats['sms_sent'] += 1
                    
                    # Send email reminder
                    if booking.get('customer_email'):
                        if self.send_email_reminder(booking):
                            stats['emails_sent'] += 1
                    
                    # Send business notification
                    if self.send_business_notification(booking):
                        stats['business_notifications_sent'] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing booking {booking.get('id', 'unknown')}: {str(e)}")
                    stats['errors'] += 1
            
            logger.info(f"Reminder processing completed: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error in reminder processing: {str(e)}")
            stats['errors'] += 1
            return stats

def main():
    """Main function to run the reminder service."""
    logger.info("Starting booking reminder service...")
    
    try:
        service = BookingReminderService()
        stats = service.process_reminders()
        
        logger.info(f"Reminder service completed successfully: {stats}")
        
        # Exit with success code
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Fatal error in reminder service: {str(e)}")
        sys.exit(1)

async def create_daily_reminder_notifications():
    """
    Create daily reminder notifications for owners about bookings scheduled for today.
    This function should be called daily (e.g., via cron job) to create notifications
    for all bookings happening today.
    """
    try:
        from core.database import AsyncSessionLocal
        from sqlalchemy import select, and_
        from models.place_existing import Booking, Place, Service
        from services.notification_service import NotificationService
        
        async with AsyncSessionLocal() as db:
            # Get today's date
            today = date.today()
            
            # Get all bookings for today that are not cancelled
            bookings_result = await db.execute(
                select(Booking).where(
                    and_(
                        Booking.booking_date == today,
                        Booking.status.in_(["pending", "confirmed"])
                    )
                )
            )
            bookings = bookings_result.scalars().all()
            
            if not bookings:
                logger.info(f"No bookings found for today ({today})")
                return
            
            logger.info(f"Found {len(bookings)} bookings for today")
            
            notification_service = NotificationService(db)
            notifications_created = 0
            
            # Process each booking
            for booking in bookings:
                try:
                    # Get the place to find the owner
                    place_result = await db.execute(
                        select(Place).where(Place.id == booking.place_id)
                    )
                    place = place_result.scalar_one_or_none()
                    
                    if not place or not place.owner_id:
                        logger.warning(f"Place {booking.place_id} not found or has no owner")
                        continue
                    
                    # Get service name
                    service_name = None
                    if booking.service_id:
                        service_result = await db.execute(
                            select(Service).where(Service.id == booking.service_id)
                        )
                        service = service_result.scalar_one_or_none()
                        if service:
                            service_name = service
                    
                    # Check if notification already exists for this booking today
                    from models.notification import Notification
                    from sqlalchemy import cast, Date
                    existing_notification_result = await db.execute(
                        select(Notification).where(
                            and_(
                                Notification.owner_id == place.owner_id,
                                Notification.booking_id == booking.id,
                                Notification.type == 'daily_reminder',
                                cast(Notification.created_at, Date) == today
                            )
                        )
                    )
                    existing_notification = existing_notification_result.scalar_one_or_none()
                    
                    if existing_notification:
                        logger.debug(f"Daily reminder notification already exists for booking {booking.id}")
                        continue
                    
                    # Create daily reminder notification
                    await notification_service.create_daily_reminder_notification(
                        owner_id=place.owner_id,
                        booking=booking,
                        place=place,
                        service=service_name
                    )
                    notifications_created += 1
                    logger.info(f"Created daily reminder notification for booking {booking.id} (owner {place.owner_id})")
                    
                except Exception as e:
                    logger.error(f"Error creating notification for booking {booking.id}: {str(e)}")
                    continue
            
            await db.commit()
            logger.info(f"Created {notifications_created} daily reminder notifications")
            
    except Exception as e:
        logger.error(f"Error in create_daily_reminder_notifications: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())


def main():
    """Main function to run the reminder service."""
    logger.info("Starting booking reminder service...")
    
    try:
        service = BookingReminderService()
        stats = service.process_reminders()
        
        logger.info(f"Reminder service completed successfully: {stats}")
        
        # Also create daily reminder notifications for owners
        logger.info("Creating daily reminder notifications for owners...")
        asyncio.run(create_daily_reminder_notifications())
        
        # Exit with success code
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Fatal error in reminder service: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
