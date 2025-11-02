# LinkUup Digital Ocean Deployment - Quick Start

## 🚀 Deploy in 5 Minutes

### Prerequisites Check
- [x] DigitalOcean droplet at `64.226.117.67` is running
- [x] SSH access configured (with SSH key)
- [x] Code pushed to GitHub: `git@github.com:cetler74/linkuup.git`

### Step 1: Initial Server Access

If this is a fresh droplet, you may need to connect as root first:

```bash
# Connect as root
ssh root@64.226.117.67

# Create linkuup user
adduser linkuup
usermod -aG sudo linkuup

# Copy your SSH key
mkdir -p /home/linkuup/.ssh
cp ~/.ssh/authorized_keys /home/linkuup/.ssh/
chown -R linkuup:linkuup /home/linkuup/.ssh
chmod 700 /home/linkuup/.ssh
chmod 600 /home/linkuup/.ssh/authorized_keys

# Exit and test as linkuup user
exit
ssh linkuup@64.226.117.67  # Should work now
```

### Step 2: Run Deployment Script

From your local machine:

```bash
cd /Volumes/OWC\ Volume/Projects2025/Linkuup

# Make script executable (if not already)
chmod +x scripts/deploy_to_digital_ocean.sh

# Run deployment
./scripts/deploy_to_digital_ocean.sh
```

The script will automatically:
- ✅ Install all dependencies (Node.js, Python, PostgreSQL, Nginx, PM2)
- ✅ Set up PostgreSQL database (`linkuup_db`)
- ✅ Clone code from GitHub
- ✅ Install Python and Node.js dependencies
- ✅ Build frontend
- ✅ Run database migrations
- ✅ Configure Nginx as reverse proxy
- ✅ Start application with PM2
- ✅ Configure firewall

### Step 3: Configure Environment Variables

After deployment, SSH to your server and update the environment file:

```bash
ssh linkuup@64.226.117.67
cd ~/Linkuup/backend
nano .env
```

**Important values to update:**

```env
# Generate secure secret key: openssl rand -hex 32
SECRET_KEY=your_very_secure_random_string_here

# Database password (change from default)
DATABASE_URL=postgresql+asyncpg://linkuup_user:your_secure_password@localhost:5432/linkuup_db

# Brevo API key for email
BREVO_API_KEY=xkeysib-your-key-here

# Stripe keys (if using payments)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

### Step 4: Restart Application

```bash
pm2 restart linkuup-backend
pm2 logs linkuup-backend  # Check logs
```

### Step 5: Verify It Works

1. **Check status:**
   ```bash
   pm2 status
   ```

2. **Test API:**
   ```bash
   curl http://64.226.117.67/api/v1/health
   ```
   Should return: `{"status":"healthy","version":"1.0.0"}`

3. **Visit in browser:**
   - Frontend: http://64.226.117.67
   - API Docs: http://64.226.117.67/api/v1/docs

## 🔒 SSL/HTTPS Setup (Recommended)

Once you have a domain pointing to `64.226.117.67`:

```bash
ssh linkuup@64.226.117.67
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically configure HTTPS.

## 📝 Next Steps

1. ✅ Update environment variables in `backend/.env`
2. ✅ Update frontend `.env.production` if you have a domain
3. ✅ Set up SSL certificate (if you have a domain)
4. ✅ Test all application features
5. ✅ Set up monitoring/backups

## 🆘 Troubleshooting

### Application not starting?
```bash
pm2 logs linkuup-backend --lines 50
pm2 restart linkuup-backend
```

### Database connection issues?
```bash
sudo -u postgres psql -d linkuup_db -U linkuup_user
```

### Frontend not loading?
```bash
ls -la ~/Linkuup/frontend/dist  # Check if build exists
sudo nginx -t  # Test Nginx config
```

### 502 Bad Gateway?
```bash
pm2 status  # Check if backend is running
curl http://127.0.0.1:5001/api/v1/health  # Test backend directly
```

## 📚 Full Documentation

See `DIGITAL_OCEAN_DEPLOYMENT.md` for detailed documentation.

---

**Your LinkUup app should now be live at http://64.226.117.67** 🎉