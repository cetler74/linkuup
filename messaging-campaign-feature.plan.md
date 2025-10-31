# Messaging Campaign Implementation Plan

## Overview
Add a new `messaging` campaign type to enable owners to send email and WhatsApp messages to their customer base with proper GDPR consent handling, customer selection UI, and scheduled delivery.

## Key Requirements
- Pull customers from bookings at selected places who have `gdpr_marketing_consent = true`
- Support Email and WhatsApp (via Twilio API)
- Scheduled send times (or immediate sending)
- Bulk customer selection with filters (select all, filter by criteria)

---

## Phase 1: Database Layer

### 1. Campaign Recipients Table
Create `scripts/create_campaign_recipients_table.sql`:
```sql
CREATE TABLE campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivery_status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);
```

### 2. Campaign Messages Table
Create `scripts/create_campaign_messages_table.sql`:
```sql
CREATE TABLE campaign_messages (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    template_variables JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Alembic Migration
File: `backend/alembic/versions/YYYYMMDD_add_messaging_campaigns.py`
- Create both tables above
- No schema changes to campaigns table needed (config JSON handles messaging settings)

---

## Phase 2: Backend Models & Schemas

### 4. Update Campaign Model
File: `backend/models/campaign.py`
- Add `CampaignRecipient` model class
- Add `CampaignMessage` model class  
- Add relationships to existing Campaign model

### 5. Campaign Schemas
File: `backend/schemas/campaign.py`

Add new config schema:
```python
class MessagingConfig(BaseModel):
    channels: List[str]  # ['email', 'whatsapp']
    email_subject: Optional[str]
    email_body: Optional[str]
    whatsapp_message: Optional[str]
    scheduled_send_time: Optional[datetime]
    send_immediately: bool = False
```

Update `CampaignBase`:
- Change campaign_type pattern to include `messaging`

Update `CampaignCreate`:
- Add `messaging_config: Optional[MessagingConfig]`

Add new schemas:
- `CampaignRecipientResponse`
- `MessagingStatsResponse`
- `CustomerForMessaging` (for customer list endpoint)

---

## Phase 3: Backend Services

### 6. WhatsApp Service
File: `backend/services/whatsapp_service.py`

New service class:
```python
class WhatsAppService:
    def __init__(self):
        # Initialize Twilio client
    
    def send_message(self, to_phone: str, message: str, campaign_id: int, recipient_id: int):
        # Send via Twilio WhatsApp API
        # Update recipient status
        # Handle errors
    
    def validate_phone_number(self, phone: str) -> bool:
        # Ensure E.164 format
```

Environment variables needed:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`

### 7. Email Service Enhancement
File: `backend/email_service.py`

Add method:
```python
def send_campaign_email(self, to: str, subject: str, body: str, campaign_id: int, recipient_id: int):
    # Send email
    # Update recipient status in campaign_recipients table
    # Log delivery
```

### 8. Messaging Campaign Service
File: `backend/services/messaging_campaign_service.py`

Core service methods:
```python
class MessagingCampaignService:
    async def get_eligible_customers(db, place_ids, filters):
        # Query bookings table for customers at selected places
        # Filter by gdpr_marketing_consent = true
        # Apply additional filters (has_email, has_phone, etc.)
        # Return unique customers with contact info
    
    async def add_recipients(db, campaign_id, user_ids):
        # Insert into campaign_recipients
    
    async def remove_recipient(db, campaign_id, recipient_id):
        # Delete from campaign_recipients
    
    async def send_campaign(db, campaign_id):
        # Get campaign and recipients
        # Check if scheduled or immediate
        # Send via email/whatsapp based on channels
        # Update statuses
    
    async def get_campaign_stats(db, campaign_id):
        # Count pending/sent/failed
        # Calculate delivery rate
        # Group by channel
```

### 9. Campaign Scheduler
File: `backend/cron/campaign_scheduler.py`

Scheduled job to check for campaigns ready to send:
```python
async def check_scheduled_campaigns():
    # Find campaigns with scheduled_send_time <= now and status = 'scheduled'
    # Call send_campaign for each
    # Run every 5 minutes via cron
```

---

## Phase 4: Backend API Endpoints

### 10. Campaign Customer List
File: `backend/api/v1/owner/campaigns.py`

```python
@router.get("/campaigns/messaging/customers")
async def get_messaging_campaign_customers(
    place_ids: List[int] = Query(...),
    filter_by: Optional[str] = Query(None),  # all, has_email, has_phone
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    # Returns: CustomerForMessaging list
```

### 11. Recipient Management Endpoints
File: `backend/api/v1/owner/campaigns.py`

```python
@router.post("/campaigns/{campaign_id}/recipients")
async def add_campaign_recipients(...)

@router.get("/campaigns/{campaign_id}/recipients")
async def get_campaign_recipients(...)

@router.delete("/campaigns/{campaign_id}/recipients/{recipient_id}")
async def remove_campaign_recipient(...)
```

### 12. Send Campaign
File: `backend/api/v1/owner/campaigns.py`

```python
@router.post("/campaigns/{campaign_id}/send")
async def send_messaging_campaign(
    campaign_id: int,
    send_immediately: bool = False,
    ...
):
    # Validate messaging campaign
    # If send_immediately, trigger send
    # Else update scheduled_send_time
    # Return status
```

### 13. Campaign Stats
File: `backend/api/v1/owner/campaigns.py`

```python
@router.get("/campaigns/{campaign_id}/messaging-stats")
async def get_messaging_campaign_stats(...)
```

---

## Phase 5: Frontend Types

### 14. Update Campaign Types
File: `frontend/src/types/campaign.ts`

Update:
```typescript
campaign_type: 'price_reduction' | 'rewards_increase' | 'free_service' | 'messaging';
```

Add:
```typescript
export interface MessagingConfig {
  channels: ('email' | 'whatsapp')[];
  email_subject?: string;
  email_body?: string;
  whatsapp_message?: string;
  scheduled_send_time?: string;
  send_immediately: boolean;
}

export interface CampaignRecipient {
  id: number;
  user_id: number;
  customer_email: string;
  customer_phone?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
}

export interface MessagingCustomer {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  gdpr_marketing_consent: boolean;
  last_booking_date?: string;
  total_bookings: number;
}
```

File: `frontend/src/types/owner.ts` - Update Campaign interface similarly

---

## Phase 6: Frontend Components

### 15. Customer Selector Component
File: `frontend/src/components/owner/CustomerSelector.tsx`

Features:
- Search bar for name/email
- Filter dropdown (All, Has Email, Has Phone, Marketing Consent)
- Bulk action buttons: Select All, Deselect All, Select with Email, Select with Phone
- Customer grid with checkboxes
- Display: name, email, phone (masked), consent badge, last booking
- Selected count: "X of Y customers selected"

### 16. Messaging Campaign Form
File: `frontend/src/components/owner/MessagingCampaignForm.tsx`

Multi-step wizard (6 steps):
1. **Basic Info**: name, description
2. **Select Places**: checkbox list of owner's places
3. **Select Channels**: Email checkbox, WhatsApp checkbox
4. **Select Customers**: Uses CustomerSelector component
5. **Message Content**:
   - If email: subject input + rich text editor for body
   - If whatsapp: textarea with character counter (max 1600)
6. **Scheduling**:
   - "Send immediately" checkbox
   - Date/time picker for scheduled send
   - Preview summary before send

### 17. Campaign Stats Component  
File: `frontend/src/components/owner/CampaignStats.tsx`

Display cards for messaging campaigns:
- Total Recipients
- Sent Count (with percentage)
- Failed Count (with percentage)
- Pending Count
- Channel breakdown (email vs whatsapp)

### 18. Campaign Recipients Modal
File: `frontend/src/components/owner/CampaignRecipientsModal.tsx`

Features:
- Table of recipients with status
- Status badges (pending, sent, failed)
- Error messages for failed sends
- Delete button for pending recipients
- Filter by status
- Export recipient list

### 19. Update Campaigns Management Page
File: `frontend/src/pages/owner/CampaignsManagement.tsx`

Updates:
- Add `messaging` to campaign type selector
- Add envelope icon for messaging campaigns
- Add teal color scheme for messaging type
- Show messaging-specific stats
- Add "View Recipients" button for messaging campaigns
- Wire up MessagingCampaignForm for create/edit

---

## Phase 7: Frontend API Integration

### 20. Owner API Hooks
File: `frontend/src/utils/ownerApi.ts`

Add hooks:
```typescript
export function useOwnerApi() {
  // ... existing hooks
  
  const useMessagingCustomers = (placeIds: number[], filters?: any) => { ... }
  const useAddCampaignRecipients = () => { ... }
  const useRemoveCampaignRecipient = () => { ... }
  const useCampaignRecipients = (campaignId: number) => { ... }
  const useSendCampaign = () => { ... }
  const useMessagingStats = (campaignId: number) => { ... }
}
```

---

## Phase 8: Configuration & Dependencies

### 21. Backend Dependencies
File: `backend/requirements.txt`
- Add: `twilio>=8.0.0`

### 22. Environment Variables
File: `.env.example`
```
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

File: `backend/core/config.py`
- Add Twilio config fields to Settings class

---

## Phase 9: Testing & Validation

### 23. End-to-End Testing
Test complete workflow:
1. Create messaging campaign
2. Select multiple places
3. Load customer list (verify GDPR filtering)
4. Use bulk selection
5. Compose email and WhatsApp messages
6. Schedule campaign
7. Verify send (or test immediate send)
8. Check recipient statuses
9. View campaign stats

---

## Implementation Notes

**GDPR Compliance**:
- Only show customers with `gdpr_marketing_consent = true`
- Add unsubscribe link to emails (future enhancement)

**Phone Number Validation**:
- Twilio requires E.164 format: +[country_code][number]
- Validate before sending

**Rate Limiting**:
- Implement batch sending to avoid API limits
- Twilio: ~80 msgs/sec for WhatsApp
- Gmail API: check current limits

**Error Handling**:
- Track failed sends per recipient
- Retry logic for transient failures
- Clear error messages in UI

**Security**:
- Validate owner has access to selected places
- Prevent sending to customers outside owner's places
- Audit log for all campaign sends

**Cost Considerations**:
- Twilio WhatsApp: ~$0.005 per message
- Track sending costs per campaign (future enhancement)

---

## To-dos

- [ ] Create database tables for campaign_recipients and campaign_messages
- [ ] Update Campaign model and create CampaignRecipient, CampaignMessage models
- [ ] Add messaging campaign schemas (MessagingConfig, recipients, stats)
- [ ] Implement WhatsApp service with Twilio integration
- [ ] Enhance email service for campaign tracking
- [ ] Create messaging campaign service (customer selection, sending, tracking)
- [ ] Implement campaign API endpoints (customers, recipients, send, stats)
- [ ] Create scheduled campaign worker for time-based sending
- [ ] Update TypeScript types for messaging campaigns
- [ ] Build CustomerSelector component with bulk actions and filters
- [ ] Create MessagingCampaignForm with multi-step wizard
- [ ] Build CampaignStats component for messaging analytics
- [ ] Create CampaignRecipientsModal for viewing/managing recipients
- [ ] Update CampaignsManagement page to support messaging type
- [ ] Add messaging campaign hooks to ownerApi
- [ ] Test complete flow: create campaign, select customers, send messages, track delivery
