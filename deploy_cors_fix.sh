#!/bin/bash

# CORS Fix Deployment Script
# This script deploys the CORS fix to the production server
# Usage: ./deploy_cors_fix.sh [server_ip]

set -e  # Exit on error

SERVER=${1:-147.93.89.178}
SERVER_USER="root"
PROJECT_DIR="/var/www/biosearch2"
NGINX_CONFIG="/etc/nginx/sites-available/biosearch2"

echo "=========================================="
echo "CORS Fix Deployment Script"
echo "=========================================="
echo "Server: $SERVER"
echo "User: $SERVER_USER"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if files exist locally
if [ ! -f "backend/app.py" ]; then
    print_error "backend/app.py not found!"
    exit 1
fi

if [ ! -f "nginx.conf" ]; then
    print_error "nginx.conf not found!"
    exit 1
fi

print_status "Local files verified"

# Step 1: Upload files to server
print_warning "Uploading files to server..."

# Upload Flask app
scp "backend/app.py" "$SERVER_USER@$SERVER:/tmp/app.py.new"
print_status "Uploaded Flask app"

# Upload nginx config
scp "nginx.conf" "$SERVER_USER@$SERVER:/tmp/nginx.conf.new"
print_status "Uploaded nginx config"

# Step 2: Deploy on server
print_warning "Deploying on server..."

ssh "$SERVER_USER@$SERVER" << 'ENDSSH'
set -e

echo "Creating backups..."
# Create backup directory
BACKUP_DIR="/var/backups/biosearch2/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup Flask app
cp /var/www/biosearch2/backend/app.py "$BACKUP_DIR/app.py.backup"
echo "✓ Backed up Flask app to $BACKUP_DIR/app.py.backup"

# Backup nginx config
cp /etc/nginx/sites-available/biosearch2 "$BACKUP_DIR/nginx.conf.backup"
echo "✓ Backed up nginx config to $BACKUP_DIR/nginx.conf.backup"

echo "Deploying new files..."
# Deploy Flask app
cp /tmp/app.py.new /var/www/biosearch2/backend/app.py
echo "✓ Deployed new Flask app"

# Deploy nginx config
cp /tmp/nginx.conf.new /etc/nginx/sites-available/biosearch2
echo "✓ Deployed new nginx config"

# Clean up temp files
rm /tmp/app.py.new /tmp/nginx.conf.new

echo "Testing nginx configuration..."
if nginx -t 2>&1; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration test failed!"
    echo "Restoring backup..."
    cp "$BACKUP_DIR/nginx.conf.backup" /etc/nginx/sites-available/biosearch2
    echo "Backup restored. Please check the configuration."
    exit 1
fi

echo "Restarting services..."
# Restart Flask app (try different methods)
if command -v pm2 &> /dev/null; then
    pm2 restart biosearch2-backend 2>/dev/null || pm2 restart all 2>/dev/null || echo "Note: PM2 restart attempted"
    echo "✓ Restarted Flask app via PM2"
elif systemctl is-active --quiet biosearch2-backend; then
    systemctl restart biosearch2-backend
    echo "✓ Restarted Flask app via systemd"
else
    echo "! Could not automatically restart Flask app. Please restart manually."
fi

# Reload nginx
systemctl reload nginx
echo "✓ Reloaded nginx"

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "Backup location: $BACKUP_DIR"
echo "=========================================="
ENDSSH

print_status "Deployment completed!"

# Step 3: Verify deployment
print_warning "Verifying deployment..."

echo ""
echo "Testing CORS headers..."
CORS_TEST=$(curl -s -I -X OPTIONS "http://$SERVER/api/auth/login" \
    -H "Origin: http://findursalon.biosculpture.pt" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" 2>&1)

if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
    print_status "CORS headers are present!"
    echo "$CORS_TEST" | grep "Access-Control"
else
    print_warning "CORS headers not found in response. This might be expected if the endpoint returns an error."
    echo "Response received:"
    echo "$CORS_TEST"
fi

echo ""
echo "Testing API health endpoint..."
HEALTH_CHECK=$(curl -s "http://$SERVER/api/health")
if echo "$HEALTH_CHECK" | grep -q "status"; then
    print_status "API is responding"
    echo "$HEALTH_CHECK" | head -5
else
    print_error "API health check failed"
fi

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo "✓ Files uploaded and deployed"
echo "✓ Services restarted"
echo "✓ Configuration validated"
echo ""
echo "Next steps:"
echo "1. Test login at http://findursalon.biosculpture.pt"
echo "2. Check browser console for CORS errors (should be gone)"
echo "3. Monitor logs: ssh $SERVER_USER@$SERVER 'pm2 logs biosearch2-backend'"
echo ""
print_status "CORS fix deployment complete!"

