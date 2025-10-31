# MCP Digital Ocean Quick Start Guide

Get your BioSearch2 application deployed to Digital Ocean in minutes using the MCP integration.

## 🚀 Quick Setup (5 minutes)

### 1. Get Your Digital Ocean API Token

1. Go to [Digital Ocean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
2. Click "Generate New Token"
3. Name it "BioSearch2 MCP"
4. Select "Full Access" scope
5. Copy the token

### 2. Set Your API Token

```bash
export DIGITALOCEAN_API_TOKEN='your_token_here'
```

### 3. Run the Setup

```bash
./scripts/setup_digital_ocean_mcp.sh
```

### 4. Configure Your Settings

Edit `.env.digitalocean`:

```bash
# Required: Your API token
DIGITALOCEAN_API_TOKEN=your_token_here

# Required: Your domain (or use IP)
APP_DOMAIN=your-domain.com

# Required: Your email for SSL
SSL_EMAIL=your-email@example.com

# Optional: Customize droplet (start small for validation)
DROPLET_NAME=biosearch2-dev
DROPLET_SIZE=s-1vcpu-1gb
DROPLET_REGION=nyc1
```

### 5. Deploy Your Application

```bash
./scripts/mcp_deploy.sh
```

That's it! Your application will be deployed and accessible at your domain or droplet IP.

## 🔧 Available Commands

### Manage Droplets
```bash
# List all droplets
./scripts/mcp_droplet_manager.sh list

# Create a new droplet
./scripts/mcp_droplet_manager.sh create

# Get droplet IP
./scripts/mcp_droplet_manager.sh ip DROPLET_ID
```

### Monitor Your Application
```bash
# Check everything is working
./scripts/mcp_monitor.sh
```

### Create Backups
```bash
# Backup database and application
./scripts/mcp_backup.sh
```

### Test Integration
```bash
# Verify everything is set up correctly
./scripts/test_mcp_integration.sh
```

## 💰 Cost Estimation

| Droplet Size | Monthly Cost | Use Case |
|--------------|--------------|----------|
| **s-1vcpu-1gb** | **$6** | **Development/Validation** ⭐ |
| s-2vcpu-2gb | $12 | PoC (50 salons) |
| s-2vcpu-4gb | $24 | Production |

Plus:
- Domain: ~$1/month (optional)
- **Total**: **$6/month** (validation) → $13-25/month (production)

## 🆘 Need Help?

1. **Check the logs**: `./scripts/mcp_monitor.sh`
2. **Test your setup**: `./scripts/test_mcp_integration.sh`
3. **Read the full guide**: `DIGITAL_OCEAN_MCP_SETUP.md`

## 🎯 What Happens During Deployment

1. **Creates a Digital Ocean droplet** (Ubuntu 22.04)
2. **Installs all dependencies** (Node.js, Python, PostgreSQL, Nginx)
3. **Deploys your application** (Frontend + Backend)
4. **Sets up the database** (Creates tables, imports data)
5. **Configures Nginx** (Reverse proxy, static files)
6. **Sets up SSL** (Let's Encrypt certificate)
7. **Configures monitoring** (PM2 process management)

## 🔒 Security Features

- ✅ SSH key authentication only
- ✅ Firewall configured (UFW)
- ✅ SSL certificates (HTTPS)
- ✅ Database access restricted
- ✅ Regular automated backups

## 📊 Monitoring

Your application includes:
- **Health checks**: `/api/health` endpoint
- **Process monitoring**: PM2 process management
- **Log monitoring**: Application and system logs
- **Resource monitoring**: CPU, memory, disk usage

## 🚀 Next Steps

1. **Customize your domain**: Update DNS to point to your droplet
2. **Set up monitoring alerts**: Configure alerts for high resource usage
3. **Create staging environment**: Use a separate droplet for testing
4. **Implement CI/CD**: Automate deployments from your Git repository

---

**Ready to deploy?** Run `./scripts/mcp_deploy.sh` and your BioSearch2 application will be live in minutes!
