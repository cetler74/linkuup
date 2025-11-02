# Complete Setup Instructions

Your code is already cloned on the server, but dependencies need to be installed. Follow these steps:

## Option 1: Upload and Run Setup Script (Recommended)

### Step 1: Upload the script to your server

```bash
# From your local machine
scp scripts/complete_setup_on_server.sh linkuup@64.226.117.67:~/
```

### Step 2: SSH to your server

```bash
ssh linkuup@64.226.117.67
```

### Step 3: Run the setup script

```bash
# Make it executable (if needed)
chmod +x ~/complete_setup_on_server.sh

# Run the script
~/complete_setup_on_server.sh
```

The script will:
- ✅ Configure passwordless sudo (you'll enter password once)
- ✅ Install all dependencies (Node.js, Python, PostgreSQL, Nginx, PM2)
- ✅ Set up PostgreSQL database
- ✅ Create Python virtual environment
- ✅ Install Python dependencies
- ✅ Run database migrations
- ✅ Build frontend
- ✅ Configure Nginx
- ✅ Set up PM2
- ✅ Configure firewall

## Option 2: Run Commands Manually

If you prefer to run commands manually, SSH to your server and follow these steps:

### 1. Configure passwordless sudo (enter password once)

```bash
ssh linkuup@64.226.117.67
echo "linkuup ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/linkuup
sudo chmod 440 /etc/sudoers.d/linkuup
```

### 2. Install dependencies

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3 python3-venv python3-dev python3-pip \
  postgresql postgresql-contrib nginx git build-essential libpq-dev pkg-config libffi-dev
sudo npm install -g pm2
```

### 3. Set up PostgreSQL

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE linkuup_db;
CREATE USER linkuup_user WITH PASSWORD 'linkuup_secure_password_2024_change_this';
GRANT ALL PRIVILEGES ON DATABASE linkuup_db TO linkuup_user;
ALTER USER linkuup_user CREATEDB;
ALTER DATABASE linkuup_db OWNER TO linkuup_user;
\q
EOF
sudo systemctl restart postgresql
```

### 4. Set up Python environment

```bash
cd ~/Linkuup
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
```

### 5. Configure backend environment

```bash
cd ~/Linkuup/backend
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://linkuup_user:linkuup_secure_password_2024_change_this@localhost:5432/linkuup_db
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
BACKEND_CORS_ORIGINS=["http://64.226.117.67","http://localhost:5173"]
RATE_LIMIT_AUTH_LOGIN=5/minute
RATE_LIMIT_AUTH_REGISTER=3/hour
RATE_LIMIT_MOBILE_READ=500/hour
RATE_LIMIT_WRITE=100/hour
RATE_LIMIT_STANDARD=300/hour
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@linkuup.com
BREVO_SENDER_NAME=LinkUup
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC=
STRIPE_PRICE_PRO=
HOST=0.0.0.0
PORT=5001
EOF

# Generate and set secret key
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
```

### 6. Run database migrations

```bash
source ../venv/bin/activate
alembic upgrade head
```

### 7. Build frontend

```bash
cd ~/Linkuup/frontend
cat > .env.production << 'EOF'
VITE_API_BASE_URL=http://64.226.117.67/api/v1
VITE_GOOGLE_MAPS_API_KEY=
VITE_REVENUECAT_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
EOF

npm install
npm run build
```

### 8. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/linkuup > /dev/null << 'EOF'
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
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/linkuup /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Set up PM2

```bash
cd ~/Linkuup
cp ecosystem.config.js ~/ecosystem.config.js
pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup systemd -u linkuup --hp /home/linkuup
```

### 10. Configure firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## After Setup

1. **Check application status:**
   ```bash
   pm2 status
   pm2 logs linkuup-backend
   ```

2. **Test API:**
   ```bash
   curl http://127.0.0.1:5001/api/v1/health
   ```

3. **Visit in browser:**
   - http://64.226.117.67
   - http://64.226.117.67/api/v1/docs

4. **Update environment variables:**
   ```bash
   nano ~/Linkuup/backend/.env
   # Add BREVO_API_KEY, Stripe keys, etc.
   pm2 restart linkuup-backend
   ```

## Troubleshooting

If something fails:
- Check logs: `pm2 logs linkuup-backend`
- Check Nginx: `sudo nginx -t`
- Check PostgreSQL: `sudo systemctl status postgresql`
- Restart services: `pm2 restart linkuup-backend && sudo systemctl restart nginx`

