# BioSearch2 Digital Ocean Setup Checklist

## ✅ Pre-Setup Requirements

- [ ] Digital Ocean account created
- [ ] Credit card added to account
- [ ] GitHub account created (recommended)
- [ ] Node.js installed (`node --version`)
- [ ] jq installed (`jq --version`)

## ✅ Step 1: Get API Token

- [ ] Go to [Digital Ocean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
- [ ] Click "Generate New Token"
- [ ] Name: "BioSearch2 MCP"
- [ ] Scope: "Full Access"
- [ ] Copy the token
- [ ] Set environment variable: `export DIGITALOCEAN_API_TOKEN='your_token'`

## ✅ Step 2: Setup MCP

- [ ] Run: `./scripts/setup_digital_ocean_mcp.sh`
- [ ] Run: `./scripts/test_mcp_integration.sh`
- [ ] Verify all tests pass

## ✅ Step 3: Setup GitHub (Recommended)

- [ ] Create GitHub repository: `BioSearch2`
- [ ] Make repository private
- [ ] Push your code:
  ```bash
  git init
  git add .
  git commit -m "Initial BioSearch2 application"
  git remote add origin https://github.com/YOUR_USERNAME/BioSearch2.git
  git push -u origin main
  ```

## ✅ Step 4: Configure Environment

- [ ] Edit: `nano .env.digitalocean`
- [ ] Set `DIGITALOCEAN_API_TOKEN=your_actual_token`
- [ ] Set `REPO_URL=https://github.com/YOUR_USERNAME/BioSearch2.git`
- [ ] Set `APP_DOMAIN=your-domain.com` (or leave blank for IP)
- [ ] Set `APP_EMAIL=your-email@example.com`
- [ ] Set `SSL_EMAIL=your-email@example.com`
- [ ] Save file

## ✅ Step 5: Deploy Application

- [ ] Run: `./scripts/mcp_deploy.sh`
- [ ] Wait for deployment to complete
- [ ] Note the droplet IP address

## ✅ Step 6: Verify Deployment

- [ ] Access application: `http://YOUR_DROPLET_IP`
- [ ] Test homepage loads
- [ ] Test salon search
- [ ] Test user registration
- [ ] Test manager login
- [ ] Test admin dashboard

## ✅ Step 7: Monitor Application

- [ ] Run: `./scripts/mcp_monitor.sh`
- [ ] Check all services are running
- [ ] Verify no errors in logs

## ✅ Step 8: Optional - SSL Setup

- [ ] If using domain, SSL should be automatic
- [ ] Test HTTPS access: `https://your-domain.com`
- [ ] Verify SSL certificate is valid

## 🎯 Quick Commands Reference

```bash
# Test your setup
./scripts/test_mcp_integration.sh

# Deploy application
./scripts/mcp_deploy.sh

# Monitor application
./scripts/mcp_monitor.sh

# List droplets
./scripts/mcp_droplet_manager.sh list

# SSH into droplet
ssh biosearch@YOUR_DROPLET_IP

# View logs
ssh biosearch@YOUR_DROPLET_IP "pm2 logs"
```

## 💰 Cost: $6/month (validation phase)

## 🆘 If Something Goes Wrong

1. Check logs: `./scripts/mcp_monitor.sh`
2. Test setup: `./scripts/test_mcp_integration.sh`
3. Restart services: `ssh biosearch@YOUR_DROPLET_IP "pm2 restart all"`
4. Check Digital Ocean dashboard for droplet status

## 🚀 Ready for Production?

When validation is complete:
1. Update `.env.digitalocean`: Change `DROPLET_SIZE` to `s-2vcpu-2gb`
2. Run: `./scripts/mcp_deploy.sh`
3. Enable backups: Add `"backups": true` to droplet creation
4. Total cost: $14.40/month
