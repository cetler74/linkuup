#!/bin/bash

# Script to copy Clientes.csv to the droplet
# This ensures the CSV file is available for customer validation

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
    echo -e "${BLUE}[CSV COPY]${NC} $1"
}

# Check if DROPLET_IP is provided
if [ -z "$DROPLET_IP" ]; then
    print_error "DROPLET_IP environment variable is required"
    print_error "Usage: DROPLET_IP=your.droplet.ip ./scripts/copy_csv_to_droplet.sh"
    exit 1
fi

# Check if Clientes.csv exists locally
if [ ! -f "Clientes.csv" ]; then
    print_error "Clientes.csv not found in current directory"
    print_error "Please run this script from the BioSearch2 root directory"
    exit 1
fi

print_header "Copying Clientes.csv to droplet..."
print_status "Source: $(pwd)/Clientes.csv"
print_status "Target: biosearch@$DROPLET_IP:BioSearch2/Clientes.csv"

# Copy the CSV file to the droplet
scp Clientes.csv biosearch@$DROPLET_IP:BioSearch2/Clientes.csv

# Verify the file was copied
print_header "Verifying CSV file on droplet..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2
if [ -f "Clientes.csv" ]; then
    echo "✓ Clientes.csv found on droplet"
    echo "File size: $(wc -l < Clientes.csv) lines"
    echo "First few lines:"
    head -3 Clientes.csv
else
    echo "✗ Clientes.csv not found on droplet"
    exit 1
fi
EOF

print_header "Testing customer validation on droplet..."
ssh biosearch@$DROPLET_IP << 'EOF'
cd BioSearch2/backend
source ../venv/bin/activate

# Test customer validation
python3 -c "
import sys
sys.path.append('.')
from customer_validation import load_customer_codes, is_valid_customer_id

print('Testing customer validation...')
codes = load_customer_codes()
print(f'Loaded {len(codes)} customer codes')

# Test customer ID 828 specifically
if is_valid_customer_id('828'):
    print('✓ Customer ID 828 is valid - this should fix the signup issue!')
else:
    print('✗ Customer ID 828 is still NOT valid')
    
# Show some valid customer IDs
valid_ids = [cid for cid in ['828', '437', '439', '486', '489'] if is_valid_customer_id(cid)]
print(f'Valid customer IDs found: {valid_ids}')
"
EOF

print_header "🎉 CSV file deployment complete!"
print_status "Customer ID 828 should now work for user registration"
print_status ""
print_status "You can now test user registration with customer ID 828"
