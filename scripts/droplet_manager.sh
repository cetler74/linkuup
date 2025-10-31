#!/bin/bash

# Digital Ocean Droplet Manager
# This script provides easy commands to manage your BioSearch2 droplet

set -e

# Load environment variables
if [ -f .env.digitalocean ]; then
    export $(cat .env.digitalocean | grep -v '^#' | xargs)
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Function to list droplets
list_droplets() {
    print_status "Listing Digital Ocean droplets..."
    curl -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets" | jq '.droplets[] | {id, name, status, public_ip: .networks.v4[0].ip_address}'
}

# Function to create droplet
create_droplet() {
    print_status "Creating BioSearch2 droplet..."
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        -d "{
            \"name\": \"$DROPLET_NAME\",
            \"region\": \"$DROPLET_REGION\",
            \"size\": \"$DROPLET_SIZE\",
            \"image\": \"$DROPLET_IMAGE\",
            \"ssh_keys\": [],
            \"backups\": false,
            \"ipv6\": true,
            \"tags\": [\"biosearch2\", \"development\"]
        }" \
        "https://api.digitalocean.com/v2/droplets" | jq '.droplet | {id, name, status, public_ip: .networks.v4[0].ip_address}'
}

# Function to get droplet info
get_droplet_info() {
    local droplet_id=$1
    if [ -z "$droplet_id" ]; then
        print_error "Droplet ID is required"
        exit 1
    fi
    
    print_status "Getting droplet information for ID: $droplet_id"
    curl -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets/$droplet_id" | jq '.droplet | {id, name, status, public_ip: .networks.v4[0].ip_address, created_at, memory, vcpus, disk}'
}

# Function to get droplet IP
get_droplet_ip() {
    local droplet_id=$1
    if [ -z "$droplet_id" ]; then
        print_error "Droplet ID is required"
        exit 1
    fi
    
    curl -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets/$droplet_id" | jq -r '.droplet.networks.v4[0].ip_address'
}

# Main command handler
case "$1" in
    "list")
        list_droplets
        ;;
    "create")
        create_droplet
        ;;
    "info")
        get_droplet_info "$2"
        ;;
    "ip")
        get_droplet_ip "$2"
        ;;
    *)
        echo "Usage: $0 {list|create|info|ip} [droplet_id]"
        echo ""
        echo "Commands:"
        echo "  list     - List all droplets"
        echo "  create   - Create a new BioSearch2 droplet"
        echo "  info     - Get information about a specific droplet"
        echo "  ip       - Get the public IP of a droplet"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 create"
        echo "  $0 info 12345678"
        echo "  $0 ip 12345678"
        exit 1
        ;;
esac
