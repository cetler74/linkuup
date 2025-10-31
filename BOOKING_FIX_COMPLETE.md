# Customer Booking Fix - Complete

## Date: October 23, 2025

## Issue Summary
Customer booking was not working due to:
1. **Missing public booking endpoint** - The frontend was calling `/api/v1/bookings` but no such public endpoint existed
2. **CORS errors** - Reviews endpoint was failing with database schema mismatch
3. **Database schema mismatches** - Review model was using `place_id` but database table used `salon_id`

## Errors Encountered
```
Access to XMLHttpRequest at 'http://localhost:5001/api/v1/places/5/reviews?page=1&per_page=5' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

ERROR: column "place_id" does not exist in reviews table
```

## Root Causes
1. **No public booking endpoint**: Only authenticated endpoints existed:
   - `/api/v1/owner/bookings/places/{place_id}/bookings` (requires owner auth)
   - `/api/v1/mobile/bookings` (requires user auth)
   - `/api/v1/customer/bookings` (requires customer auth)
   
2. **Review model mismatch**: The `Review` model in `backend/models/place_existing.py` was using `place_id` but the actual database table uses `salon_id`

3. **Missing required fields**: Review model was missing `customer_name`, `customer_email`, `title`, and `is_verified` fields

## Solution Implemented

### 1. Created Public Booking Endpoint
**File**: `backend/api/v1/bookings.py` (NEW)
- Created a new public booking router with no authentication required
- Endpoint: `POST /api/v1/bookings/`
- Also added `GET /api/v1/bookings/{booking_id}` for retrieving booking details
- Validates that the place exists and has booking enabled
- Validates that the service exists
- Parses date/time strings to datetime objects
- Creates booking with `pending` status

### 2. Added Booking Endpoint to Places Router
**File**: `backend/api/v1/places.py`
- Added RESTful endpoint: `POST /api/v1/places/{place_id}/bookings`
- Added `BookingCreate` and `BookingResponse` Pydantic schemas
- Handles date/time parsing (YYYY-MM-DD and HH:MM formats)

### 3. Registered New Router
**File**: `backend/main.py`
- Added import: `from api.v1 import auth, bookings`
- Registered router: `app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["Public - Bookings"])`

### 4. Fixed Review Model Schema
**File**: `backend/models/place_existing.py`
- Changed `place_id` to `salon_id` to match database table
- Added missing fields:
  - `customer_name` (String, required)
  - `customer_email` (String, required)
  - `title` (String, optional)
  - `is_verified` (Boolean, default False)

### 5. Updated Places API Review Handlers
**File**: `backend/api/v1/places.py`
- Updated review queries to use `salon_id` instead of `place_id`
- Updated review creation to include all required fields

### 6. Updated Frontend API Calls
**File**: `frontend/src/utils/api.ts`
- Changed `api.post('/bookings', ...)` to `api.post('/bookings/', ...)`
- Added trailing slash to prevent 307 redirects
- Applied to both `bookingAPI.createBooking` and `managerAPI.createBooking`

## Files Modified

### Backend
1. `backend/api/v1/bookings.py` - **NEW FILE**
2. `backend/api/v1/places.py` - Modified (added booking endpoints, fixed review handlers)
3. `backend/main.py` - Modified (registered new router)
4. `backend/models/place_existing.py` - Modified (fixed Review model schema)

### Frontend
1. `frontend/src/utils/api.ts` - Modified (updated booking API calls with trailing slash)

## Backups Created
- `backend/api/v1/places.py.bak`
- `backend/main.py.bak`
- `backend/models/place_existing.py.bak`
- `frontend/src/utils/api.ts.bak`

## Testing Results

### 1. Health Check
```bash
curl http://localhost:5001/api/v1/health
# Response: {"status":"healthy","version":"1.0.0"}
```

### 2. CORS Preflight (OPTIONS)
```bash
curl -X OPTIONS http://localhost:5001/api/v1/bookings/ \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
# Response: 200 OK with proper CORS headers
```

### 3. Create Booking
```bash
curl -X POST http://localhost:5001/api/v1/bookings/ \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{
    "salon_id": 5,
    "service_id": 8,
    "customer_name": "Test Customer",
    "customer_email": "test@example.com",
    "customer_phone": "123456789",
    "booking_date": "2025-10-27",
    "booking_time": "16:00"
  }'
# Response: 201 Created with booking details
```

### 4. Get Reviews
```bash
curl http://localhost:5001/api/v1/places/5/reviews?page=1&per_page=5 \
  -H "Origin: http://localhost:5173"
# Response: 200 OK with reviews array (empty if no reviews exist)
```

### 5. Database Verification
```sql
SELECT id, salon_id, service_id, customer_name, customer_email, 
       booking_date, booking_time, status 
FROM bookings ORDER BY id DESC LIMIT 1;

-- Result: Booking successfully created with status 'pending'
```

## CORS Configuration
The following origins are allowed in `backend/main.py`:
```python
allow_origins=[
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative React dev
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
]
```

## API Endpoints Available

### Public Endpoints (No Auth Required)
- `GET /api/v1/places` - Get all places
- `GET /api/v1/places/{id}` - Get place details
- `GET /api/v1/places/{id}/services` - Get place services
- `GET /api/v1/places/{id}/reviews` - Get place reviews
- `POST /api/v1/places/{id}/reviews` - Create review
- `POST /api/v1/places/{id}/bookings` - Create booking (NEW)
- `POST /api/v1/bookings/` - Create booking (backwards compatible, NEW)
- `GET /api/v1/bookings/{id}` - Get booking details (NEW)
- `GET /api/v1/places/{place_id}/availability` - Get availability

### Authenticated Endpoints
- `/api/v1/owner/bookings/*` - Owner booking management
- `/api/v1/mobile/bookings/*` - Mobile app bookings
- `/api/v1/customer/bookings/*` - Customer booking history

## Database Schema

### bookings table
```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES places(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    booking_date TIMESTAMP NOT NULL,
    booking_time TIMESTAMP NOT NULL,
    duration INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_version INTEGER DEFAULT 1
);
```

### reviews table
```sql
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    salon_id INTEGER NOT NULL REFERENCES places(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL,
    title VARCHAR(200),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);
```

## Status
✅ **FIXED AND TESTED**

- Backend server running on port 5001
- Frontend dev server running on port 5173
- CORS properly configured
- Public booking endpoint working
- Reviews endpoint working
- Database bookings confirmed created
- All endpoints return proper CORS headers

## Next Steps
1. Test booking creation from the frontend UI
2. Add booking validation (check for time slot conflicts)
3. Add email notifications for booking confirmations
4. Implement booking cancellation for customers
5. Add booking status updates (confirmed, cancelled, completed)

## Notes
- Server automatically reloads on code changes (--reload flag)
- All bookings start with 'pending' status
- Date format: YYYY-MM-DD
- Time format: HH:MM
- Trailing slash required for `/api/v1/bookings/` endpoint

