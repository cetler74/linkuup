# BioSearch2 - Quick Start for Hostinger Deployment

## 🚀 Quick Deployment Steps

### 1. Update SSH Username (Important!)

Before deploying, update the SSH username in the deployment scripts:

```bash
# Edit scripts/deploy_to_hostinger.sh
# Change line 9:
HOSTINGER_USER="root"  # Update with YOUR Hostinger SSH username
```

### 2. Set Up SSH Access

```bash
# Test SSH connection first
ssh YOUR_USERNAME@147.93.89.178

# If password is required, set up SSH key:
ssh-copy-id YOUR_USERNAME@147.93.89.178
```

### 3. Configure Google Maps API Key

```bash
# Edit frontend/.env.production
# Replace: your_google_maps_api_key_here
# With: YOUR_ACTUAL_GOOGLE_MAPS_API_KEY
```

### 4. Deploy!

```bash
# Run the deployment script
./scripts/deploy_to_hostinger.sh
```

When asked "Is this your first deployment?", type `y` and press Enter.

The script will:
- ✅ Install all dependencies on your server
- ✅ Upload your application code
- ✅ Set up Python environment
- ✅ Configure Nginx web server
- ✅ Set up auto-start service
- ✅ Start your application

### 5. Configure Production Environment on Server

After deployment, you MUST create the production environment file on the server:

```bash
# SSH to your server
ssh YOUR_USERNAME@147.93.89.178

# Navigate to app directory
cd /var/www/biosearch2/backend

# Create production environment file
nano .env.production
```

Copy this content and update with your actual values:

```env
FLASK_APP=backend/app.py
FLASK_ENV=production
SECRET_KEY=GENERATE_A_VERY_LONG_RANDOM_STRING_HERE

# Database Configuration (get from Hostinger dashboard)
DATABASE_URL=postgresql://username:password@localhost/biosearch_db

# CORS Configuration
CORS_ORIGINS=http://147.93.89.178

# Application Settings
DEBUG=False
HOST=0.0.0.0
PORT=5001
```

Save and exit (Ctrl+X, then Y, then Enter)

### 6. Set Up Database

```bash
# Still on your Hostinger server
cd /var/www/biosearch2
source venv/bin/activate

# Initialize database tables
python3 -c "from backend.app import app, db; app.app_context().push(); db.create_all(); print('Database created!')"
```

### 7. Restart Services

```bash
sudo systemctl restart biosearch2
sudo systemctl reload nginx
```

### 8. Test Your Application

Open in browser: **http://147.93.89.178**

Check health: **http://147.93.89.178/api/health**

## 🔄 For Future Updates

After making code changes, just run:

```bash
./scripts/update_hostinger.sh
```

This will:
- Pull latest code from GitHub
- Build frontend
- Update backend
- Restart services

## 📝 Important Files Created

| File | Purpose |
|------|---------|
| `frontend/.env.production` | Frontend production config (API endpoint) |
| `backend/.env.production.example` | Backend config template |
| `scripts/deploy_to_hostinger.sh` | Full deployment script |
| `scripts/update_hostinger.sh` | Quick update script |
| `HOSTINGER_DEPLOYMENT.md` | Detailed deployment guide |

## 🛠️ Troubleshooting

### Check if services are running:

```bash
ssh YOUR_USERNAME@147.93.89.178 'sudo systemctl status biosearch2'
ssh YOUR_USERNAME@147.93.89.178 'sudo systemctl status nginx'
```

### View logs:

```bash
# Backend logs
ssh YOUR_USERNAME@147.93.89.178 'sudo journalctl -u biosearch2 -n 50'

# Nginx logs
ssh YOUR_USERNAME@147.93.89.178 'sudo tail -f /var/log/nginx/error.log'
```

### Restart everything:

```bash
ssh YOUR_USERNAME@147.93.89.178 'sudo systemctl restart biosearch2 nginx'
```

## 📚 Next Steps

1. ✅ **Set up SSL/HTTPS** - Use Let's Encrypt for free SSL
2. ✅ **Configure Custom Domain** - Point your domain to 147.93.89.178
3. ✅ **Set up Database Backups** - Automate daily backups
4. ✅ **Import Your Data** - Import salons, services, etc.
5. ✅ **Create Admin User** - Use `scripts/create_admin_user.py`

## 🆘 Need Help?

Check the detailed guide: `HOSTINGER_DEPLOYMENT.md`

## 🎯 What's Configured

- **Frontend**: React + Vite served by Nginx
- **Backend**: Flask API on port 5001 (proxied by Nginx)
- **Database**: PostgreSQL (configure via Hostinger)
- **Web Server**: Nginx on port 80
- **Auto-Start**: Systemd service ensures app starts on server reboot
- **API Endpoint**: All `/api/*` requests proxied to backend

---

Your application will be accessible at: **http://147.93.89.178**

