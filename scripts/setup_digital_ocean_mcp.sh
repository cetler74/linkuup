#!/bin/bash

# Digital Ocean MCP Setup Script for BioSearch2
# This script sets up the Model Context Protocol (MCP) integration with Digital Ocean

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
        print_error ""
        print_error "You can get your API token from: https://cloud.digitalocean.com/account/api/tokens"
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

# Create MCP helper scripts
create_helper_scripts() {
    print_header "Creating MCP helper scripts..."
    
    # Create droplet management script
    cat > scripts/mcp_droplet_manager.sh << 'EOF'
#!/bin/bash

# MCP Digital Ocean Droplet Manager
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
            \"user_data\": null,
            \"private_networking\": null,
            \"volumes\": null,
            \"tags\": [\"biosearch2\", \"production\"]
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

# Function to destroy droplet
destroy_droplet() {
    local droplet_id=$1
    if [ -z "$droplet_id" ]; then
        print_error "Droplet ID is required"
        exit 1
    fi
    
    print_warning "This will permanently destroy droplet ID: $droplet_id"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_status "Destroying droplet..."
        curl -X DELETE \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
            "https://api.digitalocean.com/v2/droplets/$droplet_id"
        print_status "Droplet destroyed successfully"
    else
        print_status "Operation cancelled"
    fi
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
    "destroy")
        destroy_droplet "$2"
        ;;
    "ip")
        get_droplet_ip "$2"
        ;;
    *)
        echo "Usage: $0 {list|create|info|destroy|ip} [droplet_id]"
        echo ""
        echo "Commands:"
        echo "  list     - List all droplets"
        echo "  create   - Create a new BioSearch2 droplet"
        echo "  info     - Get information about a specific droplet"
        echo "  destroy  - Destroy a droplet (requires confirmation)"
        echo "  ip       - Get the public IP of a droplet"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 create"
        echo "  $0 info 12345678"
        echo "  $0 ip 12345678"
        echo "  $0 destroy 12345678"
        exit 1
        ;;
esac
EOF
    
    chmod +x scripts/mcp_droplet_manager.sh
    
    # Create deployment automation script
    cat > scripts/mcp_deploy.sh << 'EOF'
#!/bin/bash

# MCP Automated Deployment Script for BioSearch2
# This script automates the entire deployment process using MCP

set -e

# Load environment variables
if [ -f .env.digitalocean ]; then
    export $(cat .env.digitalocean | grep -v '^#' | xargs)
fi

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

# Check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    
    if [ -z "$DIGITALOCEAN_API_TOKEN" ]; then
        print_error "DIGITALOCEAN_API_TOKEN is not set"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install jq first."
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Create droplet if it doesn't exist
ensure_droplet_exists() {
    print_header "Ensuring droplet exists..."
    
    # Check if droplet already exists
    DROPLET_ID=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets" | \
        jq -r ".droplets[] | select(.name == \"$DROPLET_NAME\") | .id")
    
    if [ -n "$DROPLET_ID" ] && [ "$DROPLET_ID" != "null" ]; then
        print_status "Droplet already exists with ID: $DROPLET_ID"
        DROPLET_IP=$(curl -s -X GET \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
            "https://api.digitalocean.com/v2/droplets/$DROPLET_ID" | \
            jq -r '.droplet.networks.v4[0].ip_address')
        print_status "Droplet IP: $DROPLET_IP"
    else
        print_status "Creating new droplet..."
        DROPLET_RESPONSE=$(curl -s -X POST \
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
            "https://api.digitalocean.com/v2/droplets")
        
        DROPLET_ID=$(echo "$DROPLET_RESPONSE" | jq -r '.droplet.id')
        print_status "Droplet created with ID: $DROPLET_ID"
        
        # Wait for droplet to be ready
        print_status "Waiting for droplet to be ready..."
        while true; do
            STATUS=$(curl -s -X GET \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
                "https://api.digitalocean.com/v2/droplets/$DROPLET_ID" | \
                jq -r '.droplet.status')
            
            if [ "$STATUS" = "active" ]; then
                break
            fi
            
            print_status "Droplet status: $STATUS. Waiting..."
            sleep 10
        done
        
        # Get droplet IP
        DROPLET_IP=$(curl -s -X GET \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
            "https://api.digitalocean.com/v2/droplets/$DROPLET_ID" | \
            jq -r '.droplet.networks.v4[0].ip_address')
        
        print_status "Droplet is ready! IP: $DROPLET_IP"
    fi
    
    export DROPLET_ID
    export DROPLET_IP
}

# Deploy application
deploy_application() {
    print_header "Deploying application to droplet..."
    
    if [ -z "$DROPLET_IP" ]; then
        print_error "DROPLET_IP is not set"
        exit 1
    fi
    
    # Run the existing deployment script
    DROPLET_IP="$DROPLET_IP" ./scripts/deploy_to_digital_ocean.sh
    
    print_status "Application deployed successfully"
}

# Setup SSL certificate
setup_ssl() {
    print_header "Setting up SSL certificate..."
    
    if [ -z "$DROPLET_IP" ] || [ -z "$APP_DOMAIN" ]; then
        print_warning "Skipping SSL setup - DROPLET_IP or APP_DOMAIN not set"
        return
    fi
    
    print_status "Setting up SSL certificate for $APP_DOMAIN"
    
    ssh biosearch@$DROPLET_IP << EOF
        # Install Certbot
        sudo apt install -y certbot python3-certbot-nginx
        
        # Get SSL certificate
        sudo certbot --nginx -d $APP_DOMAIN -d www.$APP_DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL
        
        # Test automatic renewal
        sudo certbot renew --dry-run
EOF
    
    print_status "SSL certificate setup completed"
}

# Main deployment function
main() {
    print_header "Starting MCP automated deployment..."
    
    check_prerequisites
    ensure_droplet_exists
    deploy_application
    setup_ssl
    
    print_status "Deployment completed successfully!"
    print_status "Your application is accessible at:"
    if [ -n "$APP_DOMAIN" ]; then
        print_status "  https://$APP_DOMAIN"
    fi
    print_status "  http://$DROPLET_IP"
}

# Run main function
main "$@"
EOF
    
    chmod +x scripts/mcp_deploy.sh
    
    print_status "MCP helper scripts created successfully"
}

# Create monitoring script
create_monitoring_script() {
    print_header "Creating monitoring script..."
    
    cat > scripts/mcp_monitor.sh << 'EOF'
#!/bin/bash

# MCP Digital Ocean Monitoring Script
# This script monitors your BioSearch2 droplet and application

set -e

# Load environment variables
if [ -f .env.digitalocean ]; then
    export $(cat .env.digitalocean | grep -v '^#' | xargs)
fi

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
    echo -e "${BLUE}[MONITOR]${NC} $1"
}

# Get droplet status
get_droplet_status() {
    print_header "Checking droplet status..."
    
    # Get droplet ID
    DROPLET_ID=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets" | \
        jq -r ".droplets[] | select(.name == \"$DROPLET_NAME\") | .id")
    
    if [ -z "$DROPLET_ID" ] || [ "$DROPLET_ID" = "null" ]; then
        print_error "Droplet not found"
        return 1
    fi
    
    # Get droplet information
    DROPLET_INFO=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets/$DROPLET_ID")
    
    STATUS=$(echo "$DROPLET_INFO" | jq -r '.droplet.status')
    IP=$(echo "$DROPLET_INFO" | jq -r '.droplet.networks.v4[0].ip_address')
    MEMORY=$(echo "$DROPLET_INFO" | jq -r '.droplet.memory')
    VCPUS=$(echo "$DROPLET_INFO" | jq -r '.droplet.vcpus')
    DISK=$(echo "$DROPLET_INFO" | jq -r '.droplet.disk')
    
    print_status "Droplet Status: $STATUS"
    print_status "IP Address: $IP"
    print_status "Memory: ${MEMORY}MB"
    print_status "vCPUs: $VCPUS"
    print_status "Disk: ${DISK}GB"
    
    if [ "$STATUS" != "active" ]; then
        print_warning "Droplet is not active!"
        return 1
    fi
    
    export DROPLET_IP="$IP"
}

# Check application health
check_application_health() {
    print_header "Checking application health..."
    
    if [ -z "$DROPLET_IP" ]; then
        print_error "DROPLET_IP is not set"
        return 1
    fi
    
    # Check if application is responding
    if curl -s -f "http://$DROPLET_IP/api/health" > /dev/null; then
        print_status "Application is healthy"
    else
        print_error "Application is not responding"
        return 1
    fi
}

# Check system resources
check_system_resources() {
    print_header "Checking system resources..."
    
    if [ -z "$DROPLET_IP" ]; then
        print_error "DROPLET_IP is not set"
        return 1
    fi
    
    ssh biosearch@$DROPLET_IP << 'EOF'
        echo "=== System Resources ==="
        echo "CPU Usage:"
        top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
        
        echo "Memory Usage:"
        free -h
        
        echo "Disk Usage:"
        df -h
        
        echo "=== Application Status ==="
        pm2 status
        
        echo "=== Nginx Status ==="
        sudo systemctl status nginx --no-pager -l
        
        echo "=== PostgreSQL Status ==="
        sudo systemctl status postgresql --no-pager -l
EOF
}

# Main monitoring function
main() {
    print_header "Starting monitoring check..."
    
    if get_droplet_status; then
        check_application_health
        check_system_resources
        print_status "All checks completed successfully"
    else
        print_error "Monitoring check failed"
        exit 1
    fi
}

# Run main function
main "$@"
EOF
    
    chmod +x scripts/mcp_monitor.sh
    
    print_status "Monitoring script created successfully"
}

# Create backup script
create_backup_script() {
    print_header "Creating backup script..."
    
    cat > scripts/mcp_backup.sh << 'EOF'
#!/bin/bash

# MCP Digital Ocean Backup Script
# This script creates backups of your BioSearch2 application and database

set -e

# Load environment variables
if [ -f .env.digitalocean ]; then
    export $(cat .env.digitalocean | grep -v '^#' | xargs)
fi

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
    echo -e "${BLUE}[BACKUP]${NC} $1"
}

# Get droplet IP
get_droplet_ip() {
    DROPLET_ID=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets" | \
        jq -r ".droplets[] | select(.name == \"$DROPLET_NAME\") | .id")
    
    if [ -z "$DROPLET_ID" ] || [ "$DROPLET_ID" = "null" ]; then
        print_error "Droplet not found"
        exit 1
    fi
    
    DROPLET_IP=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets/$DROPLET_ID" | \
        jq -r '.droplet.networks.v4[0].ip_address')
    
    export DROPLET_IP
}

# Create database backup
backup_database() {
    print_header "Creating database backup..."
    
    if [ -z "$DROPLET_IP" ]; then
        print_error "DROPLET_IP is not set"
        exit 1
    fi
    
    BACKUP_FILE="biosearch_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    ssh biosearch@$DROPLET_IP << EOF
        # Create database backup
        pg_dump -h localhost -U $DB_USER $DB_NAME > /tmp/$BACKUP_FILE
        
        # Compress backup
        gzip /tmp/$BACKUP_FILE
        
        echo "Database backup created: /tmp/${BACKUP_FILE}.gz"
EOF
    
    # Download backup to local machine
    scp biosearch@$DROPLET_IP:/tmp/${BACKUP_FILE}.gz ./database_backups/
    
    print_status "Database backup downloaded to ./database_backups/${BACKUP_FILE}.gz"
}

# Create application backup
backup_application() {
    print_header "Creating application backup..."
    
    if [ -z "$DROPLET_IP" ]; then
        print_error "DROPLET_IP is not set"
        exit 1
    fi
    
    BACKUP_FILE="biosearch_app_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    ssh biosearch@$DROPLET_IP << EOF
        # Create application backup
        tar -czf /tmp/$BACKUP_FILE -C /home/biosearch BioSearch2
        
        echo "Application backup created: /tmp/$BACKUP_FILE"
EOF
    
    # Download backup to local machine
    scp biosearch@$DROPLET_IP:/tmp/$BACKUP_FILE ./database_backups/
    
    print_status "Application backup downloaded to ./database_backups/$BACKUP_FILE"
}

# Create droplet snapshot
create_snapshot() {
    print_header "Creating droplet snapshot..."
    
    DROPLET_ID=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        "https://api.digitalocean.com/v2/droplets" | \
        jq -r ".droplets[] | select(.name == \"$DROPLET_NAME\") | .id")
    
    if [ -z "$DROPLET_ID" ] || [ "$DROPLET_ID" = "null" ]; then
        print_error "Droplet not found"
        exit 1
    fi
    
    SNAPSHOT_NAME="biosearch2-snapshot-$(date +%Y%m%d-%H%M%S)"
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
        -d "{
            \"type\": \"snapshot\",
            \"name\": \"$SNAPSHOT_NAME\"
        }" \
        "https://api.digitalocean.com/v2/droplets/$DROPLET_ID/actions"
    
    print_status "Droplet snapshot created: $SNAPSHOT_NAME"
}

# Main backup function
main() {
    print_header "Starting backup process..."
    
    get_droplet_ip
    backup_database
    backup_application
    create_snapshot
    
    print_status "Backup process completed successfully"
}

# Run main function
main "$@"
EOF
    
    chmod +x scripts/mcp_backup.sh
    
    print_status "Backup script created successfully"
}

# Main setup function
main() {
    print_header "Setting up Digital Ocean MCP integration for BioSearch2..."
    
    check_api_token
    install_mcp_server
    create_mcp_config
    create_env_template
    create_helper_scripts
    create_monitoring_script
    create_backup_script
    
    print_status "Digital Ocean MCP setup completed successfully!"
    print_warning "Next steps:"
    print_warning "1. Update .env.digitalocean with your actual values"
    print_warning "2. Test the MCP integration: ./scripts/mcp_droplet_manager.sh list"
    print_warning "3. Deploy your application: ./scripts/mcp_deploy.sh"
    print_warning "4. Monitor your deployment: ./scripts/mcp_monitor.sh"
    print_warning "5. Create backups: ./scripts/mcp_backup.sh"
}

# Run main function
main "$@"
