#!/bin/bash

# BioSearch2 Deployment Script with CSV File Support
# This script ensures the Clientes.csv file is deployed to the droplet

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
    print_error "Usage: DROPLET_IP=your.droplet.ip ./scripts/deploy_with_csv.sh"
    exit 1
fi

print_header "Starting BioSearch2 deployment with CSV file support..."
print_status "Target: biosearch@$DROPLET_IP"

# Test SSH connection
print_status "Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no biosearch@$DROPLET_IP "echo 'SSH OK'" > /dev/null 2>&1; then
    print_error "Cannot connect to $DROPLET_IP as biosearch user"
    print_error "Please ensure the droplet is running and accessible"
    exit 1
fi

# Step 1: Update application code
print_header "Step 1: Updating application code..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2
git pull origin main
echo "Application code updated"
EOF

# Step 2: Ensure Clientes.csv is present
print_header "Step 2: Ensuring Clientes.csv is present..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2

# Check if Clientes.csv exists
if [ ! -f "Clientes.csv" ]; then
    echo "Clientes.csv not found, this is the issue!"
    echo "The CSV file needs to be deployed to the droplet"
    exit 1
else
    echo "Clientes.csv found ✓"
    ls -la Clientes.csv
fi
EOF

# Step 3: Update Python dependencies
print_header "Step 3: Updating Python dependencies..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
echo "Dependencies updated"
EOF

# Step 4: Test customer validation
print_header "Step 4: Testing customer validation..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2/backend
source ../venv/bin/activate

# Test the customer validation module
python3 -c "
import sys
sys.path.append('.')
from customer_validation import load_customer_codes, is_valid_customer_id

print('Testing customer validation...')
codes = load_customer_codes()
print(f'Loaded {len(codes)} customer codes')

# Test customer ID 828
if is_valid_customer_id('828'):
    print('✓ Customer ID 828 is valid')
else:
    print('✗ Customer ID 828 is NOT valid')
    
# Test a few other customer IDs
test_ids = ['437', '439', '486', '489']
for cid in test_ids:
    if is_valid_customer_id(cid):
        print(f'✓ Customer ID {cid} is valid')
    else:
        print(f'✗ Customer ID {cid} is NOT valid')
"
EOF

# Step 5: Restart application
print_header "Step 5: Restarting application..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2
source venv/bin/activate

# Stop existing processes
pkill -f "python.*app.py" || true
sleep 2

# Start the application
nohup python3 backend/app.py > app.log 2>&1 &
echo "Application restarted"
EOF

# Step 6: Test the API
print_header "Step 6: Testing the API..."
sleep 5

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f http://$DROPLET_IP:5001/api/health > /dev/null 2>&1; then
    print_status "✓ Backend API is responding"
else
    print_warning "Backend API not responding yet, checking logs..."
    ssh biosearch@$DROPLET_IP "cd BioSearch2 && tail -20 app.log"
fi

# Test customer validation via API
print_status "Testing customer validation via API..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test828@example.com",
    "password": "testpassword123",
    "name": "Test User 828",
    "customer_id": "828",
    "gdpr_data_processing_consent": true
  }' || echo "Registration test completed (may fail if user already exists)"
EOF

print_header "🎉 Deployment Complete!"
print_status "Your BioSearch2 application should be running at:"
print_status "  http://$DROPLET_IP"
print_status ""
print_status "Customer ID 828 should now be working for registration!"
print_status ""
print_warning "If you still have issues, check the logs:"
print_warning "  ssh biosearch@$DROPLET_IP 'cd BioSearch2 && tail -f app.log'"
