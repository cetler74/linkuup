# BioSearch2 - Hostinger Deployment Guide

This guide explains how to deploy BioSearch2 to your Hostinger server (147.93.89.178).

## Prerequisites

1. **SSH Access**: Ensure you have SSH access to your Hostinger server
2. **Domain (Optional)**: If you have a domain, point it to 147.93.89.178
3. **Database**: PostgreSQL or MySQL database (Hostinger provides these)
4. **API Keys**: Google Maps API key for geocoding features

## Initial Setup

### 1. Configure SSH Access

First, set up SSH key authentication to your Hostinger server:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy your SSH key to the server
ssh-copy-id root@147.93.89.178
# Or use your Hostinger username instead of root

# Test connection
ssh root@147.93.89.178
```

### 2. Update Configuration Files

#### Frontend Configuration

The frontend is already configured for production in `.env.production`:
- API endpoint: `http://147.93.89.178/api`

If you have a custom domain, update this file:

```bash
# Edit frontend/.env.production
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
```

#### Backend Configuration

1. On your Hostinger server, create the production environment file:

```bash
ssh root@147.93.89.178
cd /var/www/biosearch2/backend
nano .env.production
```

2. Add your configuration (use `backend/.env.production.example` as template):

```env
FLASK_APP=backend/app.py
FLASK_ENV=production
SECRET_KEY=your_very_secure_random_secret_key_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/biosearch_db

# CORS Configuration
CORS_ORIGINS=http://147.93.89.178,https://yourdomain.com

# Application Settings
DEBUG=False
HOST=0.0.0.0
PORT=5001
```

### 3. Deploy Application

#### First Time Deployment

```bash
# Make the deployment script executable
chmod +x scripts/deploy_to_hostinger.sh

# Run the deployment script
./scripts/deploy_to_hostinger.sh
```

The script will:
1. Install system dependencies (Python, Node.js, Nginx, PostgreSQL)
2. Upload your application code
3. Set up Python virtual environment
4. Configure Nginx as reverse proxy
5. Set up systemd service for automatic startup
6. Start the application

#### Update Deployment Script Settings

Before running the deployment script, update these variables in `scripts/deploy_to_hostinger.sh`:

```bash
HOSTINGER_USER="root"  # Update with your Hostinger SSH username
APP_DIR="/var/www/biosearch2"  # Update if you prefer a different directory
```

### 4. Set Up Database

#### PostgreSQL (Recommended)

```bash
ssh root@147.93.89.178

# Create database and user
sudo -u postgres psql
CREATE DATABASE biosearch_db;
CREATE USER biosearch_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE biosearch_db TO biosearch_user;
\q
```

#### Initialize Database Tables

```bash
cd /var/www/biosearch2
source venv/bin/activate
python3 -c "from backend.app import app, db; app.app_context().push(); db.create_all(); print('Database tables created')"
```

### 5. Import Initial Data (Optional)

If you have existing data:

```bash
# Copy your SQLite database or CSV files to the server
scp ~/biosearch.db root@147.93.89.178:/var/www/biosearch2/

# Or run import scripts
ssh root@147.93.89.178
cd /var/www/biosearch2
source venv/bin/activate
python3 scripts/import_data.py
```

## Updates and Maintenance

### Quick Updates

For regular updates (code changes):

```bash
# Make the update script executable
chmod +x scripts/update_hostinger.sh

# Run the update script
./scripts/update_hostinger.sh
```

### Manual Update Process

```bash
# SSH to server
ssh root@147.93.89.178
cd /var/www/biosearch2

# Pull latest code
git pull origin main

# Update Python dependencies
source venv/bin/activate
pip install -r backend/requirements.txt

# Rebuild frontend (or rsync from local)
cd frontend
npm install
npm run build
cd ..

# Restart services
sudo systemctl restart biosearch2
sudo systemctl reload nginx
```

## Monitoring and Troubleshooting

### Check Application Status

```bash
# Check backend service status
ssh root@147.93.89.178 'sudo systemctl status biosearch2'

# Check Nginx status
ssh root@147.93.89.178 'sudo systemctl status nginx'

# View backend logs
ssh root@147.93.89.178 'sudo journalctl -u biosearch2 -n 100 -f'

# View Nginx error logs
ssh root@147.93.89.178 'sudo tail -f /var/log/nginx/error.log'

# View Nginx access logs
ssh root@147.93.89.178 'sudo tail -f /var/log/nginx/access.log'
```

### Common Issues

#### Backend Not Starting

```bash
# Check logs for errors
sudo journalctl -u biosearch2 -n 50

# Common fixes:
# 1. Check .env.production file exists and has correct values
# 2. Check database connection
# 3. Check Python dependencies installed
sudo systemctl restart biosearch2
```

#### Database Connection Issues

```bash
# Test database connection
cd /var/www/biosearch2
source venv/bin/activate
python3 -c "from backend.app import db; db.session.execute(db.text('SELECT 1')); print('Database OK')"
```

#### Frontend Not Loading

```bash
# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check file permissions
ls -la /var/www/biosearch2/frontend/dist/
```

### SSL/HTTPS Setup (Recommended)

To enable HTTPS with Let's Encrypt:

```bash
ssh root@147.93.89.178

# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically configure Nginx
```

## Application URLs

After deployment:

- **Frontend**: http://147.93.89.178 (or https://yourdomain.com)
- **Backend API**: http://147.93.89.178/api (or https://yourdomain.com/api)
- **Health Check**: http://147.93.89.178/api/health

## Security Checklist

- [ ] Change default SECRET_KEY in .env.production
- [ ] Use strong database passwords
- [ ] Set up firewall (ufw)
- [ ] Enable SSL/HTTPS
- [ ] Regular security updates: `sudo apt-get update && sudo apt-get upgrade`
- [ ] Set up automated backups for database
- [ ] Never commit .env.production to git

## Backup and Restore

### Database Backup

```bash
# PostgreSQL backup
ssh root@147.93.89.178 'pg_dump -U biosearch_user biosearch_db > backup.sql'

# Download backup
scp root@147.93.89.178:~/backup.sql ./backups/
```

### Database Restore

```bash
# Upload backup
scp ./backups/backup.sql root@147.93.89.178:~/

# Restore
ssh root@147.93.89.178 'psql -U biosearch_user biosearch_db < backup.sql'
```

## Support

For issues or questions:
1. Check application logs
2. Review this documentation
3. Check GitHub repository issues

## Next Steps

1. Set up SSL certificate for HTTPS
2. Configure automated database backups
3. Set up monitoring (e.g., uptime monitoring)
4. Configure email notifications
5. Set up custom domain

