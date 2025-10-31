#!/usr/bin/env python3
"""
Gmail API Email Service for LinkUup
Handles email notifications using Gmail API instead of SMTP
"""

import os
import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

class GmailAPIService:
    def __init__(self, app=None):
        self.service = None
        self.credentials = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize Gmail API service with Flask app"""
        self.app = app
        self.credentials_path = os.getenv('GMAIL_CREDENTIALS_PATH', 'credentials.json')
        self.token_path = os.getenv('GMAIL_TOKEN_PATH', 'token.json')
        self.sender_email = os.getenv('GMAIL_SENDER_EMAIL', 'cetler74@gmail.com')
        
        try:
            self._authenticate()
            logger.info("Gmail API service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gmail API service: {str(e)}")
            raise
    
    def _authenticate(self):
        """Authenticate with Gmail API"""
        creds = None
        
        # Load existing token
        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        
        # If there are no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_path):
                    raise FileNotFoundError(f"Gmail credentials file not found at {self.credentials_path}")
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save credentials for next run
            with open(self.token_path, 'w') as token:
                token.write(creds.to_json())
        
        self.credentials = creds
        self.service = build('gmail', 'v1', credentials=creds)
    
    def _create_message(self, to, subject, body_text, body_html=None):
        """Create a message for an email"""
        message = MIMEMultipart('alternative')
        message['to'] = to
        message['from'] = f'LinkUup <{self.sender_email}>'
        message['subject'] = subject
        message['Reply-To'] = self.sender_email
        message['X-Mailer'] = 'LinkUup Booking System'
        
        # Add text part
        text_part = MIMEText(body_text, 'plain')
        message.attach(text_part)
        
        # Add HTML part if provided
        if body_html:
            html_part = MIMEText(body_html, 'html')
            message.attach(html_part)
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        return {'raw': raw_message}
    
    def _format_services_html(self, services):
        """Format services list as HTML"""
        if not services:
            return "<li>No services specified</li>"
        
        html = ""
        for service in services:
            html += f"<li><strong>{service.get('service_name', 'Unknown Service')}</strong> - €{service.get('service_price', 0)} ({service.get('service_duration', 0)} min)</li>"
        return html
    
    def _format_services_text(self, services):
        """Format services list as plain text"""
        if not services:
            return "- No services specified"
        
        text = ""
        for service in services:
            text += f"- {service.get('service_name', 'Unknown Service')} - €{service.get('service_price', 0)} ({service.get('service_duration', 0)} min)\n"
        return text.strip()

    def send_email(self, to, subject, body_text, body_html=None):
        """Send an email using Gmail API"""
        try:
            message = self._create_message(to, subject, body_text, body_html)
            
            # Send message
            sent_message = self.service.users().messages().send(
                userId='me', body=message).execute()
            
            logger.info(f"Email sent successfully to {to}. Message ID: {sent_message['id']}")
            return True
            
        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            return False
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def send_booking_request_notification(self, booking_data):
        """Send email notification when a booking is requested"""
        try:
            subject = "Booking Request Received - LinkUup"
            
            # Create HTML email template
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Booking Request Received</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .booking-details {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                    .status-pending {{ color: #f39c12; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Booking Request Received</h1>
                    </div>
                    <div class="content">
                        <p>Dear {booking_data['customer_name']},</p>
                        
                        <p>Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly.</p>
                        
                        <div class="booking-details">
                            <h3>Booking Details:</h3>
                            <p><strong>Salon:</strong> {booking_data['salon_name']}</p>
                            <p><strong>Services:</strong></p>
                            <ul>
                                {self._format_services_html(booking_data.get('services', []))}
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
                </div>
            </body>
            </html>
            """
            
            # Create plain text version
            text_body = f"""
            Booking Request Received - LinkUup
            
            Dear {booking_data['customer_name']},
            
            Thank you for your booking request! We have received your appointment request and will send you a confirmation shortly.
            
            Booking Details:
            - Salon: {booking_data['salon_name']}
            - Services:
            {self._format_services_text(booking_data.get('services', []))}
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
            
            return self.send_email(
                to=booking_data['customer_email'],
                subject=subject,
                body_text=text_body,
                body_html=html_body
            )
            
        except Exception as e:
            logger.error(f"Failed to send booking request notification: {str(e)}")
            return False
    
    def send_booking_status_notification(self, booking_data):
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
            
            # Create HTML email template
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>{status_info['subject']}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .booking-details {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                    .status {{ color: {status_info['status_color']}; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>{status_info['subject']}</h1>
                    </div>
                    <div class="content">
                        <p>Dear {booking_data['customer_name']},</p>
                        
                        <p>{status_info['message']}</p>
                        
                        <div class="booking-details">
                            <h3>Booking Details:</h3>
                            <p><strong>Salon:</strong> {booking_data['salon_name']}</p>
                            <p><strong>Service:</strong> {booking_data['service_name']}</p>
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
                </div>
            </body>
            </html>
            """
            
            # Create plain text version
            text_body = f"""
            {status_info['subject']}
            
            Dear {booking_data['customer_name']},
            
            {status_info['message']}
            
            Booking Details:
            - Salon: {booking_data['salon_name']}
            - Service: {booking_data['service_name']}
            - Date: {booking_data['booking_date']}
            - Time: {booking_data['booking_time']}
            - Duration: {booking_data['duration']} minutes
            - Status: {status_info['status_text']}
            
            If you have any questions or need to make changes, please contact us.
            
            Best regards,
            The LinkUup Team
            
            This is an automated message. Please do not reply to this email.
            """
            
            return self.send_email(
                to=booking_data['customer_email'],
                subject=status_info['subject'],
                body_text=text_body,
                body_html=html_body
            )
            
        except Exception as e:
            logger.error(f"Failed to send booking status notification: {str(e)}")
            return False

# Global Gmail API service instance
gmail_api_service = GmailAPIService()
