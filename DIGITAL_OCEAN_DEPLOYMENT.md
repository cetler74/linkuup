# LinkUup Digital Ocean Deployment Guide

This guide walks you through deploying LinkUup to your DigitalOcean droplet at IP `64.226.117.67`.

## Prerequisites

- DigitalOcean droplet running Ubuntu 22.04 LTS (or newer)
- SSH access to your droplet (with SSH key configured)
- GitHub repository access (code already pushed)
- Domain name (optional, but recommended for SSL)

## Quick Start

### Step 1: Initial Server Setup

If this is a fresh droplet, you may need to connect as `root` first to create a user:

```bash
# SSH to droplet as root
ssh root@64.226.117.67

# Create linkuup user
adduser linkuup
usermod -aG sudo linkuup

# Set up SSH key for linkuup user (if you haven't already)
mkdir -p /home/linkuup/.ssh
cp ~/.ssh/authorized_keys /home/linkuup/.ssh/
chown -R linkuup:linkuup /home/linkuup/.ssh
chmod 700 /home/linkuup/.ssh
chmod 600 /home/linkuup/.ssh/authorized_keys

# Exit and test connection as linkuup user
exit
ssh linkuup@64.226.117.67
```

### Step 2: Run Deployment Script

From your local machine:

```bash
# Navigate to project directory
cd /path/to/Linkuup

# Make script executable
chmod +x scripts/deploy_to_digital_ocean.sh

# Run deployment script
./scripts/deploy_to_digital_ocean.sh
```

Or set custom variables:

```bash
DROPLET_IP=64.226.117.67 \
DROPLET_USER=linkuup \
REPO_URL=git@github.com:cetler74/linkuup.git \
./scripts/deploy_to_digital_ocean.sh
```

The script will:
1. Install system dependencies (Node.js, Python, PostgreSQL, Nginx, PM2)
2. Configure PostgreSQL database (`linkuup_db`)
3. Clone your code from GitHub
4. Set up Python virtual environment
5. Install Python and Node.js dependencies
6. Build the frontend
7. Run database migrations
8. Configure Nginx as reverse proxy
9. Set up PM2 for process management
10. Configure firewall

### Step 3: Configure Environment Variables

SSH to your server and update the environment file:

```bash
ssh linkuup@64.226.117.67
cd ~/Linkuup/backend
nano .env
```

Update these critical values:

```env
# Generate a secure secret key (use: openssl rand -hex 32)
SECRET_KEY=your_very_secure_random_secret_key_here

# Update database password if you changed it
DATABASE_URL=postgresql+asyncpg://linkuup_user:your_password@localhost:5432/linkuup_db

# Add your Brevo API key for email
BREVO_API_KEY=your_brevo_api_key_here

# Add Stripe keys if using payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Update CORS origins if you have a domain
BACKEND_CORS_ORIGINS=["https://yourdomain.com","http://64.226.117.67"]
```

### Step 4: Restart Application

After updating environment variables:

```bash
pm2 restart linkuup-backend
pm2 logs linkuup-backend  # Check logs
```

### Step 5: Verify Deployment

1. **Check application status:**
   ```bash
   pm2 status
   ```

2. **Test API health endpoint:**
   ```bash
   curl http://64.226.117.67/api/v1/health
   ```

3. **Visit in browser:**
   - Frontend: http://64.226.117.67
   - API Docs: http://64.226.117.67/api/v1/docs

## SSL/HTTPS Setup (Recommended)

### Install Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate

If you have a domain:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically configure Nginx for HTTPS.

### Auto-renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

## Manual Deployment Steps (If Script Fails)

If you prefer to deploy manually or the script encounters issues:

### 1. Install System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3.11 python3.11-venv python3.11-dev \
  postgresql postgresql-contrib nginx git build-essential libpq-dev pkg-config
sudo npm install -g pm2
```

### 2. Set Up Database

```bash
sudo -u postgres psql
```

In PostgreSQL prompt:

```sql
CREATE DATABASE linkuup_db;
CREATE USER linkuup_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE linkuup_db TO linkuup_user;
ALTER USER linkuup_user CREATEDB;
ALTER DATABASE linkuup_db OWNER TO linkuup_user;
\q
```

### 3. Clone and Set Up Code

```bash
cd ~
git clone git@github.com:cetler74/linkuup.git Linkuup
cd Linkuup
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
```

### 4. Configure Environment

```bash
cd backend
cp ../env.example .env
nano .env  # Edit with your values
```

### 5. Run Database Migrations

```bash
cd ~/Linkuup/backend
source ../venv/bin/activate
alembic upgrade head
```

### 6. Build Frontend

```bash
cd ~/Linkuup/frontend
npm install
npm run build
```

### 7. Configure Nginx

Create `/etc/nginx/sites-available/linkuup`:

```nginx
server {
    listen 80;
    server_name 64.226.117.67;
    
    client_max_body_size 20M;
    
    location / {
        root /home/linkuup/Linkuup/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /uploads/ {
        alias /home/linkuup/Linkuup/backend/uploads/;
        expires 30d;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/linkuup /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Start Application with PM2

```bash
cd ~/Linkuup
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u linkuup --hp /home/linkuup
```

## Updating the Application

When you push new code to GitHub:

```bash
ssh linkuup@64.226.117.67
cd ~/Linkuup
git pull origin main

# Update backend
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
alembic upgrade head
cd ..

# Update frontend
cd frontend
npm install
npm run build
cd ..

# Restart application
pm2 restart linkuup-backend
sudo systemctl reload nginx
```

## Monitoring and Logs

### Check Application Status

```bash
pm2 status
pm2 logs linkuup-backend
pm2 monit
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check System Resources

```bash
htop
df -h  # Disk usage
free -h  # Memory usage
```

### Database Status

```bash
sudo systemctl status postgresql
sudo -u postgres psql -d linkuup_db -c "SELECT version();"
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs linkuup-backend --lines 100

# Check if port is in use
sudo netstat -tlnp | grep 5001

# Restart application
pm2 restart linkuup-backend
```

### Database Connection Issues

```bash
# Test database connection
sudo -u postgres psql -d linkuup_db -U linkuup_user

# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep linkuup_db
```

### Frontend Not Loading

```bash
# Check Nginx configuration
sudo nginx -t

# Check if build exists
ls -la ~/Linkuup/frontend/dist

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs linkuup-backend

# Verify backend is listening on port 5001
curl http://127.0.0.1:5001/api/v1/health
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R linkuup:linkuup ~/Linkuup

# Fix permissions
chmod -R 755 ~/Linkuup
chmod -R 755 ~/Linkuup/backend/uploads
```

## Security Checklist

- [ ] Changed default database password
- [ ] Generated secure SECRET_KEY
- [ ] Configured firewall (UFW)
- [ ] Set up SSL/HTTPS
- [ ] Updated all environment variables
- [ ] Restricted SSH access (key-only, disable password)
- [ ] Regular system updates: `sudo apt update && sudo apt upgrade`
- [ ] Set up automated backups

## Firewall Configuration

```bash
sudo ufw status
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Backup and Restore

### Database Backup

```bash
# Create backup
pg_dump -U linkuup_user linkuup_db > backup_$(date +%Y%m%d).sql

# Compress
gzip backup_*.sql

# Download to local machine
scp linkuup@64.226.117.67:~/backup_*.sql.gz ./
```

### Database Restore

```bash
# Upload backup
scp backup_*.sql.gz linkuup@64.226.117.67:~/

# Restore
gunzip < backup_*.sql.gz | psql -U linkuup_user linkuup_db
```

## Scaling Considerations

For production with higher traffic:

1. **Increase PM2 workers:**
   ```bash
   # Edit ecosystem.config.js
   args: 'main:app --host 0.0.0.0 --port 5001 --workers 4'
   pm2 restart linkuup-backend
   ```

2. **Add Redis for caching** (if needed)

3. **Set up database connection pooling**

4. **Use CDN for static assets**

5. **Consider load balancer** for multiple droplets

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check logs for errors
   - Monitor disk space
   - Review application performance

2. **Monthly:**
   - Update system packages
   - Review security logs
   - Test backups

3. **As needed:**
   - Deploy code updates
   - Database migrations
   - SSL certificate renewal (automatic)

## Useful Commands

```bash
# Restart services
sudo systemctl restart nginx
sudo systemctl restart postgresql
pm2 restart linkuup-backend

# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# View logs
pm2 logs linkuup-backend
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
```

## Next Steps

1. Configure your domain DNS to point to `64.226.117.67`
2. Set up SSL certificate
3. Configure email service (Brevo)
4. Set up monitoring/alerting
5. Configure automated backups
6. Test all application features

---

**Your LinkUup application should now be running at http://64.226.117.67** 🚀

For issues or questions, check the logs first, then refer to this guide.
