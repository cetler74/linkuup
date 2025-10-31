#!/bin/bash

# Fix Nginx Configuration for Image Serving
# This script updates the nginx configuration to properly serve uploaded images

set -e

# Configuration
HOSTINGER_IP="147.93.89.178"
HOSTINGER_USER="root"  # Update this if you use a different SSH user
NGINX_CONFIG_PATH="/etc/nginx/sites-available/biosearch2"

echo "=========================================="
echo "Fixing Nginx Configuration for Images"
echo "=========================================="
echo ""

# Check if SSH connection works
echo "Testing SSH connection to $HOSTINGER_USER@$HOSTINGER_IP..."
if ! ssh -o ConnectTimeout=5 "$HOSTINGER_USER@$HOSTINGER_IP" "echo 'SSH connection successful'"; then
    echo "ERROR: Cannot connect to server via SSH"
    echo "Please check:"
    echo "  1. Your SSH credentials are correct"
    echo "  2. The server is accessible"
    echo "  3. You have proper permissions"
    exit 1
fi
echo "✓ SSH connection successful"
echo ""

# Backup current nginx configuration
echo "Backing up current nginx configuration..."
ssh "$HOSTINGER_USER@$HOSTINGER_IP" << 'ENDSSH'
    if [ -f /etc/nginx/sites-available/biosearch2 ]; then
        sudo cp /etc/nginx/sites-available/biosearch2 /etc/nginx/sites-available/biosearch2.backup.$(date +%Y%m%d_%H%M%S)
        echo "✓ Backup created"
    else
        echo "⚠ No existing configuration found (this is OK for first-time setup)"
    fi
ENDSSH
echo ""

# Upload new nginx configuration
echo "Uploading new nginx configuration..."
scp nginx.conf "$HOSTINGER_USER@$HOSTINGER_IP:/tmp/biosearch2-nginx.conf"
echo "✓ Configuration uploaded"
echo ""

# Install and activate the configuration
echo "Installing nginx configuration..."
ssh "$HOSTINGER_USER@$HOSTINGER_IP" << 'ENDSSH'
    # Move configuration to nginx directory
    sudo mv /tmp/biosearch2-nginx.conf /etc/nginx/sites-available/biosearch2
    
    # Create symbolic link if it doesn't exist
    if [ ! -L /etc/nginx/sites-enabled/biosearch2 ]; then
        sudo ln -s /etc/nginx/sites-available/biosearch2 /etc/nginx/sites-enabled/biosearch2
        echo "✓ Configuration linked to sites-enabled"
    fi
    
    # Remove default nginx site if it exists
    if [ -L /etc/nginx/sites-enabled/default ]; then
        sudo rm /etc/nginx/sites-enabled/default
        echo "✓ Removed default nginx configuration"
    fi
ENDSSH
echo ""

# Test nginx configuration
echo "Testing nginx configuration..."
if ssh "$HOSTINGER_USER@$HOSTINGER_IP" "sudo nginx -t"; then
    echo "✓ Nginx configuration is valid"
else
    echo "ERROR: Nginx configuration test failed!"
    echo "Restoring backup..."
    ssh "$HOSTINGER_USER@$HOSTINGER_IP" << 'ENDSSH'
        BACKUP=$(ls -t /etc/nginx/sites-available/biosearch2.backup.* 2>/dev/null | head -1)
        if [ -n "$BACKUP" ]; then
            sudo cp "$BACKUP" /etc/nginx/sites-available/biosearch2
            echo "✓ Backup restored"
        fi
ENDSSH
    exit 1
fi
echo ""

# Reload nginx
echo "Reloading nginx..."
ssh "$HOSTINGER_USER@$HOSTINGER_IP" "sudo systemctl reload nginx"
echo "✓ Nginx reloaded successfully"
echo ""

# Verify backend service is running
echo "Checking backend service..."
if ssh "$HOSTINGER_USER@$HOSTINGER_IP" "sudo systemctl is-active --quiet biosearch2"; then
    echo "✓ Backend service is running"
else
    echo "⚠ Backend service is not running. Starting it..."
    ssh "$HOSTINGER_USER@$HOSTINGER_IP" "sudo systemctl start biosearch2"
    sleep 2
    if ssh "$HOSTINGER_USER@$HOSTINGER_IP" "sudo systemctl is-active --quiet biosearch2"; then
        echo "✓ Backend service started successfully"
    else
        echo "ERROR: Could not start backend service"
        echo "Check logs with: ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo journalctl -u biosearch2 -n 50'"
    fi
fi
echo ""

# Test the uploads endpoint
echo "Testing uploads endpoint..."
RESPONSE=$(ssh "$HOSTINGER_USER@$HOSTINGER_IP" "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health" || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo "✓ API endpoint is responding"
else
    echo "⚠ API endpoint returned status: $RESPONSE"
    echo "This might be normal if /api/health doesn't exist"
fi
echo ""

echo "=========================================="
echo "✓ Nginx configuration update complete!"
echo "=========================================="
echo ""
echo "Images should now be visible at:"
echo "  http://147.93.89.178/salon/1"
echo "  http://findursalon.biosculpture.pt/salon/1"
echo ""
echo "If images still don't show:"
echo "1. Check backend logs:"
echo "   ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo journalctl -u biosearch2 -n 50'"
echo ""
echo "2. Check nginx error logs:"
echo "   ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo tail -f /var/log/nginx/error.log'"
echo ""
echo "3. Verify uploads directory exists:"
echo "   ssh $HOSTINGER_USER@$HOSTINGER_IP 'ls -la /var/www/biosearch2/backend/uploads/'"
echo ""

