#!/bin/bash

# Quick Update Script for BioSearch2 on Hostinger
# Use this script for quick updates after initial deployment

set -e

# Configuration
HOSTINGER_IP="147.93.89.178"
HOSTINGER_USER="root"  # Update with your Hostinger SSH username
APP_DIR="/var/www/biosearch2"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[UPDATE]${NC} $1"
}

# Main update function
main() {
    print_header "🔄 Updating BioSearch2 on Hostinger..."
    
    # Pull latest from GitHub on server
    print_status "Pulling latest code from GitHub..."
    ssh $HOSTINGER_USER@$HOSTINGER_IP << EOF
        cd $APP_DIR
        git pull origin main
EOF
    
    # Build frontend locally and upload
    print_status "Building frontend locally..."
    cd frontend
    npm install
    npm run build
    cd ..
    
    # Upload frontend build
    print_status "Uploading frontend build..."
    rsync -avz --delete frontend/dist/ $HOSTINGER_USER@$HOSTINGER_IP:$APP_DIR/frontend/dist/
    
    # Update backend dependencies and restart
    print_status "Updating backend..."
    ssh $HOSTINGER_USER@$HOSTINGER_IP << EOF
        cd $APP_DIR
        source venv/bin/activate
        pip install -r backend/requirements.txt
        sudo systemctl restart biosearch2
        sudo systemctl reload nginx
EOF
    
    # Test deployment
    sleep 3
    if curl -f http://$HOSTINGER_IP/api/health > /dev/null 2>&1; then
        print_status "✅ Backend is responding"
    fi
    
    if curl -f http://$HOSTINGER_IP > /dev/null 2>&1; then
        print_status "✅ Frontend is responding"
    fi
    
    print_header "✅ Update completed!"
    print_status "Application updated at: http://$HOSTINGER_IP"
}

main "$@"

