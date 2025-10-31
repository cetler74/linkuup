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
        # Get API key from environment or settings
        if SETTINGS_AVAILABLE and hasattr(settings, 'BREVO_API_KEY'):
            self.api_key = os.getenv('BREVO_API_KEY', settings.BREVO_API_KEY)
        else:
            self.api_key = os.getenv('BREVO_API_KEY')
            
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
        print(f"BREVO DEBUG: Attempting to send to {to_email} with key {self.api_key[:8]}...")
        if not self.api_key:
            logger.error("Brevo API key not configured")
            return False
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
            response = requests.post(url, headers=self._get_headers(), json=payload)
            if response.status_code == 201:
                logger.info(f"Email sent successfully to {to_email}")
                print(f"BREVO DEBUG: Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email to {to_email}. Status: {response.status_code}, Response: {response.text}")
                print(f"BREVO DEBUG: Failed to send email to {to_email}. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            print(f"BREVO EXCEPTION: {e}")
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False
    
    def send_booking_request_notification(self, booking_data: Dict[str, Any]) -> bool:
        """Send email notification when a booking is requested"""
        try:
            subject = "Booking Request Received - LinkUup"
            
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
                    <h1>Booking Request Received</h1>
                    <p>Thank you for choosing LinkUup!</p>
                </div>
                
                <div class="content">
                    <p>Dear {booking_data['customer_name']},</p>
                    
                    <p>Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly.</p>
                    
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
                        <p><strong>Status:</strong> <span class="status-pending">Pending Confirmation</span></p>
                    </div>
                    
                    <p>Our salon team will review your request and send you a confirmation email within 24 hours.</p>
                    
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
            Booking Request Received - LinkUup
            
            Dear {booking_data['customer_name']},
            
            Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly.
            
            Booking Details:
            - Salon: {booking_data['salon_name']}
            - Services:
            {services_text}
            - Date: {booking_data['booking_date']}
            - Time: {booking_data['booking_time']}
            - Total Duration: {booking_data['duration']} minutes
            - Total Price: €{booking_data.get('total_price', 0)}
            - Status: Pending Confirmation
            
            Our salon team will review your request and send you a confirmation email within 24 hours.
            
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

# Global Brevo email service instance
brevo_email_service = BrevoEmailService()
