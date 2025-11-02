# Fix Deployment Issues

The deployment encountered several issues. Here's how to fix them:

## Issues Found:

1. **Sudo password prompts** - Need passwordless sudo
2. **GitHub SSH access** - Server doesn't have GitHub SSH key configured
3. **Dependencies not installed** - Due to sudo failures

## Quick Fix: Manual Steps on Server

SSH into your server and run these commands:

```bash
ssh linkuup@64.226.117.67
```

### Step 1: Configure Passwordless Sudo

```bash
# You'll need to enter your password once
echo "linkuup ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/linkuup
sudo chmod 440 /etc/sudoers.d/linkuup
```

### Step 2: Install System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3 python3-venv python3-dev python3-pip \
  postgresql postgresql-contrib nginx git build-essential libpq-dev pkg-config libffi-dev
sudo npm install -g pm2
```

### Step 3: Set Up PostgreSQL

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

### Step 4: Clone Repository (Use HTTPS instead of SSH)

```bash
cd ~
git clone https://github.com/cetler74/linkuup.git Linkuup
cd Linkuup
```

### Step 5: Set Up Python Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
```

### Step 6: Set Up Frontend

```bash
cd frontend
cat > .env.production << 'EOF'
VITE_API_BASE_URL=http://64.226.117.67/api/v1
VITE_GOOGLE_MAPS_API_KEY=
VITE_REVENUECAT_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
EOF

npm install
npm run build
cd ..
```

### Step 7: Configure Backend Environment

```bash
cd backend
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql+asyncpg://linkuup_user:linkuup_secure_password_2024_change_this@localhost:5432/linkuup_db

# FastAPI Configuration
SECRET_KEY=CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS Configuration
BACKEND_CORS_ORIGINS=["http://64.226.117.67","http://localhost:5173"]

# Rate Limiting
RATE_LIMIT_AUTH_LOGIN=5/minute
RATE_LIMIT_AUTH_REGISTER=3/hour
RATE_LIMIT_MOBILE_READ=500/hour
RATE_LIMIT_WRITE=100/hour
RATE_LIMIT_STANDARD=300/hour

# Email Configuration
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@linkuup.com
BREVO_SENDER_NAME=LinkUup

# Stripe Configuration
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC=
STRIPE_PRICE_PRO=

# Server Configuration
HOST=0.0.0.0
PORT=5001
EOF

# Generate secure secret key
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
sed -i "s/CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING/$SECRET_KEY/" .env
echo "Environment configured. Secret key generated."

# Run migrations
source ../venv/bin/activate
alembic upgrade head
cd ..
```

### Step 8: Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/linkuup > /dev/null << 'EOF'
server {
    listen 80;
    server_name 64.226.117.67;
    
    client_max_body_size 20M;
    
    location / {
        root /home/linkuup/Linkuup/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
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
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /uploads/ {
        alias /home/linkuup/Linkuup/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /home/linkuup/Linkuup/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

sudo ln -sf /etc/nginx/sites-available/linkuup /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 9: Set Up PM2

```bash
cd ~/Linkuup
# Update paths in ecosystem.config.js
sed -i 's|/home/linkuup/Linkuup|/home/linkuup/Linkuup|g' ecosystem.config.js
cp ecosystem.config.js ~/ecosystem.config.js

pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup systemd -u linkuup --hp /home/linkuup
```

### Step 10: Configure Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### Step 11: Create Directories

```bash
sudo mkdir -p /var/log/linkuup
sudo chown linkuup:linkuup /var/log/linkuup
mkdir -p ~/Linkuup/backend/uploads
mkdir -p ~/Linkuup/backend/image_cache
```

## Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs linkuup-backend

# Test API
curl http://127.0.0.1:5001/api/v1/health

# Test from browser
# Visit: http://64.226.117.67
```

## Next Steps

1. Update `.env` file with actual values (BREVO_API_KEY, Stripe keys, etc.)
2. Restart application: `pm2 restart linkuup-backend`
3. Set up SSL with Let's Encrypt (if you have a domain)
4. Test all features

## Alternative: Use Automated Fix Script

You can also run the automated fix script:

```bash
./scripts/fix_deployment_issues.sh
```

This will handle steps 1-3 automatically, then you can continue with the deployment.

