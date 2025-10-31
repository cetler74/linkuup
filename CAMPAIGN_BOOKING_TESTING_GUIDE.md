# Campaign Booking Integration - Testing Guide

## Quick Start Testing

### Prerequisites
1. Database migration completed ✅
2. Backend server running on `http://localhost:5001`
3. Frontend server running on `http://localhost:5173`
4. At least one place with `id=11` (or adjust URL accordingly)
5. Services configured for the place
6. Active campaign created for testing

## Step-by-Step Testing

### 1. Create a Test Campaign

**Via Owner Dashboard:**
1. Login as business owner
2. Navigate to Campaigns Management
3. Create new campaign with:
   - **Name:** "Weekend Special"
   - **Type:** Price Reduction
   - **Discount:** 20% off
   - **Banner Message:** "Get 20% off all weekend bookings!"
   - **Start Date/Time:** Today at 09:00
   - **End Date/Time:** Tomorrow at 20:00
   - **Places:** Select place ID 11
   - **Services:** Select at least one service
4. Save and activate campaign

**Via API (cURL):**
```bash
curl -X POST http://localhost:5001/api/v1/owner/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Weekend Special",
    "description": "Weekend promotion",
    "banner_message": "Get 20% off all weekend bookings!",
    "campaign_type": "price_reduction",
    "start_datetime": "2025-10-27T09:00:00",
    "end_datetime": "2025-10-28T20:00:00",
    "is_active": true,
    "place_ids": [11],
    "service_ids": [1],
    "price_reduction_config": {
      "discount_type": "percentage",
      "discount_value": 20
    }
  }'
```

### 2. Test Booking Page - Visual Indicators

1. **Navigate to booking page:**
   ```
   http://localhost:5173/book/11
   ```

2. **Select a service** that has the campaign applied

3. **Select today's date** (within campaign period)

4. **Check time slots:**
   - ✅ Slots within campaign period should show:
     - Green border (for price_reduction)
     - 💰 emoji badge in corner
   - ✅ Hover over slot to see tooltip with:
     - Campaign banner message
     - Discount details

5. **Select a time slot** with campaign indicator

6. **Complete booking form:**
   - Enter customer name
   - Enter email
   - Enter phone
   - Select employee (or "Any Available")

7. **Submit booking**
   - ✅ Should show success message
   - ✅ Booking should be created

### 3. Verify Campaign Data in Database

**Check booking record:**
```sql
SELECT 
  id, 
  customer_name, 
  booking_date, 
  booking_time,
  campaign_id,
  campaign_name,
  campaign_type,
  campaign_banner_message,
  campaign_discount_type,
  campaign_discount_value
FROM bookings 
WHERE campaign_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected result:**
- `campaign_id`: Should match your campaign ID
- `campaign_name`: "Weekend Special"
- `campaign_type`: "price_reduction"
- `campaign_banner_message`: "Get 20% off all weekend bookings!"
- `campaign_discount_type`: "percentage"
- `campaign_discount_value`: 20.00

### 4. Test Owner Dashboard - Campaign Display

1. **Login as business owner**

2. **Navigate to Bookings Management**

3. **View bookings list**
   - ✅ Booking with campaign should show:
     - 🎉 Green campaign badge
     - Campaign name: "Weekend Special"
     - Banner message displayed
     - Discount: "20% off"

4. **Calendar view**
   - Booking should appear on calendar
   - Click to view details
   - Campaign information should be visible

### 5. Test Edge Cases

#### Test 1: Booking Outside Campaign Period
1. Create campaign for specific hours (e.g., 14:00-16:00)
2. Select time slot outside those hours (e.g., 10:00)
3. ✅ Slot should NOT show campaign indicator
4. Complete booking
5. ✅ Campaign fields should be NULL in database

#### Test 2: Multiple Campaigns on Same Slot
1. Create two campaigns:
   - Campaign A: 09:00-12:00, 20% off
   - Campaign B: 10:00-14:00, 15% off
2. Select slot at 11:00 (overlaps both)
3. ✅ Slot should show campaign indicator
4. ✅ First/best campaign should be applied (20%)
5. Complete booking
6. ✅ Should store the applied campaign data

#### Test 3: Expired Campaign
1. Create campaign with end_datetime in the past
2. Visit booking page
3. ✅ Time slots should NOT show campaign indicators
4. ✅ No campaign data in booking

#### Test 4: Inactive Campaign
1. Set campaign `is_active` to `false`
2. Visit booking page
3. ✅ Time slots should NOT show campaign indicators

#### Test 5: Campaign Without Service Match
1. Create campaign for Service A
2. Select Service B on booking page
3. ✅ No time slots should show campaign indicators

### 6. Test Different Campaign Types

#### Price Reduction (💰 Green)
- Create campaign with `campaign_type: "price_reduction"`
- ✅ Slots show green border with 💰 badge

#### Rewards Increase (⭐ Yellow)
- Create campaign with `campaign_type: "rewards_increase"`
- ✅ Slots show yellow border with ⭐ badge

#### Free Service (🎁 Blue)
- Create campaign with `campaign_type: "free_service"`
- ✅ Slots show blue border with 🎁 badge

## API Testing

### Test Availability Endpoint
```bash
curl "http://localhost:5001/api/v1/places/11/availability?date=2025-10-27&service_id=1"
```

**Expected response includes:**
```json
{
  "time_slots": ["09:00", "09:30", ...],
  "available_slots": ["09:00", "10:00", ...],
  "slots_with_campaigns": {
    "09:00": [
      {
        "campaign_id": 1,
        "name": "Weekend Special",
        "banner_message": "Get 20% off all weekend bookings!",
        "campaign_type": "price_reduction",
        "discount_type": "percentage",
        "discount_value": 20
      }
    ]
  }
}
```

### Test Campaign for Timeslot Endpoint
```bash
curl "http://localhost:5001/api/v1/campaigns/active/timeslot?place_id=11&service_id=1&booking_date=2025-10-27&booking_time=10:00"
```

**Expected response:**
```json
[
  {
    "id": 1,
    "name": "Weekend Special",
    "banner_message": "Get 20% off all weekend bookings!",
    "campaign_type": "price_reduction",
    "discount_type": "percentage",
    "discount_value": 20,
    ...
  }
]
```

### Test Booking Creation with Campaign
```bash
curl -X POST http://localhost:5001/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": 11,
    "service_id": 1,
    "employee_id": 1,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "123456789",
    "booking_date": "2025-10-27",
    "booking_time": "10:00",
    "campaign_id": 1,
    "campaign_name": "Weekend Special",
    "campaign_type": "price_reduction",
    "campaign_discount_type": "percentage",
    "campaign_discount_value": 20,
    "campaign_banner_message": "Get 20% off all weekend bookings!"
  }'
```

## Troubleshooting

### Issue: No campaign indicators showing

**Check:**
1. Campaign is active (`is_active = true`)
2. Current datetime is within campaign period
3. Campaign applies to selected service
4. Campaign applies to current place
5. Service ID is provided in availability request

**Debug:**
```bash
# Check active campaigns for place
curl "http://localhost:5001/api/v1/campaigns/active/place/11"

# Check campaign in database
psql linkuup_db -c "SELECT * FROM campaigns WHERE id = 1;"
```

### Issue: Campaign data not saved with booking

**Check:**
1. Campaign fields are included in booking request
2. Backend schemas have campaign fields
3. Database columns exist
4. No validation errors in backend logs

**Debug:**
```bash
# Check backend logs
tail -f backend.log

# Check booking in database
psql linkuup_db -c "SELECT campaign_id, campaign_name FROM bookings WHERE id = LAST_BOOKING_ID;"
```

### Issue: Owner dashboard not showing campaign info

**Check:**
1. Booking has campaign data in database
2. API response includes campaign fields
3. Frontend types match backend response
4. Browser console for errors

**Debug:**
```javascript
// In browser console
console.log(bookings.filter(b => b.campaign_id));
```

## Success Criteria

✅ **All tests pass if:**
1. Campaign indicators appear on time slots
2. Tooltips show campaign details
3. Bookings store complete campaign data
4. Owner dashboard displays campaign information
5. Edge cases handled correctly (expired, inactive, wrong service)
6. No console errors in browser
7. No errors in backend logs

## Performance Notes

- Campaign checks add ~50-100ms to availability endpoint
- Negligible impact on booking creation
- Database queries are optimized with indexes
- Frontend rendering is efficient with conditional logic

---

**Last Updated:** October 27, 2025  
**Status:** Ready for Testing ✅

