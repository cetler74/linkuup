# Next Steps - Complete Deployment

You've completed the Python setup. Here are the remaining steps to finish deployment:

## Step 1: Configure Backend Environment

```bash
cd ~/Linkuup/backend

# Create environment file
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://linkuup_user:linkuup_secure_password_2024_change_this@localhost:5432/linkuup_db
SECRET_KEY=CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING
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

# Generate secure secret key
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
sed -i "s/CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING/$SECRET_KEY/" .env
echo "Secret key generated and set"
```

## Step 2: Set Up PostgreSQL (if not done)

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

## Step 3: Run Database Migrations

```bash
cd ~/Linkuup/backend
source ../venv/bin/activate
alembic upgrade head
```

## Step 4: Build Frontend

```bash
cd ~/Linkuup/frontend

# Create production environment file
cat > .env.production << 'EOF'
VITE_API_BASE_URL=http://64.226.117.67/api/v1
VITE_GOOGLE_MAPS_API_KEY=
VITE_REVENUECAT_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
EOF

npm install
npm run build
```

## Step 5: Install Node.js and PM2 (if not done)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

## Step 6: Install Other Dependencies (if not done)

```bash
sudo apt install -y postgresql postgresql-contrib nginx git build-essential libpq-dev pkg-config libffi-dev
```

## Step 7: Configure Nginx

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

## Step 8: Create Required Directories

```bash
sudo mkdir -p /var/log/linkuup
sudo chown linkuup:linkuup /var/log/linkuup
mkdir -p ~/Linkuup/backend/uploads
mkdir -p ~/Linkuup/backend/image_cache
```

## Step 9: Set Up PM2

```bash
cd ~/Linkuup
cp ecosystem.config.js ~/ecosystem.config.js
pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup systemd -u linkuup --hp /home/linkuup
```

## Step 10: Configure Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Step 11: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs linkuup-backend

# Test API
curl http://127.0.0.1:5001/api/v1/health

# Should return: {"status":"healthy","version":"1.0.0"}
```

## Step 12: Visit Your Application

- Frontend: http://64.226.117.67
- API Docs: http://64.226.117.67/api/v1/docs
- Health Check: http://64.226.117.67/api/v1/health

## Final Steps

1. **Update environment variables** with actual values:
   ```bash
   nano ~/Linkuup/backend/.env
   # Add BREVO_API_KEY, Stripe keys, etc.
   pm2 restart linkuup-backend
   ```

2. **Test all features** of the application

3. **Set up SSL** with Let's Encrypt (if you have a domain):
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

