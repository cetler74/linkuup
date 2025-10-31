# Brevo Email Integration

This document describes the Brevo email integration implemented for LinkUup's booking system.

## Overview

Brevo (formerly Sendinblue) is now the primary email service provider for LinkUup, replacing Gmail API as the main email delivery method. Gmail API is kept as a fallback option.

## Features

- **Primary Email Provider**: Brevo API for all email communications
- **Fallback Support**: Gmail API as backup if Brevo fails
- **Booking Notifications**: Automated emails for booking requests and status changes
- **Campaign Emails**: Support for marketing campaigns
- **Professional Templates**: HTML and text email templates with consistent branding

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Brevo Email Service (Primary)
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
BREVO_SENDER_EMAIL=noreply@linkuup.com
BREVO_SENDER_NAME=LinkUup

# Gmail API (Fallback - Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Getting Brevo API Key

1. Sign up for a Brevo account at [https://www.brevo.com](https://www.brevo.com)
2. Go to your account settings
3. Navigate to "SMTP & API" section
4. Generate a new API key
5. Copy the API key and add it to your environment variables

## Email Types

### 1. Booking Request Notifications

Sent when a customer makes a new booking:

- **Trigger**: New booking creation
- **Recipients**: Customer who made the booking
- **Content**: Booking details, services, pricing, confirmation status

### 2. Booking Status Notifications

Sent when booking status changes:

- **Triggers**: 
  - Booking confirmed
  - Booking cancelled
  - Service completed
- **Recipients**: Customer
- **Content**: Updated status, booking details, next steps

### 3. Campaign Emails

Sent for marketing campaigns:

- **Trigger**: Campaign execution
- **Recipients**: Campaign recipients
- **Content**: Custom campaign content

## Implementation Details

### Files Modified

1. **`backend/brevo_email_service.py`** - New Brevo email service
2. **`backend/email_service.py`** - Updated to use Brevo as primary
3. **`backend/core/config.py`** - Added Brevo configuration
4. **`backend/api/v1/places.py`** - Updated booking creation
5. **`backend/api/v1/owner/bookings.py`** - Updated owner booking endpoints
6. **`backend/api/v1/customer/bookings.py`** - Updated customer booking endpoints

### Email Templates

All emails use professional HTML templates with:

- Consistent LinkUup branding
- Responsive design
- Clear call-to-actions
- Fallback text versions
- Professional styling

### Error Handling

- **Primary Failure**: If Brevo fails, automatically falls back to Gmail
- **Complete Failure**: If both services fail, logs error and continues operation
- **Graceful Degradation**: System continues to function even if email fails

## Testing

### Test Script

Run the test script to verify Brevo integration:

```bash
python test_brevo_integration.py
```

### Manual Testing

1. Create a new booking through the API
2. Check that booking request email is sent
3. Update booking status to "confirmed"
4. Check that status change email is sent
5. Cancel a booking
6. Check that cancellation email is sent

## API Usage

### Sending Booking Request Notification

```python
from backend.brevo_email_service import brevo_email_service

email_data = {
    'customer_name': 'John Doe',
    'customer_email': 'john@example.com',
    'salon_name': 'Hair Salon',
    'booking_date': '2024-01-15',
    'booking_time': '14:00',
    'duration': 60,
    'total_price': 50.0,
    'services': [
        {
            'service_name': 'Haircut',
            'service_price': 30.0,
            'service_duration': 30
        }
    ]
}

success = brevo_email_service.send_booking_request_notification(email_data)
```

### Sending Status Change Notification

```python
status_data = {
    'customer_name': 'John Doe',
    'customer_email': 'john@example.com',
    'salon_name': 'Hair Salon',
    'service_name': 'Haircut',
    'booking_date': '2024-01-15',
    'booking_time': '14:00',
    'duration': 60,
    'status': 'confirmed'  # or 'cancelled', 'completed'
}

success = brevo_email_service.send_booking_status_notification(status_data)
```

## Monitoring

### Logs

Email sending is logged with appropriate levels:

- **INFO**: Successful email sends
- **WARNING**: Service unavailable, using fallback
- **ERROR**: Failed email sends, errors

### Metrics

Monitor these metrics:

- Email delivery success rate
- Brevo vs Gmail usage
- Failed email attempts
- API response times

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify BREVO_API_KEY is correct
   - Check API key permissions
   - Ensure account is active

2. **Email Not Sending**
   - Check logs for error messages
   - Verify sender email is configured
   - Test with Brevo dashboard

3. **Template Issues**
   - Check HTML template syntax
   - Verify all required fields are provided
   - Test with simple text content first

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('backend.brevo_email_service').setLevel(logging.DEBUG)
```

## Migration from Gmail

The system automatically uses Brevo as primary and Gmail as fallback. No manual migration is required.

### Rollback

To rollback to Gmail only:

1. Comment out Brevo service initialization in `email_service.py`
2. Set `self.brevo_service = None`
3. Restart the application

## Support

For issues with Brevo integration:

1. Check the logs for error messages
2. Verify API key and configuration
3. Test with the provided test script
4. Contact Brevo support for API issues

## Future Enhancements

- Email templates customization
- A/B testing for email content
- Advanced analytics and tracking
- Email scheduling
- Template management interface
