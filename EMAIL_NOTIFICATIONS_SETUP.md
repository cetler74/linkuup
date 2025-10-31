# Email Notifications Setup Guide

## Overview
The BioSearch2 application now includes comprehensive email notifications for booking requests and status updates.

## Features Implemented

### 1. Booking Request Notification
- **Trigger**: When a customer makes a booking request
- **Recipient**: Customer's email address
- **Content**: 
  - Confirmation that booking request was received
  - Booking details (salon, service, date, time, duration)
  - Status: "Pending Confirmation"
  - Message that confirmation will be sent shortly

### 2. Booking Status Notification
- **Trigger**: When salon manager changes booking status
- **Recipient**: Customer's email address
- **Content**:
  - Updated booking status (confirmed, cancelled, completed)
  - Complete booking details
  - Appropriate message based on status

## Email Configuration

### Environment Variables
Add these to your `.env` file:

```bash
# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@biosearch.pt
```

### Gmail Setup (Recommended)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `MAIL_PASSWORD`

### Alternative Email Providers
- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` port 587
- **Yahoo**: Use `smtp.mail.yahoo.com` port 587
- **Custom SMTP**: Configure your own SMTP server

## Testing Email Notifications

### 1. Test Script
Run the test script to verify email configuration:

```bash
cd "/Volumes/OWC Volume/Projects2025/BioSearch2"
source venv/bin/activate
python3 scripts/test_email_notifications.py
```

### 2. Manual Testing
1. **Create a booking** through the frontend
2. **Check customer's email** for booking request notification
3. **Change booking status** as salon manager
4. **Check customer's email** for status update notification

## Email Templates

### Booking Request Email
- **Subject**: "Booking Request Received - BioSearch"
- **Status**: Pending Confirmation
- **Message**: Confirmation will be sent within 24 hours

### Status Update Emails
- **Confirmed**: "Booking Confirmed - BioSearch"
- **Cancelled**: "Booking Cancelled - BioSearch"  
- **Completed**: "Service Completed - BioSearch"

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check email credentials
   - Use app password for Gmail (not regular password)
   - Ensure 2FA is enabled

2. **"Connection refused"**
   - Check MAIL_SERVER and MAIL_PORT
   - Verify firewall settings
   - Try different port (465 for SSL)

3. **"Emails not sending"**
   - Check email service logs
   - Verify MAIL_DEFAULT_SENDER is valid
   - Test with different email provider

### Debug Mode
Enable debug logging by setting:
```bash
FLASK_DEBUG=True
```

## Production Considerations

### Security
- Use environment variables for email credentials
- Never commit email passwords to version control
- Use app-specific passwords
- Consider using email service providers (SendGrid, Mailgun)

### Performance
- Email sending is asynchronous (won't block booking creation)
- Failed emails are logged but don't affect booking process
- Consider implementing email queue for high volume

### Monitoring
- Monitor email delivery rates
- Set up alerts for failed email sends
- Track customer engagement with emails

## API Integration

### Booking Creation
The `/api/bookings` POST endpoint now automatically sends booking request notifications.

### Status Updates
The `/api/manager/bookings/<id>/status` PUT endpoint now automatically sends status change notifications.

### Error Handling
- Email failures don't affect booking operations
- Errors are logged for debugging
- System continues to function even if email service is down

## Customization

### Email Templates
Modify templates in `backend/email_service.py`:
- `send_booking_request_notification()`
- `send_booking_status_notification()`

### Styling
Email templates use inline CSS for maximum compatibility across email clients.

### Content
Customize email content, branding, and messaging as needed for your business.
