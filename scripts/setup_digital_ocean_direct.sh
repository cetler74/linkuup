#!/bin/bash

# Direct Digital Ocean Setup Script
# This script sets up Digital Ocean integration without MCP

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
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if Digital Ocean API token is set
check_api_token() {
    if [ -z "$DIGITALOCEAN_API_TOKEN" ]; then
        print_error "DIGITALOCEAN_API_TOKEN environment variable is not set"
        print_error "Please set your Digital Ocean API token:"
        print_error "export DIGITALOCEAN_API_TOKEN='your_api_token_here'"
        exit 1
    fi
    print_status "Digital Ocean API token is configured"
}

# Test API connection
test_api_connection() {
    print_header "Testing Digital Ocean API connection..."
    
    # Test API connection
    RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_response.json \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/account")
    
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "API connection successful"
        ACCOUNT_INFO=$(cat /tmp/api_response.json | jq -r '.account.email')
        print_status "Connected to account: $ACCOUNT_INFO"
        rm -f /tmp/api_response.json
        return 0
    else
        print_error "API connection failed (HTTP $HTTP_CODE)"
        return 1
    fi
}

# Check required tools
check_required_tools() {
    print_header "Checking required tools..."
    
    local tools_ok=true
    
    # Check jq
    if command -v jq &> /dev/null; then
        print_status "jq is installed"
    else
        print_error "jq is not installed. Please install jq first."
        print_error "macOS: brew install jq"
        print_error "Ubuntu: sudo apt install jq"
        tools_ok=false
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        print_status "curl is installed"
    else
        print_error "curl is not installed"
        tools_ok=false
    fi
    
    if [ "$tools_ok" = false ]; then
        exit 1
    fi
}

# Create environment file template
create_env_template() {
    print_header "Creating environment template..."
    
    cat > .env.digitalocean << 'EOF'
# Digital Ocean Configuration
DIGITALOCEAN_API_TOKEN=your_digital_ocean_api_token_here

# Droplet Configuration (start small for validation)
DROPLET_NAME=biosearch2-dev
DROPLET_SIZE=s-1vcpu-1gb
DROPLET_REGION=nyc1
DROPLET_IMAGE=ubuntu-22-04-x64

# Application Configuration
REPO_URL=https://github.com/cetler74/BioSearch2.git
APP_DOMAIN=your-domain.com
APP_EMAIL=your-email@example.com

# Database Configuration
DB_NAME=biosearch_db
DB_USER=biosearch_user
DB_PASSWORD=your_secure_database_password

# SSL Configuration
SSL_EMAIL=your-email@example.com
EOF
    
    print_status "Environment template created at .env.digitalocean"
    print_warning "Please update .env.digitalocean with your actual values"
}

# Create droplet management script
create_droplet_manager() {
    print_header "Creating droplet management script..."
    
    cat > scripts/droplet_manager.sh << 'EOF'
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
EOF
    
    chmod +x scripts/droplet_manager.sh
    print_status "Droplet manager script created"
}

# Test the setup
test_setup() {
    print_header "Testing Digital Ocean setup..."
    
    # Test API connection
    if test_api_connection; then
        print_status "API connection test passed"
    else
        print_error "API connection test failed"
        exit 1
    fi
    
    # Test droplet listing
    if ./scripts/droplet_manager.sh list &> /dev/null; then
        print_status "Droplet management test passed"
    else
        print_warning "Droplet management test failed (this is normal if no droplets exist)"
    fi
    
    print_status "All tests passed!"
}

# Main setup function
main() {
    print_header "Setting up Digital Ocean integration for BioSearch2..."
    
    check_api_token
    check_required_tools
    test_api_connection
    create_env_template
    create_droplet_manager
    test_setup
    
    print_status "Digital Ocean setup completed successfully!"
    print_warning "Next steps:"
    print_warning "1. Update .env.digitalocean with your actual values"
    print_warning "2. Deploy your application: ./scripts/deploy_to_digital_ocean.sh"
    print_warning "3. Manage droplets: ./scripts/droplet_manager.sh list"
}

# Run main function
main "$@"
