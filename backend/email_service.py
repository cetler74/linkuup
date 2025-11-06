#!/usr/bin/env python3
"""
Email Service for LinkUup
Handles email notifications for bookings and status updates using Brevo API as primary provider
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import logging
from typing import Optional, Dict, Any

# Add current directory to path for imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from brevo_email_service import BrevoEmailService

# Try to import Gmail service, but don't fail if not available
try:
    from gmail_api_service import GmailAPIService
    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False
    GmailAPIService = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, app=None):
        self.brevo_service = None
        self.gmail_service = None
        if app:
            self.init_app(app)
        else:
            # Initialize services without app for direct usage
            self._initialize_services()
    
    def init_app(self, app):
        """Initialize email service with Flask app using Brevo as primary and Gmail as fallback"""
        try:
            # Initialize Brevo service (primary)
            self.brevo_service = BrevoEmailService()
            logger.info("Email service initialized with Brevo API as primary provider")
            
            # Initialize Gmail service as fallback
            if GMAIL_AVAILABLE:
                try:
                    os.environ['GMAIL_CREDENTIALS_PATH'] = str(current_dir / 'credentials.json')
                    os.environ['GMAIL_TOKEN_PATH'] = str(current_dir / 'token.json')
                    os.environ['GMAIL_SENDER_EMAIL'] = os.getenv('GMAIL_SENDER_EMAIL', 'cetler74@gmail.com')
                    
                    self.gmail_service = GmailAPIService(app)
                    logger.info("Gmail API service initialized as fallback")
                except Exception as e:
                    logger.warning(f"Failed to initialize Gmail API service as fallback: {str(e)}")
                    self.gmail_service = None
            else:
                logger.info("Gmail API service not available (dependencies not installed)")
                self.gmail_service = None
                
        except Exception as e:
            logger.error(f"Failed to initialize email service: {str(e)}")
            logger.warning("Email service will run in degraded mode (no email notifications)")
            self.brevo_service = None
            self.gmail_service = None

    def _initialize_services(self):
        """Initialize email services without Flask app"""
        try:
            # Initialize Brevo service (primary)
            self.brevo_service = BrevoEmailService()
            logger.info("Email service initialized with Brevo API as primary provider")
            
            # Initialize Gmail service as fallback
            if GMAIL_AVAILABLE:
                try:
                    os.environ['GMAIL_CREDENTIALS_PATH'] = str(current_dir / 'credentials.json')
                    os.environ['GMAIL_TOKEN_PATH'] = str(current_dir / 'token.json')
                    os.environ['GMAIL_SENDER_EMAIL'] = os.getenv('GMAIL_SENDER_EMAIL', 'cetler74@gmail.com')
                    
                    # Initialize Gmail service without app
                    self.gmail_service = GmailAPIService()
                    logger.info("Gmail API service initialized as fallback")
                except Exception as e:
                    logger.warning(f"Failed to initialize Gmail API service as fallback: {str(e)}")
                    self.gmail_service = None
            else:
                logger.info("Gmail API service not available (dependencies not installed)")
                self.gmail_service = None
                
        except Exception as e:
            logger.error(f"Failed to initialize email service: {str(e)}")
            logger.warning("Email service will run in degraded mode (no email notifications)")
            self.brevo_service = None
            self.gmail_service = None
    
    def send_booking_request_notification(self, booking_data):
        """Send email notification when a booking is requested"""
        customer_email = booking_data.get('customer_email', 'unknown')
        
        # Check if any email service is available
        if not self.brevo_service and not self.gmail_service:
            logger.error(f"❌ No email service available - cannot send booking notification to {customer_email}")
            print(f"❌ No email service configured - cannot send email to {customer_email}")
            return False
        
        # Try Brevo first (primary)
        if self.brevo_service:
            try:
                logger.info(f"📧 Attempting to send booking notification via Brevo to {customer_email}")
                result = self.brevo_service.send_booking_request_notification(booking_data)
                if result:
                    logger.info(f"✅ Booking notification sent successfully via Brevo to {customer_email}")
                    return True
                else:
                    logger.warning(f"⚠️ Brevo failed to send booking notification to {customer_email}")
            except Exception as e:
                logger.error(f"❌ Brevo exception when sending booking notification: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Fallback to Gmail
        if self.gmail_service:
            try:
                logger.info(f"📧 Attempting to send booking notification via Gmail fallback to {customer_email}")
                result = self.gmail_service.send_booking_request_notification(booking_data)
                if result:
                    logger.info(f"✅ Booking notification sent successfully via Gmail to {customer_email}")
                    return True
                else:
                    logger.warning(f"⚠️ Gmail fallback failed to send booking notification to {customer_email}")
            except Exception as e:
                logger.error(f"❌ Gmail exception when sending booking notification: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        logger.error(f"❌ All email services failed - could not send booking notification to {customer_email}")
        return False
    
    def send_booking_status_notification(self, booking_data):
        """Send email notification when booking status changes"""
        # Try Brevo first (primary)
        if self.brevo_service:
            try:
                return self.brevo_service.send_booking_status_notification(booking_data)
            except Exception as e:
                logger.error(f"Brevo failed to send booking status notification: {str(e)}")
        
        # Fallback to Gmail
        if self.gmail_service:
            try:
                return self.gmail_service.send_booking_status_notification(booking_data)
            except Exception as e:
                logger.error(f"Gmail fallback failed to send booking status notification: {str(e)}")
        
        logger.warning("No email service available, skipping email notification")
        return False
    
    def send_campaign_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        campaign_id: int, 
        recipient_id: int,
        db: Any
    ) -> Dict[str, Any]:
        """
        Send campaign email and track delivery status
        
        Args:
            to: Recipient email address
            subject: Email subject line
            body: Email body (HTML supported)
            campaign_id: Campaign ID for tracking
            recipient_id: Recipient ID for tracking
            db: Database session for updating recipient status
        
        Returns:
            Dict with success status, message_id, and error details
        """
        success = False
        error = None
        
        # Try Brevo first (primary)
        if self.brevo_service:
            try:
                success = self.brevo_service.send_campaign_email(
                    to_email=to,
                    to_name="Customer",  # Default name
                    subject=subject,
                    html_content=body,
                    text_content=None
                )
            except Exception as e:
                error = f"Brevo failed: {str(e)}"
                logger.error(f"Brevo failed to send campaign email: {str(e)}")
        
        # Fallback to Gmail if Brevo failed
        if not success and self.gmail_service:
            try:
                success = self.gmail_service.send_email(
                    to=to,
                    subject=subject,
                    body_text=body,
                    body_html=body  # Assuming body contains HTML
                )
                error = None  # Clear error if Gmail succeeded
            except Exception as e:
                error = f"Gmail fallback failed: {str(e)}"
                logger.error(f"Gmail fallback failed to send campaign email: {str(e)}")
        
        if not success:
            return {
                'success': False,
                'error': error or 'No email service available',
                'message_id': None
            }
        
        try:
            # Update recipient status in database
            from ..models.campaign import CampaignRecipient
            recipient = db.query(CampaignRecipient).filter(
                CampaignRecipient.id == recipient_id
            ).first()
            
            if recipient:
                recipient.status = 'sent'
                recipient.sent_at = datetime.utcnow()
                recipient.delivery_status = 'sent'
                db.commit()
            
            logger.info(f"Campaign email sent successfully to {to}")
            
            return {
                'success': True,
                'message_id': f"email_{recipient_id}_{datetime.utcnow().timestamp()}",
                'status': 'sent',
                'error': None
            }
                
        except Exception as e:
            error_msg = f"Failed to send campaign email: {str(e)}"
            logger.error(error_msg)
            
            # Update recipient status to failed
            from ..models.campaign import CampaignRecipient
            recipient = db.query(CampaignRecipient).filter(
                CampaignRecipient.id == recipient_id
            ).first()
            
            if recipient:
                recipient.status = 'failed'
                recipient.error_message = error_msg
                db.commit()
            
            return {
                'success': False,
                'error': error_msg,
                'message_id': None
            }
    
    def send_batch_campaign_emails(
        self, 
        recipients: list, 
        subject: str, 
        body: str, 
        campaign_id: int,
        db: Any,
        batch_size: int = 5
    ) -> Dict[str, Any]:
        """
        Send campaign emails to multiple recipients in batches
        
        Args:
            recipients: List of recipient objects with email addresses
            subject: Email subject line
            body: Email body (HTML supported)
            campaign_id: Campaign ID
            db: Database session
            batch_size: Number of emails to send per batch (rate limiting)
        
        Returns:
            Dict with batch sending results
        """
        if not self.gmail_service:
            return {
                'success': False,
                'error': 'Email service not available',
                'sent_count': 0,
                'failed_count': 0
            }
        
        results = {
            'success': True,
            'sent_count': 0,
            'failed_count': 0,
            'errors': []
        }
        
        # Process recipients in batches to respect rate limits
        for i in range(0, len(recipients), batch_size):
            batch = recipients[i:i + batch_size]
            
            for recipient in batch:
                result = self.send_campaign_email(
                    to=recipient.customer_email,
                    subject=subject,
                    body=body,
                    campaign_id=campaign_id,
                    recipient_id=recipient.id,
                    db=db
                )
                
                if result['success']:
                    results['sent_count'] += 1
                else:
                    results['failed_count'] += 1
                    results['errors'].append({
                        'recipient_id': recipient.id,
                        'error': result['error']
                    })
            
            # Small delay between batches to respect rate limits
            if i + batch_size < len(recipients):
                import time
                time.sleep(2)  # 2 second delay for email rate limiting
        
        if results['failed_count'] > 0:
            results['success'] = False
        
        logger.info(f"Batch email sending completed. Sent: {results['sent_count']}, Failed: {results['failed_count']}")
        
        return results
    
    def send_password_reset_email(self, to_email: str, to_name: str, reset_token: str, reset_url: str, language: str = 'en') -> bool:
        """Send password reset email"""
        # Ensure services are initialized
        if not self.brevo_service and not self.gmail_service:
            logger.warning("Email services not initialized, initializing now...")
            self._initialize_services()
        
        # Try Brevo first (primary)
        if self.brevo_service:
            try:
                logger.info(f"📧 Attempting to send password reset email via Brevo to {to_email}")
                result = self.brevo_service.send_password_reset_email(to_email, to_name, reset_token, reset_url, language)
                if result:
                    logger.info(f"✅ Password reset email sent successfully via Brevo to {to_email}")
                    return True
                else:
                    logger.warning(f"⚠️ Brevo failed to send password reset email to {to_email}")
            except Exception as e:
                logger.error(f"❌ Brevo exception when sending password reset email: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Fallback to Gmail
        if self.gmail_service:
            try:
                logger.info(f"📧 Attempting to send password reset email via Gmail fallback to {to_email}")
                # Gmail service doesn't have password reset method, use generic send_email
                subject = "Password Reset Request - LinkUup"
                body = f"""
                Hello {to_name},
                
                We received a request to reset your password. Click the link below:
                
                {reset_url}
                
                This link expires in 1 hour.
                
                Best regards,
                The LinkUup Team
                """
                result = self.gmail_service.send_email(to=to_email, subject=subject, body_text=body)
                if result:
                    logger.info(f"✅ Password reset email sent successfully via Gmail to {to_email}")
                    return True
                else:
                    logger.warning(f"⚠️ Gmail fallback failed to send password reset email to {to_email}")
            except Exception as e:
                logger.error(f"❌ Gmail exception when sending password reset email: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        logger.error(f"❌ No email service available - could not send password reset email to {to_email}")
        print(f"❌ No email service configured - cannot send email to {to_email}")
        return False
    
    def send_welcome_email(self, to_email: str, to_name: str, user_type: str, plan_name: str = None, language: str = 'en') -> bool:
        """Send welcome email to new users"""
        # Try Brevo first (primary)
        if self.brevo_service:
            try:
                return self.brevo_service.send_welcome_email(to_email, to_name, user_type, plan_name, language)
            except Exception as e:
                logger.error(f"Brevo failed to send welcome email: {str(e)}")
        
        # Fallback to Gmail
        if self.gmail_service:
            try:
                subject = f"Welcome to LinkUup - {user_type.title()}"
                body = f"""
                Hello {to_name},
                
                Welcome to LinkUup! We're thrilled to have you as part of our community.
                
                Account Type: {user_type}
                """
                if user_type == "business_owner" and plan_name:
                    body += f"\nYour Subscription Plan: {plan_name}\n"
                
                body += "\nGet started by visiting: http://linkuup.portugalexpatdirectory.com/login\n\nBest regards,\nThe LinkUup Team"
                return self.gmail_service.send_email(to=to_email, subject=subject, body_text=body)
            except Exception as e:
                logger.error(f"Gmail fallback failed to send welcome email: {str(e)}")
        
        logger.warning("No email service available, skipping welcome email")
        return False

# Global email service instance
email_service = EmailService()
