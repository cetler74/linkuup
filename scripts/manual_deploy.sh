#!/bin/bash

# Manual Deployment Script for BioSearch2
# This script provides step-by-step deployment instructions

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

# Load environment variables
if [ -f .env.digitalocean ]; then
    export $(cat .env.digitalocean | grep -v '^#' | xargs)
fi

print_header "BioSearch2 Manual Deployment Guide"
echo ""
print_status "Your droplet is ready at: 68.183.24.154"
print_status "Droplet ID: 518764368"
echo ""

print_header "Step 1: Add SSH Key to Digital Ocean"
echo ""
print_warning "You need to add an SSH key to your Digital Ocean account:"
echo "1. Go to: https://cloud.digitalocean.com/account/security"
echo "2. Click 'Add SSH Key'"
echo "3. Copy your public key:"
echo ""

# Show user's SSH key
if [ -f ~/.ssh/id_rsa.pub ]; then
    print_status "Your SSH public key:"
    cat ~/.ssh/id_rsa.pub
    echo ""
elif [ -f ~/.ssh/id_ed25519.pub ]; then
    print_status "Your SSH public key:"
    cat ~/.ssh/id_ed25519.pub
    echo ""
else
    print_warning "No SSH key found. Generate one with:"
    echo "ssh-keygen -t ed25519 -C 'your-email@example.com'"
    echo ""
fi

print_header "Step 2: Recreate Droplet with SSH Key"
echo ""
print_warning "After adding your SSH key to Digital Ocean:"
echo "1. Get your SSH key fingerprint from Digital Ocean dashboard"
echo "2. Run this command to recreate the droplet with SSH access:"
echo ""
echo "curl -X DELETE \\"
echo "  -H 'Authorization: Bearer $DIGITALOCEAN_API_TOKEN' \\"
echo "  'https://api.digitalocean.com/v2/droplets/518764368'"
echo ""
echo "Then create a new droplet with SSH key:"
echo ""
echo "curl -X POST \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $DIGITALOCEAN_API_TOKEN' \\"
echo "  -d '{"
echo "    \"name\": \"biosearch2-dev\","
echo "    \"region\": \"nyc1\","
echo "    \"size\": \"s-1vcpu-1gb\","
echo "    \"image\": \"ubuntu-22-04-x64\","
echo "    \"ssh_keys\": [\"YOUR_SSH_KEY_FINGERPRINT\"],"
echo "    \"backups\": false,"
echo "    \"ipv6\": true,"
echo "    \"tags\": [\"biosearch2\", \"development\"]"
echo "  }' \\"
echo "  'https://api.digitalocean.com/v2/droplets'"
echo ""

print_header "Step 3: Alternative - Use Digital Ocean Console"
echo ""
print_warning "If you prefer, you can use the Digital Ocean web console:"
echo "1. Go to: https://cloud.digitalocean.com/droplets"
echo "2. Click on your droplet: biosearch2-dev"
echo "3. Click 'Access' -> 'Launch Droplet Console'"
echo "4. Follow the manual setup instructions below"
echo ""

print_header "Step 4: Manual Setup Commands"
echo ""
print_status "Once you have SSH access, run these commands on the droplet:"
echo ""
echo "# Update system"
echo "apt update && apt upgrade -y"
echo ""
echo "# Create user"
echo "adduser biosearch"
echo "usermod -aG sudo biosearch"
echo ""
echo "# Install Node.js"
echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
echo "sudo apt-get install -y nodejs"
echo ""
echo "# Install Python"
echo "sudo apt install -y python3.11 python3.11-venv python3.11-dev"
echo ""
echo "# Install PostgreSQL"
echo "sudo apt install -y postgresql postgresql-contrib"
echo ""
echo "# Install Nginx"
echo "sudo apt install -y nginx"
echo ""
echo "# Install Git"
echo "sudo apt install -y git"
echo ""
echo "# Install other dependencies"
echo "sudo apt install -y build-essential libpq-dev"
echo ""

print_header "Step 5: Deploy Application"
echo ""
print_status "After setting up the server, deploy your application:"
echo ""
echo "# Clone repository"
echo "git clone https://github.com/cetler74/BioSearch2.git"
echo "cd BioSearch2"
echo ""
echo "# Set up Python environment"
echo "python3.11 -m venv venv"
echo "source venv/bin/activate"
echo "pip install -r backend/requirements.txt"
echo ""
echo "# Set up frontend"
echo "cd frontend"
echo "npm install"
echo "npm run build"
echo "cd .."
echo ""

print_header "Step 6: Configure Database"
echo ""
print_status "Set up PostgreSQL:"
echo ""
echo "# Create database and user"
echo "sudo -u postgres psql"
echo "CREATE DATABASE biosearch_db;"
echo "CREATE USER biosearch_user WITH PASSWORD 'biosearch_secure_password_2024';"
echo "GRANT ALL PRIVILEGES ON DATABASE biosearch_db TO biosearch_user;"
echo "ALTER USER biosearch_user CREATEDB;"
echo "\\q"
echo ""
echo "# Create database tables"
echo "cd backend"
echo "python3 -c \""
echo "import sys"
echo "sys.path.append('.')"
echo "from app import app, db"
echo "with app.app_context():"
echo "    db.create_all()"
echo "    print('Database tables created successfully')"
echo "\""
echo ""

print_header "Step 7: Configure Nginx"
echo ""
print_status "Set up Nginx reverse proxy:"
echo ""
echo "sudo tee /etc/nginx/sites-available/biosearch > /dev/null << 'EOF'"
echo "server {"
echo "    listen 80;"
echo "    server_name _;"
echo "    "
echo "    location / {"
echo "        root /home/biosearch/BioSearch2/frontend/dist;"
echo "        try_files \$uri \$uri/ /index.html;"
echo "    }"
echo "    "
echo "    location /api/ {"
echo "        proxy_pass http://127.0.0.1:5001;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    }"
echo "}"
echo "EOF"
echo ""
echo "sudo ln -sf /etc/nginx/sites-available/biosearch /etc/nginx/sites-enabled/"
echo "sudo rm -f /etc/nginx/sites-enabled/default"
echo "sudo nginx -t"
echo "sudo systemctl restart nginx"
echo ""

print_header "Step 8: Start Application"
echo ""
print_status "Start your application:"
echo ""
echo "# Install PM2"
echo "sudo npm install -g pm2"
echo ""
echo "# Start application"
echo "cd /home/biosearch/BioSearch2/backend"
echo "pm2 start app.py --name biosearch-backend --interpreter venv/bin/python"
echo "pm2 save"
echo "pm2 startup"
echo ""

print_header "Step 9: Access Your Application"
echo ""
print_status "Your application will be available at:"
echo "http://68.183.24.154"
echo ""
print_warning "Next steps:"
print_warning "1. Test all features work correctly"
print_warning "2. Set up SSL certificate if using a domain"
print_warning "3. Configure monitoring and backups"
print_warning "4. Scale up to production size when ready"
echo ""
print_status "Deployment guide complete!"
