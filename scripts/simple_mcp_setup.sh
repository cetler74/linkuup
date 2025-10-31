#!/bin/bash

# Simple MCP Digital Ocean Setup Script
# This script sets up the MCP integration with Digital Ocean

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

# Install MCP Digital Ocean server
install_mcp_server() {
    print_header "Installing MCP Digital Ocean server..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Install the MCP Digital Ocean server
    npm install -g @modelcontextprotocol/server-digitalocean
    
    print_status "MCP Digital Ocean server installed successfully"
}

# Create MCP configuration directory
create_mcp_config() {
    print_header "Creating MCP configuration..."
    
    # Create .mcp directory in home
    mkdir -p ~/.mcp
    
    # Create MCP configuration file
    cat > ~/.mcp/config.json << 'EOF'
{
  "mcpServers": {
    "digitalocean": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-digitalocean"
      ],
      "env": {
        "DIGITALOCEAN_API_TOKEN": "${DIGITALOCEAN_API_TOKEN}"
      }
    }
  }
}
EOF
    
    print_status "MCP configuration created at ~/.mcp/config.json"
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

# Test the setup
test_setup() {
    print_header "Testing MCP setup..."
    
    # Test API token
    if curl -s -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" "https://api.digitalocean.com/v2/account" > /dev/null; then
        print_status "API token test passed"
    else
        print_error "API token test failed"
        exit 1
    fi
    
    # Test MCP server
    if npx @modelcontextprotocol/server-digitalocean --help &> /dev/null; then
        print_status "MCP server test passed"
    else
        print_error "MCP server test failed"
        exit 1
    fi
    
    print_status "All tests passed!"
}

# Main setup function
main() {
    print_header "Setting up Digital Ocean MCP integration for BioSearch2..."
    
    check_api_token
    install_mcp_server
    create_mcp_config
    create_env_template
    test_setup
    
    print_status "Digital Ocean MCP setup completed successfully!"
    print_warning "Next steps:"
    print_warning "1. Update .env.digitalocean with your actual values"
    print_warning "2. Deploy your application: ./scripts/mcp_deploy.sh"
}

# Run main function
main "$@"
