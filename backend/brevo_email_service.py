"""
Brevo Email Service Integration
Handles all email communications through Brevo API
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import os
from pathlib import Path

# Try to load .env file using python-dotenv
try:
    from dotenv import load_dotenv
    # Load .env file from backend directory
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        # Try parent directory
        env_path = Path(__file__).parent.parent / '.env'
        if env_path.exists():
            load_dotenv(dotenv_path=env_path)
        else:
            load_dotenv()  # Try default location
except ImportError:
    pass  # python-dotenv not installed, will rely on system env vars

# Try to import settings, but don't fail if not available
try:
    from core.config import settings
    SETTINGS_AVAILABLE = True
except ImportError:
    SETTINGS_AVAILABLE = False
    settings = None

logger = logging.getLogger(__name__)

class BrevoEmailService:
    """Service for sending emails through Brevo API"""
    
    def __init__(self):
        # Ensure .env file is loaded
        try:
            from dotenv import load_dotenv
            env_path = Path(__file__).parent / '.env'
            if env_path.exists():
                load_dotenv(dotenv_path=env_path, override=True)
            else:
                # Try parent directory
                env_path = Path(__file__).parent.parent / '.env'
                if env_path.exists():
                    load_dotenv(dotenv_path=env_path, override=True)
                else:
                    load_dotenv(override=True)  # Try default location
        except ImportError:
            pass  # python-dotenv not installed, will rely on system env vars
        
        # Get API key - try settings first (from core.config which loads .env), then environment variable
        env_api_key = None
        
        # Try settings first (from core.config which loads .env file)
        if SETTINGS_AVAILABLE and hasattr(settings, 'BREVO_API_KEY'):
            env_api_key = settings.BREVO_API_KEY
            if env_api_key and env_api_key.strip():
                logger.info("Brevo API key loaded from settings")
        
        # If not in settings or empty, try environment variable (loaded by dotenv or system env)
        if not env_api_key or not env_api_key.strip():
            env_api_key = os.getenv('BREVO_API_KEY')
            if env_api_key and env_api_key.strip():
                logger.info("Brevo API key loaded from environment variable")
        
        # Only use non-empty values
        self.api_key = env_api_key if env_api_key and env_api_key.strip() else None
        
        # Debug logging
        if not self.api_key:
            settings_has_key = SETTINGS_AVAILABLE and hasattr(settings, 'BREVO_API_KEY') and settings.BREVO_API_KEY if SETTINGS_AVAILABLE else False
            env_has_key = bool(os.getenv('BREVO_API_KEY'))
            logger.warning(f"Brevo API key not found. Settings has key: {bool(settings_has_key)}, env var has key: {env_has_key}")
        else:
            logger.info(f"Brevo API key configured (length: {len(self.api_key)})")
            
        self.base_url = "https://api.brevo.com/v3"
        
        # Get sender details from environment or settings
        if SETTINGS_AVAILABLE and hasattr(settings, 'BREVO_SENDER_EMAIL'):
            self.sender_email = os.getenv('BREVO_SENDER_EMAIL', settings.BREVO_SENDER_EMAIL)
        else:
            self.sender_email = os.getenv('BREVO_SENDER_EMAIL', 'cetler74@gmail.com')
            
        if SETTINGS_AVAILABLE and hasattr(settings, 'BREVO_SENDER_NAME'):
            self.sender_name = os.getenv('BREVO_SENDER_NAME', settings.BREVO_SENDER_NAME)
        else:
            self.sender_name = os.getenv('BREVO_SENDER_NAME', 'LinkUup')
        
        if not self.api_key:
            logger.warning("Brevo API key not configured. Email functionality will be disabled.")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Brevo API requests"""
        return {
            'api-key': self.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def send_transactional_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        template_id: Optional[int] = None,
        template_params: Optional[Dict[str, Any]] = None
    ) -> bool:
        # Check if API key is configured (not None, not empty string)
        if not self.api_key or self.api_key.strip() == "":
            logger.error("❌ Brevo API key not configured - cannot send email")
            print(f"❌ BREVO DEBUG: API key not configured. Cannot send email to {to_email}")
            return False
        
        print(f"✅ BREVO DEBUG: Attempting to send to {to_email}")
        print(f"📧 BREVO DEBUG: From: {self.sender_name} <{self.sender_email}>")
        print(f"📧 BREVO DEBUG: To: {to_name} <{to_email}>")
        print(f"📧 BREVO DEBUG: Subject: {subject}")
        print(f"📧 BREVO DEBUG: API Key: {self.api_key[:8] if len(self.api_key) > 8 else '****'}...")
        
        try:
            url = f"{self.base_url}/smtp/email"
            payload = {
                "sender": {
                    "name": self.sender_name,
                    "email": self.sender_email
                },
                "to": [
                    {
                        "email": to_email,
                        "name": to_name
                    }
                ],
                "subject": subject,
                "htmlContent": html_content
            }
            if text_content:
                payload["textContent"] = text_content
            if template_id:
                payload["templateId"] = template_id
                if template_params:
                    payload["params"] = template_params
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            
            # Log the response for debugging
            logger.info(f"📧 Brevo API Response for {to_email}: Status={response.status_code}, Body={response.text[:200]}")
            print(f"📧 BREVO DEBUG: Response Status={response.status_code}")
            print(f"📧 BREVO DEBUG: Response Body={response.text[:500]}")
            
            if response.status_code == 201:
                # Parse response to get message ID if available
                try:
                    response_data = response.json()
                    message_id = response_data.get('messageId', 'N/A')
                    logger.info(f"✅ Email sent successfully to {to_email}. Message ID: {message_id}")
                    print(f"✅ BREVO DEBUG: Email sent successfully to {to_email}. Message ID: {message_id}")
                except:
                    logger.info(f"✅ Email sent successfully to {to_email}")
                    print(f"✅ BREVO DEBUG: Email sent successfully to {to_email}")
                return True
            else:
                error_msg = f"❌ Failed to send email to {to_email}. Status: {response.status_code}, Response: {response.text}"
                logger.error(error_msg)
                print(f"❌ BREVO DEBUG: {error_msg}")
                return False
        except Exception as e:
            error_msg = f"❌ BREVO EXCEPTION: Error sending email to {to_email}: {str(e)}"
            print(error_msg)
            logger.error(error_msg)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
    
    def send_booking_request_notification(self, booking_data: Dict[str, Any]) -> bool:
        """Send email notification when a booking is requested"""
        try:
            # Get booking status and format it for display
            booking_status = booking_data.get('status', 'pending').lower()
            
            # Map status to display text and styling
            status_map = {
                'pending': {'text': 'Pending Confirmation', 'class': 'status-pending', 'color': '#f39c12'},
                'confirmed': {'text': 'Confirmed', 'class': 'status-confirmed', 'color': '#27ae60'},
                'cancelled': {'text': 'Cancelled', 'class': 'status-cancelled', 'color': '#e74c3c'},
                'completed': {'text': 'Completed', 'class': 'status-completed', 'color': '#3498db'}
            }
            
            status_info = status_map.get(booking_status, status_map['pending'])
            status_text = status_info['text']
            status_class = status_info['class']
            status_color = status_info['color']
            
            # Adjust subject and message based on status
            if booking_status == 'confirmed':
                subject = "Booking Confirmed - LinkUup"
                greeting_message = "Great news! Your booking has been confirmed."
                follow_up_message = "We look forward to seeing you!"
            else:
                subject = "Booking Request Received - LinkUup"
                greeting_message = "Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly."
                follow_up_message = "Our salon team will review your request and send you a confirmation email within 24 hours."
            
            # Format services for display
            services_html = ""
            services_text = ""
            for service in booking_data.get('services', []):
                services_html += f"""
                <li>
                    <strong>{service['service_name']}</strong> - 
                    €{service['service_price']} 
                    ({service['service_duration']} minutes)
                </li>
                """
                services_text += f"- {service['service_name']} - €{service['service_price']} ({service['service_duration']} minutes)\n"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Booking Request Received</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background-color: #2a2a2e;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }}
                    .content {{
                        background-color: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }}
                    .booking-details {{
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #2a2a2e;
                    }}
                    .status-pending {{
                        color: #f39c12;
                        font-weight: bold;
                    }}
                    .status-confirmed {{
                        color: #27ae60;
                        font-weight: bold;
                    }}
                    .status-cancelled {{
                        color: #e74c3c;
                        font-weight: bold;
                    }}
                    .status-completed {{
                        color: #3498db;
                        font-weight: bold;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }}
                    ul {{
                        list-style-type: none;
                        padding: 0;
                    }}
                    li {{
                        padding: 5px 0;
                        border-bottom: 1px solid #eee;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>{subject.replace(' - LinkUup', '')}</h1>
                    <p>Thank you for choosing LinkUup!</p>
                </div>
                
                <div class="content">
                    <p>Dear {booking_data['customer_name']},</p>
                    
                    <p>{greeting_message}</p>
                    
                    <div class="booking-details">
                        <h3>Booking Details</h3>
                        <p><strong>Salon:</strong> {booking_data['salon_name']}</p>
                        <p><strong>Services:</strong></p>
                        <ul>
                            {services_html}
                        </ul>
                        <p><strong>Date:</strong> {booking_data['booking_date']}</p>
                        <p><strong>Time:</strong> {booking_data['booking_time']}</p>
                        <p><strong>Total Duration:</strong> {booking_data['duration']} minutes</p>
                        <p><strong>Total Price:</strong> €{booking_data.get('total_price', 0)}</p>
                        <p><strong>Status:</strong> <span class="{status_class}" style="color: {status_color};">{status_text}</span></p>
                    </div>
                    
                    <p>{follow_up_message}</p>
                    
                    <p>If you have any questions, please don't hesitate to contact us.</p>
                    
                    <p>Best regards,<br>
                    The LinkUup Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            {subject}
            
            Dear {booking_data['customer_name']},
            
            {greeting_message}
            
            Booking Details:
            - Salon: {booking_data['salon_name']}
            - Services:
            {services_text}
            - Date: {booking_data['booking_date']}
            - Time: {booking_data['booking_time']}
            - Total Duration: {booking_data['duration']} minutes
            - Total Price: €{booking_data.get('total_price', 0)}
            - Status: {status_text}
            
            {follow_up_message}
            
            If you have any questions, please don't hesitate to contact us.
            
            Best regards,
            The LinkUup Team
            
            This is an automated message. Please do not reply to this email.
            """
            
            return self.send_transactional_email(
                to_email=booking_data['customer_email'],
                to_name=booking_data['customer_name'],
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Failed to send booking request notification: {str(e)}")
            return False
    
    def send_booking_status_notification(self, booking_data: Dict[str, Any]) -> bool:
        """Send email notification when booking status changes"""
        try:
            status_messages = {
                'confirmed': {
                    'subject': 'Booking Confirmed - LinkUup',
                    'status_text': 'Confirmed',
                    'status_color': '#27ae60',
                    'message': 'Great news! Your booking has been confirmed. We look forward to seeing you!'
                },
                'cancelled': {
                    'subject': 'Booking Cancelled - LinkUup',
                    'status_text': 'Cancelled',
                    'status_color': '#e74c3c',
                    'message': 'We regret to inform you that your booking has been cancelled. Please contact us if you have any questions.'
                },
                'completed': {
                    'subject': 'Service Completed - LinkUup',
                    'status_text': 'Completed',
                    'status_color': '#3498db',
                    'message': 'Thank you for choosing our services! We hope you had a great experience.'
                }
            }
            
            status_info = status_messages.get(booking_data['status'], status_messages['confirmed'])
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{status_info['subject']}</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background-color: #2a2a2e;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }}
                    .content {{
                        background-color: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }}
                    .booking-details {{
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid {status_info['status_color']};
                    }}
                    .status {{
                        color: {status_info['status_color']};
                        font-weight: bold;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>{status_info['subject']}</h1>
                </div>
                
                <div class="content">
                    <p>Dear {booking_data['customer_name']},</p>
                    
                    <p>{status_info['message']}</p>
                    
                    <div class="booking-details">
                        <h3>Booking Details</h3>
                        <p><strong>Salon:</strong> {booking_data['salon_name']}</p>
                        <p><strong>Service:</strong> {booking_data.get('service_name', 'Multiple Services')}</p>
                        <p><strong>Date:</strong> {booking_data['booking_date']}</p>
                        <p><strong>Time:</strong> {booking_data['booking_time']}</p>
                        <p><strong>Duration:</strong> {booking_data['duration']} minutes</p>
                        <p><strong>Status:</strong> <span class="status">{status_info['status_text']}</span></p>
                    </div>
                    
                    <p>If you have any questions or need to make changes, please contact us.</p>
                    
                    <p>Best regards,<br>
                    The LinkUup Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            {status_info['subject']}
            
            Dear {booking_data['customer_name']},
            
            {status_info['message']}
            
            Booking Details:
            - Salon: {booking_data['salon_name']}
            - Service: {booking_data.get('service_name', 'Multiple Services')}
            - Date: {booking_data['booking_date']}
            - Time: {booking_data['booking_time']}
            - Duration: {booking_data['duration']} minutes
            - Status: {status_info['status_text']}
            
            If you have any questions or need to make changes, please contact us.
            
            Best regards,
            The LinkUup Team
            
            This is an automated message. Please do not reply to this email.
            """
            
            return self.send_transactional_email(
                to_email=booking_data['customer_email'],
                to_name=booking_data['customer_name'],
                subject=status_info['subject'],
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Failed to send booking status notification: {str(e)}")
            return False
    
    def send_campaign_email(
        self, 
        to_email: str, 
        to_name: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None
    ) -> bool:
        """Send campaign email through Brevo"""
        try:
            return self.send_transactional_email(
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
        except Exception as e:
            logger.error(f"Failed to send campaign email: {str(e)}")
            return False
    
    def send_booking_reminder(self, booking_data: Dict[str, Any]) -> bool:
        """Send booking reminder email"""
        try:
            subject = f"Appointment Reminder - {booking_data.get('service_name', 'Your Service')} tomorrow"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Appointment Reminder</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        background-color: #2a2a2e;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px 8px 0 0;
                    }}
                    .content {{
                        background-color: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 8px 8px;
                    }}
                    .reminder-details {{
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #f39c12;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Appointment Reminder</h1>
                </div>
                
                <div class="content">
                    <p>Hi {booking_data['customer_name']},</p>
                    
                    <p>This is a reminder that you have an appointment tomorrow:</p>
                    
                    <div class="reminder-details">
                        <h3>Appointment Details</h3>
                        <p><strong>Service:</strong> {booking_data.get('service_name', 'Multiple Services')}</p>
                        <p><strong>Date:</strong> {booking_data['booking_date']}</p>
                        <p><strong>Time:</strong> {booking_data['booking_time']}</p>
                        <p><strong>Location:</strong> {booking_data.get('business_name', booking_data.get('salon_name', 'Your Salon'))}</p>
                        <p><strong>Address:</strong> {booking_data.get('business_address', 'Please contact us for address')}</p>
                    </div>
                    
                    <p>If you need to reschedule, please call {booking_data.get('business_phone', 'us')}.</p>
                    
                    <p>Thank you!</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Appointment Reminder
            
            Hi {booking_data['customer_name']},
            
            This is a reminder that you have an appointment tomorrow:
            
            - Service: {booking_data.get('service_name', 'Multiple Services')}
            - Date: {booking_data['booking_date']}
            - Time: {booking_data['booking_time']}
            - Location: {booking_data.get('business_name', booking_data.get('salon_name', 'Your Salon'))}
            - Address: {booking_data.get('business_address', 'Please contact us for address')}
            
            If you need to reschedule, please call {booking_data.get('business_phone', 'us')}.
            
            Thank you!
            """
            
            return self.send_transactional_email(
                to_email=booking_data['customer_email'],
                to_name=booking_data['customer_name'],
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Failed to send booking reminder: {str(e)}")
            return False
    
    def send_password_reset_email(self, to_email: str, to_name: str, reset_token: str, reset_url: str, language: str = 'en') -> bool:
        """Send password reset email"""
        try:
            subject = "Password Reset Request - LinkUup"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Request</title>
                <style>
                    body {{
                        font-family: 'Open Sans', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #F5F5F5;
                    }}
                    .container {{
                        background-color: #FFFFFF;
                        border-radius: 8px;
                        box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }}
                    .header {{
                        background-color: #1E90FF;
                        color: white;
                        padding: 30px 20px;
                        text-align: center;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-family: 'Poppins', Arial, sans-serif;
                        font-weight: 600;
                        font-size: 24px;
                    }}
                    .content {{
                        padding: 30px;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #FF5A5F;
                        color: white;
                        padding: 14px 28px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 500;
                        margin: 20px 0;
                        text-align: center;
                    }}
                    .button:hover {{
                        background-color: #E0484D;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #9E9E9E;
                        font-size: 12px;
                        padding: 20px;
                        background-color: #F5F5F5;
                    }}
                    .warning {{
                        background-color: #FFF3CD;
                        border-left: 4px solid #FFC107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    
                    <div class="content">
                        <p>Hello {to_name},</p>
                        
                        <p>We received a request to reset your password for your LinkUup account. Click the button below to reset your password:</p>
                        
                        <div style="text-align: center;">
                            <a href="{reset_url}" class="button">Reset Password</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #1E90FF;">{reset_url}</p>
                        
                        <div class="warning">
                            <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                        </div>
                        
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        
                        <p>Best regards,<br>
                        The LinkUup Team</p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Password Reset Request - LinkUup
            
            Hello {to_name},
            
            We received a request to reset your password for your LinkUup account. 
            Click the link below to reset your password:
            
            {reset_url}
            
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            
            If you have any questions, please don't hesitate to contact us.
            
            Best regards,
            The LinkUup Team
            
            This is an automated message. Please do not reply to this email.
            """
            
            return self.send_transactional_email(
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return False
    
    def send_welcome_email(self, to_email: str, to_name: str, user_type: str, plan_name: str = None, language: str = 'en') -> bool:
        """Send welcome email to new users"""
        try:
            # Determine user type display name
            user_type_display = {
                "customer": "Customer",
                "business_owner": "Business Owner",
                "employee": "Employee",
                "platform_admin": "Platform Administrator"
            }.get(user_type, "User")
            
            subject = f"Welcome to LinkUup - {user_type_display}"
            
            # Build plan information section for business owners
            plan_section = ""
            if user_type == "business_owner" and plan_name:
                plan_section = f"""
                <div style="background-color: #E3F2FD; border-left: 4px solid #1E90FF; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: #1E90FF;">Your Subscription Plan</h3>
                    <p style="margin-bottom: 0;"><strong>Plan:</strong> {plan_name}</p>
                </div>
                """
            
            # Build welcome message based on user type
            welcome_message = ""
            if user_type == "customer":
                welcome_message = """
                <p>We're excited to have you join our community! As a customer, you can now:</p>
                <ul>
                    <li>Book appointments at your favorite businesses</li>
                    <li>Manage your bookings and appointments</li>
                    <li>Earn rewards and special offers</li>
                    <li>Leave reviews and share your experiences</li>
                </ul>
                """
            elif user_type == "business_owner":
                welcome_message = """
                <p>Welcome to LinkUup! As a business owner, you can now:</p>
                <ul>
                    <li>Manage your business profile and services</li>
                    <li>Handle bookings and appointments</li>
                    <li>Connect with customers and grow your business</li>
                    <li>Access powerful business management tools</li>
                </ul>
                """
            else:
                welcome_message = "<p>We're excited to have you join our platform!</p>"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to LinkUup</title>
                <style>
                    body {{
                        font-family: 'Open Sans', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #F5F5F5;
                    }}
                    .container {{
                        background-color: #FFFFFF;
                        border-radius: 8px;
                        box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }}
                    .header {{
                        background-color: #1E90FF;
                        color: white;
                        padding: 30px 20px;
                        text-align: center;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-family: 'Poppins', Arial, sans-serif;
                        font-weight: 600;
                        font-size: 28px;
                    }}
                    .content {{
                        padding: 30px;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #1E90FF;
                        color: white;
                        padding: 14px 28px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 500;
                        margin: 20px 0;
                        text-align: center;
                    }}
                    .button:hover {{
                        background-color: #1877D2;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 30px;
                        color: #9E9E9E;
                        font-size: 12px;
                        padding: 20px;
                        background-color: #F5F5F5;
                    }}
                    ul {{
                        padding-left: 20px;
                    }}
                    li {{
                        margin: 10px 0;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to LinkUup!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Hello {to_name},</p>
                        
                        <p>Thank you for joining LinkUup! We're thrilled to have you as part of our community.</p>
                        
                        <p><strong>Account Type:</strong> {user_type_display}</p>
                        
                        {plan_section}
                        
                        {welcome_message}
                        
                        <div style="text-align: center;">
                            <a href="http://linkuup.portugalexpatdirectory.com/login" class="button">Get Started</a>
                        </div>
                        
                        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                        
                        <p>Best regards,<br>
                        The LinkUup Team</p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            Welcome to LinkUup!
            
            Hello {to_name},
            
            Thank you for joining LinkUup! We're thrilled to have you as part of our community.
            
            Account Type: {user_type_display}
            """
            
            if user_type == "business_owner" and plan_name:
                text_content += f"\nYour Subscription Plan: {plan_name}\n"
            
            text_content += f"""
            
            {welcome_message.replace('<p>', '').replace('</p>', '').replace('<ul>', '').replace('</ul>', '').replace('<li>', '- ').replace('</li>', '')}
            
            Get started by visiting: http://linkuup.portugalexpatdirectory.com/login
            
            If you have any questions or need assistance, please don't hesitate to contact our support team.
            
            Best regards,
            The LinkUup Team
            
            This is an automated message. Please do not reply to this email.
            """
            
            return self.send_transactional_email(
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")
            return False

# Global Brevo email service instance
brevo_email_service = BrevoEmailService()
