#!/bin/bash

# Fix Deployment Issues Script
# This script fixes common issues after initial deployment attempt

set -e

DROPLET_IP="${DROPLET_IP:-64.226.117.67}"
DROPLET_USER="${DROPLET_USER:-linkuup}"

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

print_status "Fixing deployment issues on $DROPLET_USER@$DROPLET_IP"

# Fix 1: Configure passwordless sudo
print_status "Configuring passwordless sudo for $DROPLET_USER..."
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
    # Add passwordless sudo (this requires current password or root access)
    echo "$USER ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/$USER
    sudo chmod 440 /etc/sudoers.d/$USER
    echo "Passwordless sudo configured"
EOF

# Fix 2: Set up GitHub SSH access
print_status "Setting up GitHub SSH access..."
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
    # Add GitHub to known_hosts
    mkdir -p ~/.ssh
    ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null || true
    
    # Check if we have an SSH key
    if [ ! -f ~/.ssh/id_ed25519 ] && [ ! -f ~/.ssh/id_rsa ]; then
        print_warning "No SSH key found. Generating one..."
        ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "linkuup-deploy@server"
        echo "SSH key generated. Add this to GitHub:"
        cat ~/.ssh/id_ed25519.pub
    else
        echo "SSH key already exists"
        if [ -f ~/.ssh/id_ed25519.pub ]; then
            echo "Your public key:"
            cat ~/.ssh/id_ed25519.pub
        elif [ -f ~/.ssh/id_rsa.pub ]; then
            echo "Your public key:"
            cat ~/.ssh/id_rsa.pub
        fi
    fi
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/* 2>/dev/null || true
EOF

print_warning "If you need to add SSH key to GitHub:"
print_warning "1. Copy the public key shown above"
print_warning "2. Go to https://github.com/settings/keys"
print_warning "3. Click 'New SSH key' and paste it"
print_warning ""
read -p "Press Enter after adding the key to GitHub (or if already added)..."

# Fix 3: Install dependencies
print_status "Installing system dependencies..."
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install Node.js 20 (LTS)
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install Python 3.11+ and venv
    sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
    
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

# Fix 4: Configure PostgreSQL
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

print_status "All fixes applied! You can now run the deployment script again."
print_warning "If GitHub access still fails, you may need to use HTTPS instead:"
print_warning "  REPO_URL=https://github.com/cetler74/linkuup.git ./scripts/deploy_to_digital_ocean.sh"

