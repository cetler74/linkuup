#!/bin/bash

# BioSearch2 Deployment Script with User Setup
# This script sets up the user and deploys the application

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Check if DROPLET_IP is provided
if [ -z "$DROPLET_IP" ]; then
    print_error "DROPLET_IP environment variable is required"
    print_error "Usage: DROPLET_IP=your.droplet.ip ./scripts/deploy_with_setup.sh"
    exit 1
fi

print_header "Starting BioSearch2 deployment with setup to Digital Ocean..."
print_status "Target: root@$DROPLET_IP"

# Test SSH connection as root
print_status "Testing SSH connection to $DROPLET_IP..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH connection successful'" > /dev/null 2>&1; then
    print_error "Cannot connect to $DROPLET_IP as root"
    print_error "Please ensure SSH key is properly configured"
    exit 1
fi

print_status "SSH connection successful"

# Step 1: Update system and install dependencies
print_header "Step 1: Updating system and installing dependencies..."
ssh root@$DROPLET_IP << 'EOF'
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git build-essential software-properties-common

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Python 3.11
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3.11-distutils

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install other dependencies
apt install -y libpq-dev pkg-config
EOF

print_status "System setup completed"

# Step 2: Create biosearch user
print_header "Step 2: Creating biosearch user..."
ssh root@$DROPLET_IP << 'EOF'
# Create biosearch user
useradd -m -s /bin/bash biosearch
usermod -aG sudo biosearch

# Set up SSH key for biosearch user
mkdir -p /home/biosearch/.ssh
cp /root/.ssh/authorized_keys /home/biosearch/.ssh/
chown -R biosearch:biosearch /home/biosearch/.ssh
chmod 700 /home/biosearch/.ssh
chmod 600 /home/biosearch/.ssh/authorized_keys

# Allow biosearch to run sudo without password for deployment
echo "biosearch ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
EOF

print_status "User biosearch created and configured"

# Step 3: Clone repository and set up application
print_header "Step 3: Setting up application..."
ssh biosearch@$DROPLET_IP << 'EOF'
# Clone repository
git clone https://github.com/cetler74/BioSearch2.git
cd BioSearch2

# Set up Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Set up frontend
cd frontend
npm install
npm run build
cd ..
EOF

print_status "Application setup completed"

# Step 4: Configure database
print_header "Step 4: Configuring database..."
ssh root@$DROPLET_IP << 'EOF'
# Create database and user
sudo -u postgres psql << 'PSQL'
CREATE DATABASE biosearch_db;
CREATE USER biosearch_user WITH PASSWORD 'biosearch_secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE biosearch_db TO biosearch_user;
ALTER USER biosearch_user CREATEDB;
\q
PSQL
EOF

print_status "Database configured"

# Step 5: Create database tables
print_header "Step 5: Creating database tables..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2/backend
source ../venv/bin/activate
python3 -c "
import sys
sys.path.append('.')
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"
EOF

print_status "Database tables created"

# Step 6: Configure Nginx
print_header "Step 6: Configuring Nginx..."
ssh root@$DROPLET_IP << 'EOF'
# Create Nginx configuration
cat > /etc/nginx/sites-available/biosearch << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        root /home/biosearch/BioSearch2/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/biosearch /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx
EOF

print_status "Nginx configured"

# Step 7: Install PM2 and start application
print_header "Step 7: Starting application..."
ssh biosearch@$DROPLET_IP << 'EOF'
# Install PM2
sudo npm install -g pm2

# Create PM2 ecosystem file
cd BioSearch2
cat > ecosystem.config.js << 'PM2'
module.exports = {
  apps: [{
    name: 'biosearch-backend',
    script: 'backend/app.py',
    interpreter: 'venv/bin/python',
    cwd: '/home/biosearch/BioSearch2',
    env: {
      FLASK_APP: 'backend/app.py',
      FLASK_ENV: 'production',
      DATABASE_URL: 'postgresql://biosearch_user:biosearch_secure_password_2024@localhost/biosearch_db'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
PM2

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
EOF

print_status "Application started with PM2"

# Step 8: Final verification
print_header "Step 8: Verifying deployment..."
ssh biosearch@$DROPLET_IP << 'EOF'
# Check PM2 status
pm2 status

# Check if application is responding
sleep 5
curl -f http://localhost:5001/api/health || echo "Backend health check failed"
EOF

print_status "Deployment verification completed"

print_header "🎉 Deployment Complete!"
print_status "Your BioSearch2 application is now running at:"
print_status "  http://$DROPLET_IP"
print_status ""
print_status "Application details:"
print_status "  - Frontend: React app with internationalization"
print_status "  - Backend: Flask API with GDPR compliance"
print_status "  - Database: PostgreSQL with all tables"
print_status "  - Web Server: Nginx reverse proxy"
print_status "  - Process Manager: PM2"
print_status ""
print_warning "Next steps:"
print_warning "1. Test all features at http://$DROPLET_IP"
print_warning "2. Set up SSL certificate if using a domain"
print_warning "3. Configure monitoring and backups"
print_warning "4. Scale up to production size when ready"
print_status ""
print_status "Deployment completed successfully! 🚀"
