#!/bin/bash

# Monitoring and Backup Setup Script for BioSearch2
# This script sets up comprehensive monitoring and backup procedures

set -e  # Exit on any error

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

# Install monitoring tools
install_monitoring_tools() {
    print_status "Installing monitoring tools..."
    
    # Install htop, iotop, and other system monitoring tools
    apt update
    apt install -y htop iotop nethogs nload fail2ban logrotate
    
    # Install PM2 monitoring
    npm install -g pm2-logrotate
    
    print_status "Monitoring tools installed successfully"
}

# Configure system monitoring
configure_system_monitoring() {
    print_status "Configuring system monitoring..."
    
    # Create system monitoring script
    cat > /home/biosearch/monitor_system.sh << 'EOF'
#!/bin/bash
# System monitoring script for BioSearch2

LOG_FILE="/var/log/biosearch/system_monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log with timestamp
log_message() {
    echo "[$DATE] $1" >> $LOG_FILE
}

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log_message "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 80 ]; then
    log_message "WARNING: Memory usage is ${MEMORY_USAGE}%"
fi

# Check CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_CORES=$(nproc)
if (( $(echo "$CPU_LOAD > $CPU_CORES" | bc -l) )); then
    log_message "WARNING: High CPU load: $CPU_LOAD"
fi

# Check if services are running
if ! systemctl is-active --quiet nginx; then
    log_message "ERROR: Nginx is not running"
fi

if ! systemctl is-active --quiet postgresql; then
    log_message "ERROR: PostgreSQL is not running"
fi

if ! pgrep -f "pm2" > /dev/null; then
    log_message "ERROR: PM2 is not running"
fi

# Check application health
if ! curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
    log_message "ERROR: Application health check failed"
fi

log_message "System monitoring check completed"
EOF
    
    chmod +x /home/biosearch/monitor_system.sh
    
    # Add to crontab (every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /home/biosearch/monitor_system.sh") | crontab -
    
    print_status "System monitoring configured"
}

# Configure log rotation
configure_log_rotation() {
    print_status "Configuring log rotation..."
    
    # Create logrotate configuration for BioSearch2
    cat > /etc/logrotate.d/biosearch << 'EOF'
/var/log/biosearch/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 biosearch biosearch
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/home/biosearch/BioSearch2/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 biosearch biosearch
}
EOF
    
    print_status "Log rotation configured"
}

# Configure fail2ban
configure_fail2ban() {
    print_status "Configuring fail2ban..."
    
    # Create fail2ban jail for Nginx
    cat > /etc/fail2ban/jail.d/nginx.conf << 'EOF'
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
    
    # Create fail2ban jail for SSH
    cat > /etc/fail2ban/jail.d/ssh.conf << 'EOF'
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    print_status "Fail2ban configured"
}

# Set up application health monitoring
setup_health_monitoring() {
    print_status "Setting up application health monitoring..."
    
    # Create health check endpoint script
    cat > /home/biosearch/health_check.sh << 'EOF'
#!/bin/bash
# Health check script for BioSearch2

HEALTH_URL="http://localhost:5001/api/health"
LOG_FILE="/var/log/biosearch/health_check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log with timestamp
log_message() {
    echo "[$DATE] $1" >> $LOG_FILE
}

# Check application health
if curl -f -s $HEALTH_URL > /dev/null; then
    log_message "Health check: OK"
    exit 0
else
    log_message "Health check: FAILED"
    
    # Try to restart the application
    pm2 restart biosearch-backend
    sleep 10
    
    # Check again
    if curl -f -s $HEALTH_URL > /dev/null; then
        log_message "Health check: RECOVERED after restart"
        exit 0
    else
        log_message "Health check: CRITICAL - Application not responding"
        exit 1
    fi
fi
EOF
    
    chmod +x /home/biosearch/health_check.sh
    
    # Add to crontab (every 2 minutes)
    (crontab -l 2>/dev/null; echo "*/2 * * * * /home/biosearch/health_check.sh") | crontab -
    
    print_status "Health monitoring configured"
}

# Set up backup procedures
setup_backup_procedures() {
    print_status "Setting up backup procedures..."
    
    # Create comprehensive backup script
    cat > /home/biosearch/full_backup.sh << 'EOF'
#!/bin/bash
# Comprehensive backup script for BioSearch2

BACKUP_DIR="/home/biosearch/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_BASE="$BACKUP_DIR/backup_$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting backup: $DATE"

# Database backup
echo "Backing up database..."
pg_dump -h localhost -U biosearch_user biosearch_db > ${BACKUP_BASE}_database.sql
gzip ${BACKUP_BASE}_database.sql

# Application files backup
echo "Backing up application files..."
tar -czf ${BACKUP_BASE}_application.tar.gz -C /home/biosearch BioSearch2 --exclude=node_modules --exclude=venv --exclude=.git

# Configuration files backup
echo "Backing up configuration files..."
tar -czf ${BACKUP_BASE}_config.tar.gz /etc/nginx/sites-available/biosearch /etc/letsencrypt /home/biosearch/.env

# Logs backup
echo "Backing up logs..."
tar -czf ${BACKUP_BASE}_logs.tar.gz /var/log/biosearch /var/log/nginx

# Create backup manifest
cat > ${BACKUP_BASE}_manifest.txt << MANIFEST
BioSearch2 Backup Manifest
Date: $DATE
Files:
- ${BACKUP_BASE}_database.sql.gz (Database)
- ${BACKUP_BASE}_application.tar.gz (Application)
- ${BACKUP_BASE}_config.tar.gz (Configuration)
- ${BACKUP_BASE}_logs.tar.gz (Logs)

Database size: $(du -h ${BACKUP_BASE}_database.sql.gz | cut -f1)
Application size: $(du -h ${BACKUP_BASE}_application.tar.gz | cut -f1)
Config size: $(du -h ${BACKUP_BASE}_config.tar.gz | cut -f1)
Logs size: $(du -h ${BACKUP_BASE}_logs.tar.gz | cut -f1)
MANIFEST

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*" -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_BASE"
EOF
    
    chmod +x /home/biosearch/full_backup.sh
    
    # Add to crontab (daily at 3 AM)
    (crontab -l 2>/dev/null; echo "0 3 * * * /home/biosearch/full_backup.sh") | crontab -
    
    print_status "Backup procedures configured"
}

# Set up performance monitoring
setup_performance_monitoring() {
    print_status "Setting up performance monitoring..."
    
    # Create performance monitoring script
    cat > /home/biosearch/performance_monitor.sh << 'EOF'
#!/bin/bash
# Performance monitoring script for BioSearch2

LOG_FILE="/var/log/biosearch/performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log with timestamp
log_performance() {
    echo "[$DATE] $1" >> $LOG_FILE
}

# System performance metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{print $2}')

# Application performance metrics
if command -v pm2 > /dev/null; then
    PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
    PM2_CPU=$(pm2 jlist | jq -r '.[0].monit.cpu' 2>/dev/null || echo "0")
    PM2_MEMORY=$(pm2 jlist | jq -r '.[0].monit.memory' 2>/dev/null || echo "0")
else
    PM2_STATUS="not_available"
    PM2_CPU="0"
    PM2_MEMORY="0"
fi

# Database performance
DB_CONNECTIONS=$(psql -h localhost -U biosearch_user -d biosearch_db -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")

# Log performance metrics
log_performance "CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%, Load: ${LOAD_AVERAGE}"
log_performance "PM2 Status: ${PM2_STATUS}, CPU: ${PM2_CPU}%, Memory: ${PM2_MEMORY}MB"
log_performance "DB Connections: ${DB_CONNECTIONS}"

# Alert if performance is poor
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log_performance "ALERT: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    log_performance "ALERT: High memory usage: ${MEMORY_USAGE}%"
fi

if [ $DISK_USAGE -gt 80 ]; then
    log_performance "ALERT: High disk usage: ${DISK_USAGE}%"
fi
EOF
    
    chmod +x /home/biosearch/performance_monitor.sh
    
    # Add to crontab (every 10 minutes)
    (crontab -l 2>/dev/null; echo "*/10 * * * * /home/biosearch/performance_monitor.sh") | crontab -
    
    print_status "Performance monitoring configured"
}

# Create monitoring dashboard script
create_monitoring_dashboard() {
    print_status "Creating monitoring dashboard..."
    
    cat > /home/biosearch/monitoring_dashboard.sh << 'EOF'
#!/bin/bash
# Simple monitoring dashboard for BioSearch2

clear
echo "=========================================="
echo "BioSearch2 Monitoring Dashboard"
echo "=========================================="
echo "Date: $(date)"
echo ""

# System status
echo "SYSTEM STATUS:"
echo "--------------"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
echo "Memory Usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
echo ""

# Service status
echo "SERVICE STATUS:"
echo "---------------"
echo "Nginx: $(systemctl is-active nginx)"
echo "PostgreSQL: $(systemctl is-active postgresql)"
echo "PM2: $(pgrep -f pm2 > /dev/null && echo "running" || echo "stopped")"
echo ""

# Application status
echo "APPLICATION STATUS:"
echo "-------------------"
if curl -f -s http://localhost:5001/api/health > /dev/null; then
    echo "Backend API: OK"
else
    echo "Backend API: FAILED"
fi

if curl -f -s http://localhost > /dev/null; then
    echo "Frontend: OK"
else
    echo "Frontend: FAILED"
fi
echo ""

# Recent logs
echo "RECENT LOGS (last 5 lines):"
echo "---------------------------"
if [ -f "/var/log/biosearch/system_monitor.log" ]; then
    tail -5 /var/log/biosearch/system_monitor.log
else
    echo "No system monitor logs found"
fi
echo ""

# Database status
echo "DATABASE STATUS:"
echo "----------------"
DB_SIZE=$(psql -h localhost -U biosearch_user -d biosearch_db -t -c "SELECT pg_size_pretty(pg_database_size('biosearch_db'));" 2>/dev/null || echo "unknown")
echo "Database Size: $DB_SIZE"

DB_CONNECTIONS=$(psql -h localhost -U biosearch_user -d biosearch_db -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "unknown")
echo "Active Connections: $DB_CONNECTIONS"
echo ""

echo "=========================================="
echo "Press Ctrl+C to exit"
echo "=========================================="

# Auto-refresh every 30 seconds
sleep 30
exec $0
EOF
    
    chmod +x /home/biosearch/monitoring_dashboard.sh
    
    print_status "Monitoring dashboard created"
    print_status "Run './monitoring_dashboard.sh' to view the dashboard"
}

# Main function
main() {
    print_status "Setting up monitoring and backup for BioSearch2..."
    
    install_monitoring_tools
    configure_system_monitoring
    configure_log_rotation
    configure_fail2ban
    setup_health_monitoring
    setup_backup_procedures
    setup_performance_monitoring
    create_monitoring_dashboard
    
    print_status "Monitoring and backup setup completed successfully!"
    print_warning "Monitoring features enabled:"
    print_warning "- System monitoring (every 5 minutes)"
    print_warning "- Health checks (every 2 minutes)"
    print_warning "- Performance monitoring (every 10 minutes)"
    print_warning "- Daily backups (3 AM)"
    print_warning "- Log rotation (daily)"
    print_warning "- Fail2ban protection"
    print_status "Run './monitoring_dashboard.sh' to view system status"
}

# Run main function
main "$@"
