# BioSearch2 Digital Ocean Deployment - Quick Start Guide

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites
- Digital Ocean account
- Domain name (optional)
- SSH key configured

### Step 1: Create Digital Ocean Droplet
1. **Create Droplet**:
   - OS: Ubuntu 22.04 LTS
   - Size: 2GB RAM, 1 vCPU, 50GB SSD (minimum)
   - Add your SSH key
   - Enable backups
   - Choose region closest to your users

2. **Note the IP address** of your droplet

### Step 2: Deploy Application
```bash
# Set your droplet IP
export DROPLET_IP="YOUR_DROPLET_IP"

# Run the deployment script
./scripts/deploy_to_digital_ocean.sh
```

### Step 3: Set Up SSL (Optional but Recommended)
```bash
# Set your domain and email
export DOMAIN="your-domain.com"
export EMAIL="your@email.com"

# Run SSL setup
./scripts/setup_ssl.sh
```

### Step 4: Configure Monitoring
```bash
# Set up monitoring and backups
./scripts/monitoring_setup.sh
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application accessible at `http://YOUR_DROPLET_IP`
- [ ] SSL working (if configured) at `https://your-domain.com`
- [ ] Database connection working
- [ ] Email notifications working
- [ ] Monitoring dashboard accessible
- [ ] Backups running automatically

## 🔧 Post-Deployment Configuration

### 1. Update Environment Variables
Edit `/home/biosearch/BioSearch2/.env`:
```bash
# Update with your actual values
MAIL_USERNAME=your_actual_email@gmail.com
MAIL_PASSWORD=your_actual_gmail_app_password
SECRET_KEY=your_secure_secret_key
CORS_ORIGIN=https://your-domain.com
```

### 2. Import Your Data
```bash
# Connect to your droplet
ssh biosearch@YOUR_DROPLET_IP

# Import data
cd BioSearch2
source venv/bin/activate
python3 scripts/import_data.py
```

### 3. Create Admin User
```bash
# Create admin user
python3 scripts/create_admin.py
```

## 📊 Monitoring Your Application

### View System Status
```bash
# Run monitoring dashboard
./monitoring_dashboard.sh
```

### Check Logs
```bash
# Application logs
pm2 logs biosearch-backend

# System logs
tail -f /var/log/biosearch/system_monitor.log

# Nginx logs
tail -f /var/log/nginx/access.log
```

### Manual Backup
```bash
# Run full backup
./full_backup.sh
```

## 🚨 Troubleshooting

### Application Not Starting
```bash
# Check PM2 status
pm2 status

# Restart application
pm2 restart biosearch-backend

# Check logs
pm2 logs biosearch-backend
```

### Database Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -h localhost -U biosearch_user -d biosearch_db
```

### SSL Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### High Resource Usage
```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h
```

## 📈 Scaling for Growth

### For 50+ Salons
1. **Upgrade Droplet**: 4GB RAM, 2 vCPU
2. **Database Optimization**: Add indexes, connection pooling
3. **Caching**: Implement Redis
4. **CDN**: Use Digital Ocean Spaces

### For 100+ Salons
1. **Load Balancer**: Digital Ocean Load Balancer
2. **Database Scaling**: Read replicas
3. **Application Scaling**: Multiple PM2 instances
4. **Monitoring**: Advanced monitoring tools

## 💰 Cost Estimation

### Monthly Costs (USD)
- **Droplet (2GB)**: ~$12/month
- **Backups**: ~$2.40/month
- **Domain**: ~$1/month
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$15.40/month

### For 50 Salons PoC
- **Concurrent Users**: 10-20
- **Database Size**: <1GB
- **Storage**: <10GB
- **Bandwidth**: <100GB/month

## 🔒 Security Best Practices

### Implemented Security Features
- ✅ Firewall configured (UFW)
- ✅ Fail2ban protection
- ✅ SSL/TLS encryption
- ✅ Secure database configuration
- ✅ Regular security updates
- ✅ Automated backups

### Additional Security Recommendations
- Regular security audits
- Monitor access logs
- Keep system updated
- Use strong passwords
- Enable 2FA where possible

## 📞 Support

### Common Commands
```bash
# Restart services
sudo systemctl restart nginx
sudo systemctl restart postgresql
pm2 restart all

# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# View logs
sudo journalctl -u nginx
sudo journalctl -u postgresql
pm2 logs
```

### Emergency Procedures
1. **Application Down**: `pm2 restart biosearch-backend`
2. **Database Issues**: Check PostgreSQL status and logs
3. **High Load**: Monitor resources and restart services
4. **Security Breach**: Check fail2ban logs and update passwords

## 📋 Maintenance Schedule

### Daily
- Monitor system resources
- Check application health
- Review error logs

### Weekly
- Review backup status
- Check security logs
- Update system packages

### Monthly
- Security audit
- Performance review
- Backup restoration test

## 🎯 Success Metrics

### Key Performance Indicators
- **Uptime**: >99.5%
- **Response Time**: <2 seconds
- **Error Rate**: <1%
- **Backup Success**: 100%

### Monitoring Alerts
- CPU usage >80%
- Memory usage >80%
- Disk usage >80%
- Application down
- Database connection issues

---

**Your BioSearch2 application is now ready for production use with up to 50 salons!** 🎉

For questions or issues, refer to the detailed documentation in `DIGITAL_OCEAN_DEPLOYMENT.md`.
