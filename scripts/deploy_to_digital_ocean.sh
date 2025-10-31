#!/bin/bash

# BioSearch2 Digital Ocean Deployment Script
# This script automates the deployment process to a Digital Ocean droplet

set -e  # Exit on any error

# Configuration
DROPLET_IP="${DROPLET_IP:-}"
DROPLET_USER="${DROPLET_USER:-biosearch}"
APP_NAME="BioSearch2"
REPO_URL="${REPO_URL:-https://github.com/your-username/BioSearch2.git}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if required variables are set
check_requirements() {
    if [ -z "$DROPLET_IP" ]; then
        print_error "DROPLET_IP environment variable is required"
        print_error "Usage: DROPLET_IP=your.droplet.ip ./scripts/deploy_to_digital_ocean.sh"
        exit 1
    fi
}

# Test SSH connection
test_ssh_connection() {
    print_status "Testing SSH connection to $DROPLET_IP..."
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $DROPLET_USER@$DROPLET_IP exit 2>/dev/null; then
        print_error "Cannot connect to $DROPLET_IP as $DROPLET_USER"
        print_error "Please ensure:"
        print_error "1. SSH key is properly configured"
        print_error "2. Droplet is running"
        print_error "3. User $DROPLET_USER exists on the droplet"
        exit 1
    fi
    print_status "SSH connection successful"
}

# Install system dependencies
install_system_dependencies() {
    print_status "Installing system dependencies..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        # Update system
        sudo apt update && sudo apt upgrade -y
        
        # Install Node.js 18
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        # Install Python 3.11
        sudo apt install -y python3.11 python3.11-venv python3.11-dev
        
        # Install PostgreSQL
        sudo apt install -y postgresql postgresql-contrib
        
        # Install Nginx
        sudo apt install -y nginx
        
        # Install Git
        sudo apt install -y git
        
        # Install other dependencies
        sudo apt install -y build-essential libpq-dev
        
        # Install PM2 globally
        sudo npm install -g pm2
        
        echo "System dependencies installed successfully"
EOF
}

# Configure PostgreSQL
configure_postgresql() {
    print_status "Configuring PostgreSQL..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        # Create database and user if they don't exist
        sudo -u postgres psql << 'PSQL'
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'biosearch_db') THEN
                    CREATE DATABASE biosearch_db;
                END IF;
            END
            $$;
            
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'biosearch_user') THEN
                    CREATE USER biosearch_user WITH PASSWORD 'biosearch_secure_password_2024';
                    GRANT ALL PRIVILEGES ON DATABASE biosearch_db TO biosearch_user;
                    ALTER USER biosearch_user CREATEDB;
                END IF;
            END
            $$;
PSQL
        
        # Restart PostgreSQL
        sudo systemctl restart postgresql
        echo "PostgreSQL configured successfully"
EOF
}

# Deploy application code
deploy_application() {
    print_status "Deploying application code..."
    ssh $DROPLET_USER@$DROPLET_IP << EOF
        # Clone or update repository
        if [ -d "$APP_NAME" ]; then
            cd $APP_NAME
            git pull origin main
        else
            git clone $REPO_URL $APP_NAME
            cd $APP_NAME
        fi
        
        # Set up Python environment
        if [ ! -d "venv" ]; then
            python3.11 -m venv venv
        fi
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r backend/requirements.txt
        
        # Set up frontend
        cd frontend
        npm install
        npm run build
        cd ..
        
        echo "Application code deployed successfully"
EOF
}

# Configure environment
configure_environment() {
    print_status "Configuring environment..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        cd BioSearch2
        
        # Create production environment file if it doesn't exist
        if [ ! -f ".env" ]; then
            cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://biosearch_user:biosearch_secure_password_2024@localhost:5432/biosearch_db
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=biosearch_production_secret_key_2024_change_this
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_DEFAULT_SENDER=your_email@gmail.com
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
APP_HOST=0.0.0.0
APP_PORT=5001
ENVEOF
            echo "Environment file created. Please update with your actual values."
        fi
        
        echo "Environment configured"
EOF
}

# Set up database
setup_database() {
    print_status "Setting up database..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        cd BioSearch2
        source venv/bin/activate
        
        # Create database tables
        cd backend
        python3 -c "
import sys
sys.path.append('.')
from app import app, db
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"
        
        echo "Database setup completed"
EOF
}

# Configure Nginx
configure_nginx() {
    print_status "Configuring Nginx..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        # Create Nginx configuration
        sudo tee /etc/nginx/sites-available/biosearch > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    
    # Frontend (React build)
    location / {
        root /home/biosearch/BioSearch2/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
NGINXEOF
        
        # Enable the site
        sudo ln -sf /etc/nginx/sites-available/biosearch /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Test and restart Nginx
        sudo nginx -t
        sudo systemctl restart nginx
        
        echo "Nginx configured successfully"
EOF
}

# Set up PM2 process management
setup_pm2() {
    print_status "Setting up PM2 process management..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        cd BioSearch2
        
        # Copy PM2 configuration
        cp ecosystem.config.js ~/
        
        # Stop existing processes
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        
        # Start the application
        pm2 start ~/ecosystem.config.js
        pm2 save
        pm2 startup systemd -u biosearch --hp /home/biosearch
        
        echo "PM2 configured successfully"
EOF
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        # Configure UFW firewall
        sudo ufw --force reset
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 'Nginx Full'
        sudo ufw --force enable
        
        echo "Firewall configured successfully"
EOF
}

# Create log directories
create_log_directories() {
    print_status "Creating log directories..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        sudo mkdir -p /var/log/biosearch
        sudo chown biosearch:biosearch /var/log/biosearch
        sudo chmod 755 /var/log/biosearch
        
        echo "Log directories created"
EOF
}

# Main deployment function
main() {
    print_status "Starting BioSearch2 deployment to Digital Ocean..."
    print_status "Target: $DROPLET_USER@$DROPLET_IP"
    
    check_requirements
    test_ssh_connection
    install_system_dependencies
    configure_postgresql
    deploy_application
    configure_environment
    setup_database
    create_log_directories
    configure_nginx
    setup_pm2
    configure_firewall
    
    print_status "Deployment completed successfully!"
    print_status "Your application should be accessible at: http://$DROPLET_IP"
    print_warning "Next steps:"
    print_warning "1. Update .env file with your actual configuration values"
    print_warning "2. Set up SSL certificate with Let's Encrypt"
    print_warning "3. Configure your domain DNS to point to $DROPLET_IP"
    print_warning "4. Test the application thoroughly"
}

# Run main function
main "$@"
