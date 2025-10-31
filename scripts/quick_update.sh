#!/bin/bash

# Quick Update Script for BioSearch2
# This script updates the application with the latest changes from GitHub

set -e

# Configuration
DROPLET_IP="147.182.129.184"
DROPLET_USER="biosearch"
APP_NAME="BioSearch2"

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
    echo -e "${BLUE}[UPDATE]${NC} $1"
}

# Test SSH connection
test_ssh_connection() {
    print_status "Testing SSH connection to $DROPLET_IP..."
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $DROPLET_USER@$DROPLET_IP exit 2>/dev/null; then
        print_error "Cannot connect to $DROPLET_IP as $DROPLET_USER"
        print_error "Please ensure SSH key is properly configured"
        exit 1
    fi
    print_status "SSH connection successful"
}

# Update application code
update_application() {
    print_header "Updating application code..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        cd BioSearch2
        
        # Pull latest changes
        git pull origin main
        
        # Update Python dependencies if needed
        source venv/bin/activate
        pip install -r backend/requirements.txt
        
        # Rebuild frontend
        cd frontend
        npm install
        npm run build
        cd ..
        
        echo "Application code updated successfully"
EOF
}

# Restart application
restart_application() {
    print_header "Restarting application..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        cd BioSearch2
        
        # Stop existing processes
        pkill -f "python.*app.py" || true
        
        # Start the application
        source venv/bin/activate
        export DATABASE_URL="postgresql://biosearch_user:biosearch_secure_password_2024@localhost/biosearch_db"
        export FLASK_APP="backend/app.py"
        export FLASK_ENV="production"
        nohup python3 backend/app.py > app.log 2>&1 &
        
        echo "Application restarted successfully"
EOF
}

# Test deployment
test_deployment() {
    print_header "Testing deployment..."
    sleep 5
    
    # Test backend
    if curl -f http://$DROPLET_IP/api/health > /dev/null 2>&1; then
        print_status "✅ Backend is responding"
    else
        print_warning "⚠️ Backend may not be responding yet"
    fi
    
    # Test frontend
    if curl -f http://$DROPLET_IP > /dev/null 2>&1; then
        print_status "✅ Frontend is responding"
    else
        print_warning "⚠️ Frontend may not be responding yet"
    fi
}

# Main update function
main() {
    print_header "Starting BioSearch2 quick update..."
    print_status "Target: $DROPLET_USER@$DROPLET_IP"
    
    test_ssh_connection
    update_application
    restart_application
    test_deployment
    
    print_header "🎉 Update completed successfully!"
    print_status "Your updated application is available at:"
    print_status "  http://$DROPLET_IP"
    print_status ""
    print_warning "Changes deployed:"
    print_warning "  - Updated homepage title to 'Encontre Salões especializados com Bio Sculpture'"
    print_warning "  - Enhanced BIO Diamond page with 'Padrão de Excelência'"
    print_warning "  - Improved Portuguese translations throughout"
    print_status ""
    print_status "Update completed! 🚀"
}

# Run main function
main "$@"
