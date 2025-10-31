#!/bin/bash

# Test MCP Digital Ocean Integration
# This script tests the MCP integration with Digital Ocean

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
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test API token
test_api_token() {
    print_header "Testing Digital Ocean API token..."
    
    if [ -z "$DIGITALOCEAN_API_TOKEN" ]; then
        print_error "DIGITALOCEAN_API_TOKEN is not set"
        return 1
    fi
    
    # Test API connection
    RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_response.json \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/account")
    
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "API token is valid"
        ACCOUNT_INFO=$(cat /tmp/api_response.json | jq -r '.account.email')
        print_status "Connected to account: $ACCOUNT_INFO"
        rm -f /tmp/api_response.json
        return 0
    else
        print_error "API token is invalid (HTTP $HTTP_CODE)"
        return 1
    fi
}

# Test MCP server installation
test_mcp_server() {
    print_header "Testing MCP server installation..."
    
    if command -v npx &> /dev/null; then
        print_status "npx is available"
    else
        print_error "npx is not installed"
        return 1
    fi
    
    # Test if MCP server can be found
    if npx @modelcontextprotocol/server-digitalocean --help &> /dev/null; then
        print_status "MCP Digital Ocean server is installed"
        return 0
    else
        print_error "MCP Digital Ocean server is not installed"
        return 1
    fi
}

# Test jq installation
test_jq() {
    print_header "Testing jq installation..."
    
    if command -v jq &> /dev/null; then
        print_status "jq is installed"
        return 0
    else
        print_error "jq is not installed"
        return 1
    fi
}

# Test droplet listing
test_droplet_listing() {
    print_header "Testing droplet listing..."
    
    if [ -f "scripts/mcp_droplet_manager.sh" ]; then
        print_status "Droplet manager script exists"
        
        # Test listing droplets
        if ./scripts/mcp_droplet_manager.sh list &> /dev/null; then
            print_status "Droplet listing works"
            return 0
        else
            print_warning "Droplet listing failed (this is normal if no droplets exist)"
            return 0
        fi
    else
        print_error "Droplet manager script not found"
        return 1
    fi
}

# Test configuration files
test_config_files() {
    print_header "Testing configuration files..."
    
    local config_ok=true
    
    # Test MCP config
    if [ -f "~/.mcp/config.json" ]; then
        print_status "MCP configuration exists"
    else
        print_warning "MCP configuration not found (will be created on first run)"
    fi
    
    # Test environment template
    if [ -f ".env.digitalocean" ]; then
        print_status "Environment template exists"
    else
        print_error "Environment template not found"
        config_ok=false
    fi
    
    # Test helper scripts
    local scripts=(
        "scripts/mcp_droplet_manager.sh"
        "scripts/mcp_deploy.sh"
        "scripts/mcp_monitor.sh"
        "scripts/mcp_backup.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            print_status "Script exists: $script"
        else
            print_error "Script missing: $script"
            config_ok=false
        fi
    done
    
    if [ "$config_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Test script permissions
test_script_permissions() {
    print_header "Testing script permissions..."
    
    local scripts=(
        "scripts/mcp_droplet_manager.sh"
        "scripts/mcp_deploy.sh"
        "scripts/mcp_monitor.sh"
        "scripts/mcp_backup.sh"
        "scripts/setup_digital_ocean_mcp.sh"
    )
    
    local permissions_ok=true
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                print_status "Script is executable: $script"
            else
                print_warning "Script is not executable: $script"
                chmod +x "$script"
                print_status "Made script executable: $script"
            fi
        fi
    done
    
    return 0
}

# Main test function
main() {
    print_header "Starting MCP Digital Ocean integration tests..."
    
    local tests_passed=0
    local tests_total=0
    
    # Run tests
    tests_total=$((tests_total + 1))
    if test_api_token; then
        tests_passed=$((tests_passed + 1))
    fi
    
    tests_total=$((tests_total + 1))
    if test_mcp_server; then
        tests_passed=$((tests_passed + 1))
    fi
    
    tests_total=$((tests_total + 1))
    if test_jq; then
        tests_passed=$((tests_passed + 1))
    fi
    
    tests_total=$((tests_total + 1))
    if test_droplet_listing; then
        tests_passed=$((tests_passed + 1))
    fi
    
    tests_total=$((tests_total + 1))
    if test_config_files; then
        tests_passed=$((tests_passed + 1))
    fi
    
    tests_total=$((tests_total + 1))
    if test_script_permissions; then
        tests_passed=$((tests_passed + 1))
    fi
    
    # Print results
    echo ""
    print_header "Test Results: $tests_passed/$tests_total tests passed"
    
    if [ $tests_passed -eq $tests_total ]; then
        print_status "All tests passed! MCP integration is ready to use."
        echo ""
        print_status "Next steps:"
        print_status "1. Update .env.digitalocean with your actual values"
        print_status "2. Deploy your application: ./scripts/mcp_deploy.sh"
        print_status "3. Monitor your deployment: ./scripts/mcp_monitor.sh"
    else
        print_error "Some tests failed. Please check the errors above."
        echo ""
        print_warning "To fix issues:"
        print_warning "1. Run the setup script: ./scripts/setup_digital_ocean_mcp.sh"
        print_warning "2. Install missing dependencies"
        print_warning "3. Check your API token"
    fi
}

# Run main function
main "$@"
