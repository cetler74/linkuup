# BioSearch2 Server Status

## ✅ Servers Running Successfully!

### Database Setup
- **Database**: PostgreSQL `biosearch_db`
- **Connection**: `postgresql://carloslarramba@localhost:5432/biosearch_db`
- **Tables Created**: ✓
  - salons
  - salon_images
  - services
  - salon_services  
  - time_slots
  - bookings
  - users
  - salon_managers
  - reviews
- **Data Imported**: ✓
  - 1,166 salons
  - 7 services
  - Time slots configured
  - Admin user created

### Backend Server
- **Status**: ✅ Running
- **Port**: 5001
- **URL**: http://localhost:5001
- **API Base**: http://localhost:5001/api
- **Mobile API**: http://localhost:5001/api/v1

**Key Endpoints:**
- `GET /api/salons` - List salons (with pagination)
- `GET /api/salons/:id` - Get salon details
- `POST /api/auth/login` - User login
- `GET /api/v1/salons/minimal` - Mobile optimized salon list
- `GET /api/v1/sync/changed` - Offline sync endpoint

### Frontend Server
- **Status**: ✅ Running
- **Port**: 5174 (Vite dev server)
- **URL**: http://localhost:5174
- **API Connection**: http://localhost:5001

### Admin Credentials
```
Email: admin@biosearch.pt
Password: admin123
```
⚠️ **Important**: Change this password after first login!

### Database Migration Complete
All required columns added successfully:
- ✅ `salons.updated_at`
- ✅ `services.updated_at`
- ✅ `bookings.updated_at`
- ✅ `bookings.sync_version`
- ✅ `users.updated_at`
- ✅ `users.refresh_token`
- ✅ `users.token_expires_at`
- ✅ `users.refresh_token_expires_at`
- ✅ `users.last_login_at`
- ✅ GDPR compliance columns

### How to Access

1. **Frontend (Web App)**
   - Open browser to: http://localhost:5174
   - Login with admin credentials above

2. **Backend API**
   - Test with: `curl http://localhost:5001/api/salons?page=1&per_page=5`
   
3. **Mobile API**
   - Configure your Android app to use: `http://YOUR_IP:5001/api/v1`
   - For local network testing, replace `YOUR_IP` with your machine's local IP

### Next Steps for Mobile App

1. **Update Android App Configuration**
   - Set base URL to: `http://YOUR_LOCAL_IP:5001/api/v1`
   - Or deploy to production server for production use

2. **Test Mobile Endpoints**
   ```bash
   # Test salon list
   curl http://localhost:5001/api/v1/salons/minimal?page=1&per_page=10
   
   # Test sync endpoint
   curl http://localhost:5001/api/v1/sync/changed
   ```

3. **Production Deployment**
   - Follow instructions in `DEPLOYMENT_QUICK_START.md`
   - Update mobile app to use production URL

### Logs
- Backend log: `/tmp/biosearch_backend.log`
- Frontend: Console output (terminal where you started the server)

### Troubleshooting

**If the salon data doesn't load in mobile app:**
1. Check that the mobile app is pointing to the correct URL
2. Verify network connectivity between device and server
3. Check that the backend server is running on port 5001
4. Review logs for errors

**To restart servers:**
```bash
# Stop backend
pkill -f "python.*app.py"

# Start backend
cd backend && source ../venv/bin/activate && python app.py

# Frontend should still be running on port 5174
```

### Environment Files

**Root `.env`:**
```
DATABASE_URL=postgresql://carloslarramba@localhost:5432/biosearch_db
FLASK_ENV=development
SECRET_KEY=biosearch2-dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:5174,http://localhost:3000,http://localhost:5173
MAX_CONTENT_LENGTH=20971520
MOBILE_API_ENABLED=true
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:5001
```

---

**Status**: All systems operational! ✅
**Last Updated**: $(date)


