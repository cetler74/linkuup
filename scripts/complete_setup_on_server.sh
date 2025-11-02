#!/bin/bash

# Complete Setup Script - Run this ON THE SERVER
# This script completes the deployment setup after code is cloned

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Starting complete setup on server..."

# Step 1: Configure passwordless sudo (requires password once)
print_status "Configuring passwordless sudo..."
echo "$USER ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/$USER
sudo chmod 440 /etc/sudoers.d/$USER
print_status "Passwordless sudo configured"

# Step 2: Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 3: Install Node.js
print_status "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

# Step 4: Install Python (use system Python version)
print_status "Installing Python..."
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1 || echo "3")
print_status "Detected Python version: $PYTHON_VERSION"

# Try to install specific version, fall back to python3 if not available
if [ "$PYTHON_VERSION" = "3.13" ] || [ "$PYTHON_VERSION" = "3.12" ]; then
    sudo apt install -y python3 python3-venv python3-dev python3-pip
elif [ "$PYTHON_VERSION" = "3.11" ]; then
    sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
else
    sudo apt install -y python3 python3-venv python3-dev python3-pip
fi

# Step 5: Install PostgreSQL
print_status "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Step 6: Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Step 7: Install build dependencies
print_status "Installing build dependencies..."
sudo apt install -y build-essential libpq-dev pkg-config libffi-dev git

# Step 8: Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Step 9: Set up PostgreSQL
print_status "Configuring PostgreSQL..."
sudo -u postgres psql << 'EOF'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'linkuup_db') THEN
        CREATE DATABASE linkuup_db;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'linkuup_user') THEN
        CREATE USER linkuup_user WITH PASSWORD 'linkuup_secure_password_2024_change_this';
        GRANT ALL PRIVILEGES ON DATABASE linkuup_db TO linkuup_user;
        ALTER USER linkuup_user CREATEDB;
        ALTER DATABASE linkuup_db OWNER TO linkuup_user;
    END IF;
END
$$;
EOF

sudo systemctl restart postgresql
print_status "PostgreSQL configured"

# Step 10: Set up Python environment
print_status "Setting up Python virtual environment..."
cd ~/Linkuup
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
print_status "Python environment ready"

# Step 11: Configure backend environment
print_status "Configuring backend environment..."
cd ~/Linkuup/backend
if [ ! -f ".env" ]; then
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
    print_status "Environment file created with generated SECRET_KEY"
else
    print_warning "Environment file already exists"
fi

# Step 12: Run database migrations
print_status "Running database migrations..."
source ../venv/bin/activate
cd ~/Linkuup/backend
alembic upgrade head
print_status "Database migrations completed"

# Step 13: Set up frontend
print_status "Setting up frontend..."
cd ~/Linkuup/frontend
cat > .env.production << 'EOF'
VITE_API_BASE_URL=http://64.226.117.67/api/v1
VITE_GOOGLE_MAPS_API_KEY=
VITE_REVENUECAT_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
EOF

npm install
npm run build
print_status "Frontend built successfully"

# Step 14: Create directories
print_status "Creating directories..."
sudo mkdir -p /var/log/linkuup
sudo chown linkuup:linkuup /var/log/linkuup
mkdir -p ~/Linkuup/backend/uploads
mkdir -p ~/Linkuup/backend/image_cache
print_status "Directories created"

# Step 15: Configure Nginx
print_status "Configuring Nginx..."
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
print_status "Nginx configured"

# Step 16: Set up PM2
print_status "Setting up PM2..."
cd ~/Linkuup
cp ecosystem.config.js ~/ecosystem.config.js
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup systemd -u linkuup --hp /home/linkuup
print_status "PM2 configured"

# Step 17: Configure firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
print_status "Firewall configured"

print_status ""
print_status "========================================="
print_status "Setup completed successfully!"
print_status "========================================="
print_status ""
print_warning "Next steps:"
print_warning "1. Update ~/Linkuup/backend/.env with your actual values:"
print_warning "   - BREVO_API_KEY (for email)"
print_warning "   - Stripe keys (if using payments)"
print_warning "   - Database password (if you changed it)"
print_warning ""
print_warning "2. Restart the application:"
print_warning "   pm2 restart linkuup-backend"
print_warning ""
print_warning "3. Check status:"
print_warning "   pm2 status"
print_warning "   pm2 logs linkuup-backend"
print_warning ""
print_warning "4. Test the application:"
print_warning "   curl http://127.0.0.1:5001/api/v1/health"
print_warning "   Visit: http://64.226.117.67"
print_status ""

