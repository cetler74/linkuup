# Domain Configuration Complete

## Server Configuration ✅
The server has been configured to accept requests for:
- linkuup.com
- www.linkuup.com
- 72.61.107.130 (IP address)

## Next Steps - Configure DNS in Hostinger:

1. **Log in to Hostinger hPanel**
   - Visit: https://hpanel.hostinger.com
   - Navigate to: Domains → linkuup.com → DNS Zone Editor

2. **Add A Records:**
   
   **For root domain (linkuup.com):**
   - Type: A
   - Name: @ (or leave blank)
   - Points to: 72.61.107.130
   - TTL: 3600
   
   **For www subdomain (www.linkuup.com):**
   - Type: A
   - Name: www
   - Points to: 72.61.107.130
   - TTL: 3600

3. **Save Changes**
   - Click "Save" or "Update Records"
   - Wait for DNS propagation (5 minutes to 48 hours)

4. **Verify DNS Propagation:**
   ```bash
   nslookup linkuup.com
   dig linkuup.com
   ```
   Or use online tools:
   - https://www.whatsmydns.net/#A/linkuup.com
   - https://dnschecker.org/#A/linkuup.com

## After DNS Propagates:

Once DNS is configured and propagated, your site will be accessible at:
- http://linkuup.com
- http://www.linkuup.com

## Future: SSL Certificate Setup

After DNS is working, you should set up SSL/HTTPS using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d linkuup.com -d www.linkuup.com
```

This will enable HTTPS and update the frontend API URL to use HTTPS.
