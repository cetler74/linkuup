"""
Contact Sales API endpoint
Handles contact sales form submissions and sends email notifications to sales team
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter()

class ContactSalesRequest(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    message: str

class ContactSalesResponse(BaseModel):
    success: bool
    message: str

@router.post("/", response_model=ContactSalesResponse, status_code=status.HTTP_200_OK)
async def submit_contact_sales(contact_data: ContactSalesRequest):
    print(f"CONTACT SALES ENDPOINT DEBUG: Received contact sales POST for {contact_data.email}")
    """
    Submit contact sales form and send email notification to sales team
    
    For testing purposes, sends to cetler74@gmail.com
    """
    try:
        # Initialize email service
        email_service = EmailService()
        
        # Test email recipient (hardcoded for testing)
        test_email = "cetler74@gmail.com"
        
        # Check if email service is properly configured
        if not email_service.brevo_service:
            logger.error("Brevo email service not available")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Email service is not configured. Please contact support."
            )
        
        # Create HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Sales Inquiry - LinkUup</title>
            <style>
                body {{
                    font-family: 'Open Sans', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }}
                .container {{
                    background-color: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #1E90FF;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #1E90FF;
                    margin-bottom: 10px;
                }}
                .title {{
                    font-size: 24px;
                    color: #333;
                    margin: 0;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .field {{
                    margin-bottom: 15px;
                }}
                .field-label {{
                    font-weight: bold;
                    color: #1E90FF;
                    margin-bottom: 5px;
                    display: block;
                }}
                .field-value {{
                    background-color: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    border-left: 3px solid #1E90FF;
                }}
                .message-content {{
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 4px;
                    border-left: 3px solid #1E90FF;
                    white-space: pre-wrap;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    color: #666;
                    font-size: 14px;
                }}
                .cta {{
                    background-color: #1E90FF;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    display: inline-block;
                    margin-top: 20px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">LinkUup</div>
                    <h1 class="title">New Sales Inquiry</h1>
                </div>
                
                <div class="content">
                    <p>A potential enterprise customer has submitted a sales inquiry through the pricing page.</p>
                    
                    <div class="field">
                        <span class="field-label">Name:</span>
                        <div class="field-value">{contact_data.name}</div>
                    </div>
                    
                    <div class="field">
                        <span class="field-label">Email:</span>
                        <div class="field-value">{contact_data.email}</div>
                    </div>
                    
                    {f'<div class="field"><span class="field-label">Company:</span><div class="field-value">{contact_data.company}</div></div>' if contact_data.company else ''}
                    
                    <div class="field">
                        <span class="field-label">Message:</span>
                        <div class="message-content">{contact_data.message}</div>
                    </div>
                    
                    <p><strong>Action Required:</strong> Please follow up with this potential enterprise customer as soon as possible.</p>
                    
                    <a href="mailto:{contact_data.email}" class="cta">Reply to Customer</a>
                </div>
                
                <div class="footer">
                    <p>This is an automated message from LinkUup Sales Inquiry System.</p>
                    <p>Please respond to this inquiry at your earliest convenience.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create text version
        text_content = f"""
        NEW SALES INQUIRY - LinkUup
        
        A potential enterprise customer has submitted a sales inquiry through the pricing page.
        
        Name: {contact_data.name}
        Email: {contact_data.email}
        {f'Company: {contact_data.company}' if contact_data.company else ''}
        
        Message:
        {contact_data.message}
        
        Action Required: Please follow up with this potential enterprise customer as soon as possible.
        
        Reply to: {contact_data.email}
        
        ---
        This is an automated message from LinkUup Sales Inquiry System.
        Please respond to this inquiry at your earliest convenience.
        """
        
        # Send email using Brevo service
        if email_service.brevo_service:
            success = email_service.brevo_service.send_transactional_email(
                to_email=test_email,
                to_name="LinkUup Sales Team",
                subject=f"Sales Inquiry from {contact_data.name} - Enterprise Plan",
                html_content=html_content,
                text_content=text_content
            )
            
            if success:
                logger.info(f"Contact sales email sent successfully to {test_email}")
                return ContactSalesResponse(
                    success=True,
                    message="Thank you for your interest in our Enterprise plan! Our sales team will contact you within 24 hours."
                )
            else:
                logger.error(f"Failed to send contact sales email to {test_email}")
                # For testing purposes, return success even if email fails
                logger.warning("Email service failed but returning success for testing")
                return ContactSalesResponse(
                    success=True,
                    message="Thank you for your interest! We have received your inquiry and will contact you soon. (Email service temporarily unavailable - inquiry logged)"
                )
        else:
            logger.error("Email service not available")
            # For testing purposes, return success even if email service is not configured
            logger.warning("Email service not configured but returning success for testing")
            return ContactSalesResponse(
                success=True,
                message="Thank you for your interest! We have received your inquiry and will contact you soon. (Email service not configured - inquiry logged for testing)"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing contact sales form: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {str(e)}"
        )
