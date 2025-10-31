#!/bin/bash

# Simple BioSearch2 Deployment Script
# This script deploys the application without interactive prompts

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
    print_error "Usage: DROPLET_IP=your.droplet.ip ./scripts/simple_deploy.sh"
    exit 1
fi

print_header "Starting BioSearch2 simple deployment..."
print_status "Target: root@$DROPLET_IP"

# Test SSH connection
print_status "Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH OK'" > /dev/null 2>&1; then
    print_error "Cannot connect to $DROPLET_IP"
    exit 1
fi

# Step 1: Basic system setup (non-interactive)
print_header "Step 1: Basic system setup..."
ssh root@$DROPLET_IP << 'EOF'
export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y curl wget git build-essential
EOF

# Step 2: Install Node.js
print_header "Step 2: Installing Node.js..."
ssh root@$DROPLET_IP << 'EOF'
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
EOF

# Step 3: Install Python
print_header "Step 3: Installing Python..."
ssh root@$DROPLET_IP << 'EOF'
apt install -y python3 python3-pip python3-venv python3-dev
EOF

# Step 4: Install PostgreSQL
print_header "Step 4: Installing PostgreSQL..."
ssh root@$DROPLET_IP << 'EOF'
apt install -y postgresql postgresql-contrib
EOF

# Step 5: Install Nginx
print_header "Step 5: Installing Nginx..."
ssh root@$DROPLET_IP << 'EOF'
apt install -y nginx
EOF

# Step 6: Create biosearch user
print_header "Step 6: Creating biosearch user..."
ssh root@$DROPLET_IP << 'EOF'
useradd -m -s /bin/bash biosearch
usermod -aG sudo biosearch
mkdir -p /home/biosearch/.ssh
cp /root/.ssh/authorized_keys /home/biosearch/.ssh/
chown -R biosearch:biosearch /home/biosearch/.ssh
chmod 700 /home/biosearch/.ssh
chmod 600 /home/biosearch/.ssh/authorized_keys
echo "biosearch ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
EOF

# Step 7: Clone and setup application
print_header "Step 7: Setting up application..."
ssh biosearch@$DROPLET_IP << 'EOF'
git clone https://github.com/cetler74/BioSearch2.git
cd BioSearch2
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
cd frontend
npm install
npm run build
cd ..
EOF

# Step 8: Setup database
print_header "Step 8: Setting up database..."
ssh root@$DROPLET_IP << 'EOF'
sudo -u postgres psql -c "CREATE DATABASE biosearch_db;"
sudo -u postgres psql -c "CREATE USER biosearch_user WITH PASSWORD 'biosearch_secure_password_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE biosearch_db TO biosearch_user;"
sudo -u postgres psql -c "ALTER USER biosearch_user CREATEDB;"
EOF

# Step 9: Create database tables
print_header "Step 9: Creating database tables..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2/backend
source ../venv/bin/activate
export DATABASE_URL="postgresql://biosearch_user:biosearch_secure_password_2024@localhost/biosearch_db"
python3 -c "
import sys
sys.path.append('.')
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"
EOF

# Step 10: Configure Nginx
print_header "Step 10: Configuring Nginx..."
ssh root@$DROPLET_IP << 'EOF'
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

ln -sf /etc/nginx/sites-available/biosearch /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
EOF

# Step 11: Start application
print_header "Step 11: Starting application..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2
export DATABASE_URL="postgresql://biosearch_user:biosearch_secure_password_2024@localhost/biosearch_db"
export FLASK_APP="backend/app.py"
export FLASK_ENV="production"
source venv/bin/activate
nohup python3 backend/app.py > app.log 2>&1 &
EOF

# Step 12: Wait and test
print_header "Step 12: Testing deployment..."
sleep 10
ssh biosearch@$DROPLET_IP << 'EOF'
curl -f http://localhost:5001/api/health || echo "Backend not responding yet"
EOF

print_header "🎉 Deployment Complete!"
print_status "Your BioSearch2 application should be running at:"
print_status "  http://$DROPLET_IP"
print_status ""
print_warning "If the application is not responding, check the logs:"
print_warning "  ssh biosearch@$DROPLET_IP 'cd BioSearch2 && tail -f app.log'"
print_status ""
print_status "Deployment completed! 🚀"
