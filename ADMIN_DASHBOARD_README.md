# Platform Admin Dashboard Implementation

## Overview

A comprehensive admin dashboard for platform administrators (`admin@linkuup.com`) providing global oversight and management of all owners, places, bookings, campaigns, and admin-specific messaging.

## 🚀 Features Implemented

### Backend API (FastAPI + PostgreSQL)
- **Admin Authentication** - Secure admin-only access with `is_admin=true` or `user_type='platform_admin'`
- **Platform Statistics** - Real-time analytics across all owners, places, and bookings
- **Owners Management** - CRUD operations for all business owners
- **Places Management** - Hierarchical place management across all owners
- **Bookings Overview** - Platform-wide booking analytics and export
- **Campaigns Management** - Marketing campaigns for existing and new owners
- **Admin Messaging** - GDPR-compliant admin-to-owner messaging system

### Frontend Components (React + TypeScript)
- **Enhanced Admin Dashboard** - Multi-tab interface with comprehensive management tools
- **Owner Selector** - Searchable dropdown for owner selection
- **Place Hierarchy** - Expandable owner > places tree view with inline configuration
- **Campaign Form** - Rich campaign creation with targeting and scheduling
- **Message Composer** - Admin-to-owner messaging with recipient selection
- **Bookings Overview** - Filterable bookings table with CSV export
- **Navigation Integration** - Admin button in header (visible only to platform admins)

## 📁 File Structure

### Backend Files
```
backend/
├── api/v1/admin/
│   ├── __init__.py              # Admin router configuration
│   ├── stats.py                 # Platform statistics API
│   ├── owners.py                # Owners management API
│   ├── places.py                # Places management API
│   ├── bookings.py              # Bookings overview API
│   ├── campaigns.py             # Campaigns management API
│   └── messages.py              # Admin messaging API
├── schemas/admin.py             # Admin-specific Pydantic schemas
├── core/dependencies.py         # Admin authentication dependency
└── main.py                     # Updated with admin routes
```

### Frontend Files
```
frontend/src/
├── pages/
│   └── AdminDashboard.tsx       # Enhanced admin dashboard
├── components/admin/
│   ├── OwnerSelector.tsx        # Owner selection component
│   ├── PlaceHierarchy.tsx      # Place hierarchy component
│   ├── CampaignForm.tsx         # Campaign creation form
│   ├── AdminMessageComposer.tsx # Message composition
│   └── BookingsOverview.tsx     # Bookings management
├── components/common/
│   └── Header.tsx               # Updated with admin button
└── utils/api.ts                 # Updated API client
```

### Database Migration
```
scripts/
├── create_admin_tables.sql     # Admin tables migration
└── test_admin_dashboard.py     # Integration test script
```

## 🗄️ Database Schema

### New Admin Tables
- `admin_campaigns` - Platform-wide marketing campaigns
- `admin_campaign_analytics` - Campaign performance metrics
- `admin_messages` - GDPR-compliant admin-to-owner messages
- `admin_message_recipients` - Message delivery tracking
- `admin_message_replies` - Owner replies to admin messages

## 🔧 Setup Instructions

### 1. Database Migration
```bash
# Run the admin tables migration
psql "postgresql://carloslarramba@localhost:5432/lookuup_db" -f scripts/create_admin_tables.sql
```

### 2. Backend Setup
```bash
# Install dependencies (if not already done)
pip install -r requirements.txt

# Start the backend server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5001 --reload
```

### 3. Frontend Setup
```bash
# Install dependencies (if not already done)
npm install

# Start the frontend development server
npm run dev
```

### 4. Admin User Setup
Ensure you have an admin user with:
- `is_admin = true` OR `user_type = 'platform_admin'`
- Email: `admin@linkuup.com` (or update in test script)

## 🧪 Testing

### Integration Tests
```bash
# Run the comprehensive integration test
python scripts/test_admin_dashboard.py
```

### Manual Testing
1. **Access Control**: Verify admin button only appears for platform admins
2. **Dashboard Navigation**: Test all tabs (Stats, Owners, Places, Bookings, Campaigns, Messages)
3. **Owner Management**: Test owner selection, place hierarchy, and configuration
4. **Campaign Creation**: Test campaign form with different targeting options
5. **Message Composition**: Test admin messaging with recipient selection
6. **Bookings Export**: Test CSV export functionality

## 🔐 Security Features

- **Role-Based Access Control**: All admin endpoints protected by `get_current_admin()` dependency
- **Frontend Route Protection**: Admin routes protected by `AdminProtectedRoute` component
- **GDPR Compliance**: Separate admin messaging system from owner-customer messages
- **Authentication**: JWT-based authentication with admin role verification

## 📊 API Endpoints

### Admin Statistics
- `GET /api/v1/admin/stats` - Platform-wide statistics
- `GET /api/v1/admin/stats/trends` - Growth trends and analytics

### Owners Management
- `GET /api/v1/admin/owners` - List all owners with pagination
- `GET /api/v1/admin/owners/{id}` - Get owner details
- `PUT /api/v1/admin/owners/{id}/toggle-status` - Toggle owner status
- `GET /api/v1/admin/owners/{id}/places` - Get owner's places

### Places Management
- `GET /api/v1/admin/places` - List all places with filtering
- `GET /api/v1/admin/places/{id}` - Get place details
- `PUT /api/v1/admin/places/{id}/toggle-booking` - Toggle booking status
- `PUT /api/v1/admin/places/{id}/toggle-status` - Toggle place status
- `PUT /api/v1/admin/places/{id}/toggle-bio-diamond` - Toggle BIO Diamond status
- `PUT /api/v1/admin/places/{id}/configuration` - Update place configuration

### Bookings Overview
- `GET /api/v1/admin/bookings` - Platform-wide bookings with filtering
- `GET /api/v1/admin/bookings/stats` - Booking analytics
- `GET /api/v1/admin/bookings/export` - Export bookings as CSV

### Campaigns Management
- `GET /api/v1/admin/campaigns` - List all campaigns
- `POST /api/v1/admin/campaigns` - Create new campaign
- `GET /api/v1/admin/campaigns/{id}` - Get campaign details
- `PUT /api/v1/admin/campaigns/{id}` - Update campaign
- `DELETE /api/v1/admin/campaigns/{id}` - Delete campaign
- `GET /api/v1/admin/campaigns/{id}/analytics` - Campaign analytics

### Admin Messaging
- `GET /api/v1/admin/messages` - List admin messages
- `POST /api/v1/admin/messages` - Send message to owners
- `GET /api/v1/admin/messages/{id}` - Get message thread
- `PUT /api/v1/admin/messages/{id}/read` - Mark message as read
- `GET /api/v1/admin/messages/stats/overview` - Messaging statistics

## 🎨 UI Components

### OwnerSelector
- Searchable dropdown for owner selection
- Shows owner stats (places, bookings)
- Visual status indicators (active/inactive)

### PlaceHierarchy
- Expandable owner > places tree view
- Inline configuration editing
- Status toggle switches (active, booking, BIO Diamond)

### CampaignForm
- Rich campaign creation form
- Target audience selection (existing/new/both owners)
- Channel selection (email, SMS, social media)
- Scheduling and content management

### AdminMessageComposer
- Rich text message composition
- Multi-recipient selection with search
- Urgent message flagging
- Scheduling capabilities

### BookingsOverview
- Filterable bookings table
- Advanced filtering (owner, place, date, status)
- CSV export functionality
- Pagination and search

## 🔄 Data Flow

1. **Admin Login** → JWT token with admin role
2. **Dashboard Load** → Fetch platform statistics
3. **Owner Selection** → Load owner details and places
4. **Place Configuration** → Update place settings
5. **Campaign Creation** → Target owners and schedule
6. **Message Composition** → Send to selected owners
7. **Bookings Analysis** → Filter, analyze, and export

## 🚨 Important Notes

1. **Database**: Uses `lookuup_db` (PostgreSQL) as specified
2. **Terminology**: Consistently uses "places" instead of "salons"
3. **GDPR Compliance**: Admin messages are separate from owner-customer messages
4. **Backup**: Always create backups before modifying files
5. **Access Control**: Admin features only accessible to platform administrators

## 🐛 Troubleshooting

### Common Issues
1. **Authentication Failed**: Check admin user credentials and role
2. **Database Connection**: Verify PostgreSQL is running and accessible
3. **CORS Issues**: Check backend CORS configuration
4. **API Errors**: Check backend logs for detailed error messages

### Debug Steps
1. Check backend server logs: `tail -f backend.log`
2. Check frontend console for JavaScript errors
3. Verify database connection and admin user setup
4. Run integration tests: `python scripts/test_admin_dashboard.py`

## 📈 Future Enhancements

- Real-time notifications for admin actions
- Advanced analytics and reporting
- Bulk operations for owners and places
- Campaign automation and scheduling
- Message templates and automation
- Advanced filtering and search capabilities

## 🤝 Support

For issues or questions regarding the admin dashboard implementation:
1. Check the integration test results
2. Review backend logs for API errors
3. Verify database connectivity and admin user setup
4. Test individual components in isolation

---

**Implementation Status**: ✅ Complete
**Last Updated**: December 2024
**Version**: 1.0.0
