#!/bin/bash

# SSL Setup Script for BioSearch2 on Digital Ocean
# This script sets up SSL certificates using Let's Encrypt

set -e  # Exit on any error

# Configuration
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

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
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        print_error "DOMAIN and EMAIL environment variables are required"
        print_error "Usage: DOMAIN=your-domain.com EMAIL=your@email.com ./scripts/setup_ssl.sh"
        exit 1
    fi
}

# Install Certbot
install_certbot() {
    print_status "Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
    print_status "Certbot installed successfully"
}

# Get SSL certificate
get_ssl_certificate() {
    print_status "Obtaining SSL certificate for $DOMAIN..."
    
    # Stop Nginx temporarily
    sudo systemctl stop nginx
    
    # Get certificate
    sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    print_status "SSL certificate obtained successfully"
}

# Configure Nginx with SSL
configure_nginx_ssl() {
    print_status "Configuring Nginx with SSL..."
    
    # Create SSL-enabled Nginx configuration
    sudo tee /etc/nginx/sites-available/biosearch > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (React build)
    location / {
        root /home/biosearch/BioSearch2/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Test and restart Nginx
    sudo nginx -t
    sudo systemctl start nginx
    sudo systemctl reload nginx
    
    print_status "Nginx configured with SSL successfully"
}

# Set up automatic renewal
setup_auto_renewal() {
    print_status "Setting up automatic SSL renewal..."
    
    # Test renewal
    sudo certbot renew --dry-run
    
    # Add renewal to crontab
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    print_status "Automatic renewal configured successfully"
}

# Main function
main() {
    print_status "Setting up SSL for BioSearch2..."
    print_status "Domain: $DOMAIN"
    print_status "Email: $EMAIL"
    
    check_requirements
    install_certbot
    get_ssl_certificate
    configure_nginx_ssl
    setup_auto_renewal
    
    print_status "SSL setup completed successfully!"
    print_status "Your application is now accessible at: https://$DOMAIN"
    print_warning "Please update your .env file to use HTTPS URLs in CORS_ORIGIN"
}

# Run main function
main "$@"
