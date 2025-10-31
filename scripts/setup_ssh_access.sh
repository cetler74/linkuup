#!/bin/bash

# SSH Access Setup for Hostinger
# This script helps set up SSH key authentication

set -e

HOSTINGER_IP="147.93.89.178"

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

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

print_header "SSH Access Setup for Hostinger ($HOSTINGER_IP)"
echo ""

# Ask for username
read -p "Enter your Hostinger SSH username (usually 'root' or provided by Hostinger): " HOSTINGER_USER

if [ -z "$HOSTINGER_USER" ]; then
    print_warning "No username provided, using 'root'"
    HOSTINGER_USER="root"
fi

print_status "Setting up SSH access for user: $HOSTINGER_USER"
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/id_ed25519.pub ]; then
    print_warning "No SSH key found. Generating one..."
    ssh-keygen -t ed25519 -C "biosearch2-deployment" -f ~/.ssh/id_ed25519 -N ""
    print_status "SSH key generated"
fi

# Display SSH public key
print_header "Your SSH Public Key:"
echo ""
cat ~/.ssh/id_ed25519.pub
echo ""

# Try to copy SSH key to server
print_status "Attempting to copy SSH key to server..."
print_warning "You will be prompted for your Hostinger password"
echo ""

if ssh-copy-id -i ~/.ssh/id_ed25519.pub $HOSTINGER_USER@$HOSTINGER_IP; then
    print_status "✅ SSH key successfully copied!"
    echo ""
    
    # Test connection
    print_status "Testing SSH connection..."
    if ssh -o BatchMode=yes $HOSTINGER_USER@$HOSTINGER_IP "echo 'SSH connection successful!'"; then
        print_status "✅ SSH authentication working!"
        echo ""
        
        # Update deployment script with correct username
        print_status "Updating deployment scripts with username: $HOSTINGER_USER"
        
        # Update deploy_to_hostinger.sh
        if [ -f scripts/deploy_to_hostinger.sh ]; then
            sed -i.bak "s/HOSTINGER_USER=\".*\"/HOSTINGER_USER=\"$HOSTINGER_USER\"/" scripts/deploy_to_hostinger.sh
            print_status "Updated scripts/deploy_to_hostinger.sh"
        fi
        
        # Update update_hostinger.sh
        if [ -f scripts/update_hostinger.sh ]; then
            sed -i.bak "s/HOSTINGER_USER=\".*\"/HOSTINGER_USER=\"$HOSTINGER_USER\"/" scripts/update_hostinger.sh
            print_status "Updated scripts/update_hostinger.sh"
        fi
        
        echo ""
        print_header "✅ Setup Complete!"
        print_status "You can now run the deployment script:"
        echo ""
        echo "  ./scripts/deploy_to_hostinger.sh"
        echo ""
    else
        print_warning "SSH connection test failed. Please check your configuration."
    fi
else
    print_warning "Failed to copy SSH key."
    echo ""
    print_header "Manual Setup Instructions:"
    echo ""
    echo "1. Copy your SSH public key (shown above)"
    echo "2. Log in to your Hostinger control panel"
    echo "3. Go to SSH Access settings"
    echo "4. Add the public key to authorized keys"
    echo ""
    echo "Or manually run:"
    echo "  cat ~/.ssh/id_ed25519.pub | ssh $HOSTINGER_USER@$HOSTINGER_IP 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'"
    echo ""
fi

