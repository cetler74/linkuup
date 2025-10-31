#!/bin/bash

# Deployment Script for BioSearch2 to Hostinger
# Server IP: 147.93.89.178

set -e

# Configuration
HOSTINGER_IP="147.93.89.178"
HOSTINGER_USER="root"  # Update with your Hostinger SSH username
APP_NAME="BioSearch2"
APP_DIR="/var/www/biosearch2"  # Update with your preferred directory

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

# Test SSH connection
test_ssh_connection() {
    print_status "Testing SSH connection to $HOSTINGER_IP..."
    if ! ssh -o ConnectTimeout=10 $HOSTINGER_USER@$HOSTINGER_IP exit 2>/dev/null; then
        print_error "Cannot connect to $HOSTINGER_IP as $HOSTINGER_USER"
        print_error "Please ensure SSH key is properly configured"
        print_error "You may need to add your SSH key: ssh-copy-id $HOSTINGER_USER@$HOSTINGER_IP"
        exit 1
    fi
    print_status "✅ SSH connection successful"
}

# Install dependencies on server
install_dependencies() {
    print_header "Installing system dependencies..."
    ssh $HOSTINGER_USER@$HOSTINGER_IP << 'EOF'
        # Update package list
        sudo apt-get update
        
        # Install Python and required packages
        sudo apt-get install -y python3 python3-pip python3-venv
        
        # Install Node.js and npm (using NodeSource)
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        # Install nginx for serving frontend
        sudo apt-get install -y nginx
        
        # Install PostgreSQL (optional, if using PostgreSQL)
        # sudo apt-get install -y postgresql postgresql-contrib
        
        echo "Dependencies installed successfully"
EOF
    print_status "✅ Dependencies installed"
}

# Deploy application code
deploy_application() {
    print_header "Deploying application code..."
    
    # Build frontend locally
    print_status "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    
    # Create directory on server
    ssh $HOSTINGER_USER@$HOSTINGER_IP "mkdir -p $APP_DIR"
    
    # Copy files to server
    print_status "Uploading files to server..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude 'venv' \
        --exclude '.env' \
        --exclude 'backend/token.json' \
        ./ $HOSTINGER_USER@$HOSTINGER_IP:$APP_DIR/
    
    print_status "✅ Files uploaded"
}

# Setup Python environment on server
setup_python_env() {
    print_header "Setting up Python environment..."
    ssh $HOSTINGER_USER@$HOSTINGER_IP << EOF
        cd $APP_DIR
        
        # Create virtual environment
        python3 -m venv venv
        
        # Install Python dependencies
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r backend/requirements.txt
        
        echo "Python environment setup complete"
EOF
    print_status "✅ Python environment ready"
}

# Configure nginx
configure_nginx() {
    print_header "Configuring nginx..."
    ssh $HOSTINGER_USER@$HOSTINGER_IP << 'EOF'
        cat > /tmp/biosearch2_nginx.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name 147.93.89.178;  # Update with your domain if you have one

    # Frontend - serve static files
    location / {
        root /var/www/biosearch2/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploaded images
    location /uploads {
        alias /var/www/biosearch2/backend/uploads;
        autoindex off;
    }
}
NGINX_EOF

        # Move config to nginx sites-available
        sudo mv /tmp/biosearch2_nginx.conf /etc/nginx/sites-available/biosearch2
        
        # Enable the site
        sudo ln -sf /etc/nginx/sites-available/biosearch2 /etc/nginx/sites-enabled/biosearch2
        
        # Remove default site if exists
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Test nginx configuration
        sudo nginx -t
        
        # Reload nginx
        sudo systemctl reload nginx
        
        echo "Nginx configured and reloaded"
EOF
    print_status "✅ Nginx configured"
}

# Setup systemd service for backend
setup_systemd_service() {
    print_header "Setting up systemd service..."
    ssh $HOSTINGER_USER@$HOSTINGER_IP << 'EOF'
        cat > /tmp/biosearch2.service << 'SERVICE_EOF'
[Unit]
Description=BioSearch2 Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/biosearch2
Environment="PATH=/var/www/biosearch2/venv/bin"
Environment="FLASK_APP=backend/app.py"
Environment="FLASK_ENV=production"
EnvironmentFile=/var/www/biosearch2/backend/.env.production
ExecStart=/var/www/biosearch2/venv/bin/python3 backend/app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

        # Move service file
        sudo mv /tmp/biosearch2.service /etc/systemd/system/biosearch2.service
        
        # Reload systemd
        sudo systemctl daemon-reload
        
        # Enable and start service
        sudo systemctl enable biosearch2
        sudo systemctl restart biosearch2
        
        echo "Systemd service configured and started"
EOF
    print_status "✅ Systemd service configured"
}

# Create production environment file reminder
create_env_reminder() {
    print_warning "⚠️  IMPORTANT: You need to create the production environment file on the server!"
    print_warning "Run the following commands on your Hostinger server:"
    echo ""
    echo "  ssh $HOSTINGER_USER@$HOSTINGER_IP"
    echo "  cd $APP_DIR/backend"
    echo "  nano .env.production"
    echo ""
    print_warning "Copy the contents from backend/.env.production.example and update with your actual values"
    echo ""
}

# Test deployment
test_deployment() {
    print_header "Testing deployment..."
    sleep 5
    
    # Test backend health
    if curl -f http://$HOSTINGER_IP/api/health > /dev/null 2>&1; then
        print_status "✅ Backend is responding"
    else
        print_warning "⚠️ Backend may not be responding yet"
        print_warning "Check logs with: ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo journalctl -u biosearch2 -n 50'"
    fi
    
    # Test frontend
    if curl -f http://$HOSTINGER_IP > /dev/null 2>&1; then
        print_status "✅ Frontend is responding"
    else
        print_warning "⚠️ Frontend may not be responding yet"
    fi
}

# Main deployment function
main() {
    print_header "🚀 Starting BioSearch2 deployment to Hostinger..."
    print_status "Target: $HOSTINGER_USER@$HOSTINGER_IP"
    print_status "App Directory: $APP_DIR"
    echo ""
    
    # Check if this is first deployment
    read -p "Is this your first deployment? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_ssh_connection
        install_dependencies
        deploy_application
        setup_python_env
        configure_nginx
        setup_systemd_service
        create_env_reminder
    else
        test_ssh_connection
        deploy_application
        ssh $HOSTINGER_USER@$HOSTINGER_IP "sudo systemctl restart biosearch2"
        ssh $HOSTINGER_USER@$HOSTINGER_IP "sudo systemctl reload nginx"
    fi
    
    test_deployment
    
    print_header "🎉 Deployment completed!"
    print_status "Your application is available at:"
    print_status "  http://$HOSTINGER_IP"
    echo ""
    print_status "Useful commands:"
    print_status "  Check backend logs: ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo journalctl -u biosearch2 -f'"
    print_status "  Check nginx logs: ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo tail -f /var/log/nginx/error.log'"
    print_status "  Restart backend: ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo systemctl restart biosearch2'"
    print_status "  Restart nginx: ssh $HOSTINGER_USER@$HOSTINGER_IP 'sudo systemctl restart nginx'"
    echo ""
}

# Run main function
main "$@"

