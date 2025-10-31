"""
WhatsApp service for sending messages via Twilio API.
"""
import os
import re
import logging
from typing import Optional, Dict, Any
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from sqlalchemy.orm import Session
from ..models.campaign import CampaignRecipient
from ..core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for sending WhatsApp messages via Twilio"""
    
    def __init__(self):
        self.client = None
        self.whatsapp_number = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Twilio client with credentials from environment"""
        try:
            account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            self.whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER')
            
            if not all([account_sid, auth_token, self.whatsapp_number]):
                logger.warning("Twilio credentials not found. WhatsApp service will be disabled.")
                return
            
            self.client = Client(account_sid, auth_token)
            logger.info("WhatsApp service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize WhatsApp service: {str(e)}")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if WhatsApp service is available"""
        return self.client is not None
    
    def validate_phone_number(self, phone: str) -> bool:
        """
        Validate phone number is in E.164 format required by Twilio
        Format: +[country_code][number] (e.g., +1234567890)
        """
        if not phone:
            return False
        
        # Remove any spaces or dashes
        cleaned_phone = re.sub(r'[\s\-]', '', phone)
        
        # Check E.164 format: + followed by 7-15 digits
        pattern = r'^\+[1-9]\d{6,14}$'
        return bool(re.match(pattern, cleaned_phone))
    
    def format_phone_number(self, phone: str) -> Optional[str]:
        """
        Format phone number to E.164 format
        Returns None if phone cannot be formatted
        """
        if not phone:
            return None
        
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # If it doesn't start with +, add it
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        
        # Validate the formatted number
        if self.validate_phone_number(cleaned):
            return cleaned
        
        return None
    
    def send_message(
        self, 
        to_phone: str, 
        message: str, 
        campaign_id: int, 
        recipient_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Send WhatsApp message via Twilio
        
        Args:
            to_phone: Recipient phone number (will be formatted to E.164)
            message: Message content (max 1600 characters)
            campaign_id: Campaign ID for tracking
            recipient_id: Recipient ID for tracking
            db: Database session for updating recipient status
        
        Returns:
            Dict with success status, message_id, and error details
        """
        if not self.is_available():
            return {
                'success': False,
                'error': 'WhatsApp service not available',
                'message_id': None
            }
        
        # Format phone number
        formatted_phone = self.format_phone_number(to_phone)
        if not formatted_phone:
            return {
                'success': False,
                'error': 'Invalid phone number format',
                'message_id': None
            }
        
        # Validate message length
        if len(message) > 1600:
            return {
                'success': False,
                'error': 'Message too long (max 1600 characters)',
                'message_id': None
            }
        
        try:
            # Send message via Twilio
            message_obj = self.client.messages.create(
                body=message,
                from_=self.whatsapp_number,
                to=f'whatsapp:{formatted_phone}'
            )
            
            # Update recipient status in database
            recipient = db.query(CampaignRecipient).filter(
                CampaignRecipient.id == recipient_id
            ).first()
            
            if recipient:
                recipient.status = 'sent'
                recipient.sent_at = message_obj.date_created
                recipient.delivery_status = message_obj.status
                db.commit()
            
            logger.info(f"WhatsApp message sent successfully. SID: {message_obj.sid}")
            
            return {
                'success': True,
                'message_id': message_obj.sid,
                'status': message_obj.status,
                'error': None
            }
            
        except TwilioException as e:
            error_msg = f"Twilio error: {str(e)}"
            logger.error(error_msg)
            
            # Update recipient status to failed
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
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            
            # Update recipient status to failed
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
    
    def get_message_status(self, message_sid: str) -> Optional[Dict[str, Any]]:
        """
        Get the status of a sent message
        
        Args:
            message_sid: Twilio message SID
            
        Returns:
            Dict with message status and details, or None if not found
        """
        if not self.is_available():
            return None
        
        try:
            message = self.client.messages(message_sid).fetch()
            return {
                'sid': message.sid,
                'status': message.status,
                'date_created': message.date_created,
                'date_sent': message.date_sent,
                'date_updated': message.date_updated,
                'error_code': message.error_code,
                'error_message': message.error_message,
                'price': message.price,
                'price_unit': message.price_unit
            }
        except TwilioException as e:
            logger.error(f"Failed to fetch message status: {str(e)}")
            return None
    
    def send_batch_messages(
        self, 
        recipients: list, 
        message: str, 
        campaign_id: int,
        db: Session,
        batch_size: int = 10
    ) -> Dict[str, Any]:
        """
        Send WhatsApp messages to multiple recipients in batches
        
        Args:
            recipients: List of recipient objects with phone numbers
            message: Message content
            campaign_id: Campaign ID
            db: Database session
            batch_size: Number of messages to send per batch (rate limiting)
        
        Returns:
            Dict with batch sending results
        """
        if not self.is_available():
            return {
                'success': False,
                'error': 'WhatsApp service not available',
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
                result = self.send_message(
                    to_phone=recipient.customer_phone,
                    message=message,
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
                time.sleep(1)
        
        if results['failed_count'] > 0:
            results['success'] = False
        
        logger.info(f"Batch WhatsApp sending completed. Sent: {results['sent_count']}, Failed: {results['failed_count']}")
        
        return results


# Global instance
whatsapp_service = WhatsAppService()
