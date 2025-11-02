#!/bin/bash

# LinkUup Digital Ocean Deployment Script
# This script automates the deployment process to a Digital Ocean droplet

set -e  # Exit on any error

# Configuration
DROPLET_IP="${DROPLET_IP:-64.226.117.67}"
DROPLET_USER="${DROPLET_USER:-linkuup}"
APP_NAME="Linkuup"
# Use HTTPS by default to avoid SSH key issues
REPO_URL="${REPO_URL:-https://github.com/cetler74/linkuup.git}"

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
        print_error "3. User $DROPLET_USER exists on the droplet (will be created if running as root)"
        print_warning "You may need to connect as root first to create the user"
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
        
        # Install Node.js 20 (LTS)
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        # Install Python (Ubuntu 25.04 uses Python 3.13)
        sudo apt install -y python3 python3-venv python3-dev python3-pip
        
        # Install PostgreSQL
        sudo apt install -y postgresql postgresql-contrib
        
        # Install Nginx
        sudo apt install -y nginx
        
        # Install Git
        sudo apt install -y git
        
        # Install other dependencies for Python packages
        sudo apt install -y build-essential libpq-dev pkg-config libffi-dev
        
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
                IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'linkuup_db') THEN
                    CREATE DATABASE linkuup_db;
                END IF;
            END
            $$;
            
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'linkuup_user') THEN
                    CREATE USER linkuup_user WITH PASSWORD 'linkuup_secure_password_2024_change_this';
                    GRANT ALL PRIVILEGES ON DATABASE linkuup_db TO linkuup_user;
                    ALTER USER linkuup_user CREATEDB;
                    ALTER DATABASE linkuup_db OWNER TO linkuup_user;
                END IF;
            END
            $$;
PSQL
        
        # Update pg_hba.conf to allow local connections
        sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf || true
        
        # Restart PostgreSQL
        sudo systemctl restart postgresql
        echo "PostgreSQL configured successfully"
EOF
}

# Deploy application code
deploy_application() {
    print_status "Deploying application code..."
    ssh $DROPLET_USER@$DROPLET_IP << EOF
        # Create app directory
        mkdir -p ~/$APP_NAME
        
        # Clone or update repository
        if [ -d ~/$APP_NAME/.git ]; then
            cd ~/$APP_NAME
            git pull origin main
        else
            cd ~
            if [ -d $APP_NAME ]; then
                rm -rf $APP_NAME
            fi
            git clone $REPO_URL $APP_NAME
            cd $APP_NAME
        fi
        
        # Set up Python environment
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install --upgrade pip setuptools wheel
        pip install -r backend/requirements.txt
        
        # Set up frontend
        cd frontend
        
        # Create production environment file
        cat > .env.production << 'FRONTEND_ENV'
VITE_API_BASE_URL=http://64.226.117.67/api/v1
VITE_GOOGLE_MAPS_API_KEY=
VITE_REVENUECAT_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
FRONTEND_ENV
        
        npm install
        npm run build
        cd ..
        
        echo "Application code deployed successfully"
EOF
}

# Configure environment
configure_environment() {
    print_status "Configuring environment..."
    APP_NAME_VALUE="$APP_NAME"
    ssh $DROPLET_USER@$DROPLET_IP << EOF
        cd ~/$APP_NAME_VALUE/backend
        
        # Create production environment file if it doesn't exist
        if [ ! -f ".env" ]; then
            cat > .env << 'ENVEOF'
# Database Configuration - FastAPI with async SQLAlchemy
DATABASE_URL=postgresql+asyncpg://linkuup_user:linkuup_secure_password_2024_change_this@localhost:5432/linkuup_db

# FastAPI Configuration
SECRET_KEY=linkuup_production_secret_key_2024_change_this_to_very_secure_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS Configuration
BACKEND_CORS_ORIGINS=["http://64.226.117.67","http://localhost:5173","http://localhost:3000"]

# Rate Limiting
RATE_LIMIT_AUTH_LOGIN=5/minute
RATE_LIMIT_AUTH_REGISTER=3/hour
RATE_LIMIT_MOBILE_READ=500/hour
RATE_LIMIT_WRITE=100/hour
RATE_LIMIT_STANDARD=300/hour

# Email Configuration (Brevo)
BREVO_API_KEY=
BREVO_SENDER_EMAIL=noreply@linkuup.com
BREVO_SENDER_NAME=LinkUup

# Stripe Configuration (Production)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC=
STRIPE_PRICE_PRO=

# Server Configuration
HOST=0.0.0.0
PORT=5001
ENVEOF
            echo "Environment file created. Please update with your actual values."
        else
            echo "Environment file already exists. Please verify configuration."
        fi
        
        echo "Environment configured"
EOF
}

# Set up database with Alembic
setup_database() {
    print_status "Setting up database..."
    ssh $DROPLET_USER@$DROPLET_IP << EOF
        cd ~/$APP_NAME/backend
        source ../venv/bin/activate
        
        # Run Alembic migrations
        alembic upgrade head
        
        echo "Database setup completed"
EOF
}

# Configure Nginx
configure_nginx() {
    print_status "Configuring Nginx..."
    NGINX_USER="$DROPLET_USER"
    NGINX_APP="$APP_NAME"
    ssh $DROPLET_USER@$DROPLET_IP << EOF
        # Create Nginx configuration with variable substitution
        cat > /tmp/linkuup_nginx.conf << 'NGINXEOF'
server {
    listen 80;
    server_name 64.226.117.67;
    
    client_max_body_size 20M;
    
    # Frontend (React build)
    location / {
        root /home/NGINX_USER_PLACEHOLDER/NGINX_APP_PLACEHOLDER/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Uploads
    location /uploads/ {
        alias /home/NGINX_USER_PLACEHOLDER/NGINX_APP_PLACEHOLDER/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /home/NGINX_USER_PLACEHOLDER/NGINX_APP_PLACEHOLDER/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
}
NGINXEOF
        # Replace placeholders
        sed -i "s/NGINX_USER_PLACEHOLDER/$NGINX_USER/g" /tmp/linkuup_nginx.conf
        sed -i "s/NGINX_APP_PLACEHOLDER/$NGINX_APP/g" /tmp/linkuup_nginx.conf
        # Copy to nginx sites-available
        sudo cp /tmp/linkuup_nginx.conf /etc/nginx/sites-available/linkuup
        
        # Enable the site
        sudo ln -sf /etc/nginx/sites-available/linkuup /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Test and restart Nginx
        sudo nginx -t
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        
        echo "Nginx configured successfully"
EOF
}

# Set up PM2 process management
setup_pm2() {
    print_status "Setting up PM2 process management..."
    ssh $DROPLET_USER@$DROPLET_IP << EOF
        cd ~/$APP_NAME
        
        # Copy PM2 configuration
        cp ecosystem.config.js ~/ecosystem.config.js
        
        # Update paths in ecosystem.config.js if needed
        sed -i "s|/home/linkuup/Linkuup|/home/$DROPLET_USER/$APP_NAME|g" ~/ecosystem.config.js
        
        # Stop existing processes
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        
        # Start the application
        cd ~
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup systemd -u linkuup --hp /home/linkuup
        
        echo "PM2 configured successfully"
EOF
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
        # Configure UFW firewall
        sudo ufw --force reset || true
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
        sudo mkdir -p /var/log/linkuup
        sudo chown linkuup:linkuup /var/log/linkuup
        sudo chmod 755 /var/log/linkuup
        
        # Create uploads directory
        mkdir -p ~/$APP_NAME/backend/uploads
        mkdir -p ~/$APP_NAME/backend/image_cache
        
        echo "Log and upload directories created"
EOF
}

# Main deployment function
main() {
    print_status "Starting LinkUup deployment to Digital Ocean..."
    print_status "Target: $DROPLET_USER@$DROPLET_IP"
    print_status "Repository: $REPO_URL"
    
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
    print_warning "1. Update backend/.env file with your actual configuration values:"
    print_warning "   - SECRET_KEY (generate a secure random string)"
    print_warning "   - Database password"
    print_warning "   - BREVO_API_KEY (for email)"
    print_warning "   - Stripe keys (if using payments)"
    print_warning "2. Restart the application: ssh $DROPLET_USER@$DROPLET_IP 'pm2 restart linkuup-backend'"
    print_warning "3. Set up SSL certificate with Let's Encrypt (recommended)"
    print_warning "4. Configure your domain DNS to point to $DROPLET_IP (if you have one)"
    print_warning "5. Test the application thoroughly"
}

# Run main function
main "$@"