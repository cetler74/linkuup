# Image Serving Fix - Nginx Configuration

## Problem
Images are not displaying on the salon details page at `http://findursalon.biosculpture.pt/salon/1` and `http://147.93.89.178/salon/1`.

## Root Cause
The nginx configuration on the Hostinger server was missing a location block to proxy `/uploads/` requests to the Flask backend. 

When images are uploaded:
1. They are stored in `/var/www/biosearch2/backend/uploads/`
2. Flask serves them via the route `/uploads/<filename>` (backend/app.py line 1882)
3. The frontend constructs image URLs as `/uploads/<filename>`
4. Nginx needs to proxy these requests to the Flask backend on port 5001

**The missing piece:** Nginx was only configured to proxy `/api/` requests, not `/uploads/` requests.

## Solution

### Quick Fix (Automated)

Run the automated fix script from your local machine:

```bash
cd "/Volumes/OWC Volume/Projects2025/BioSearch2"
./scripts/fix_nginx_images.sh
```

This script will:
1. Connect to your Hostinger server via SSH
2. Backup the current nginx configuration
3. Upload the new configuration with the `/uploads/` location block
4. Test the configuration
5. Reload nginx
6. Verify the backend service is running

### Manual Fix (If needed)

If you need to do this manually:

1. **SSH into your Hostinger server:**
   ```bash
   ssh root@147.93.89.178
   ```

2. **Backup current configuration:**
   ```bash
   sudo cp /etc/nginx/sites-available/biosearch2 /etc/nginx/sites-available/biosearch2.backup
   ```

3. **Edit the nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/biosearch2
   ```

4. **Add this location block** (after the `/api/` block):
   ```nginx
   # Uploaded images - CRITICAL for serving salon images
   location /uploads/ {
       proxy_pass http://127.0.0.1:5001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_redirect off;
       
       # Cache uploaded images
       proxy_cache_valid 200 1d;
       add_header Cache-Control "public, max-age=86400";
   }
   ```

5. **Test and reload nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Verify backend is running:**
   ```bash
   sudo systemctl status biosearch2
   ```

## Verification

After applying the fix, test the following:

1. **Visit a salon page:**
   - http://147.93.89.178/salon/1
   - http://findursalon.biosculpture.pt/salon/1

2. **Check browser console:**
   - Open DevTools (F12)
   - Go to Network tab
   - Refresh the page
   - Look for `/uploads/` requests
   - They should return 200 status (not 404)

3. **Test direct image access:**
   ```bash
   curl -I http://147.93.89.178/uploads/test-image.jpg
   ```
   Should return either 200 (if image exists) or be proxied to backend

## Complete Nginx Configuration

The complete nginx configuration is now in `nginx.conf` and includes:

- ✅ Frontend serving (React build)
- ✅ API proxying (`/api/` → backend:5001)
- ✅ **Image uploads (`/uploads/` → backend:5001)** ← **THIS WAS MISSING**
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ Security headers
- ✅ File upload size limit (10MB)

## Troubleshooting

### Images still not showing?

1. **Check if uploads directory exists:**
   ```bash
   ssh root@147.93.89.178 'ls -la /var/www/biosearch2/backend/uploads/'
   ```

2. **Check backend logs:**
   ```bash
   ssh root@147.93.89.178 'sudo journalctl -u biosearch2 -n 100 -f'
   ```

3. **Check nginx error logs:**
   ```bash
   ssh root@147.93.89.178 'sudo tail -f /var/log/nginx/error.log'
   ```

4. **Verify backend is serving uploads:**
   ```bash
   ssh root@147.93.89.178 'curl -I http://localhost:5001/uploads/test.jpg'
   ```

5. **Check permissions:**
   ```bash
   ssh root@147.93.89.178 'sudo chown -R biosearch:www-data /var/www/biosearch2/backend/uploads/'
   ssh root@147.93.89.178 'sudo chmod -R 755 /var/www/biosearch2/backend/uploads/'
   ```

### Backend not running?

```bash
ssh root@147.93.89.178 'sudo systemctl start biosearch2'
ssh root@147.93.89.178 'sudo systemctl status biosearch2'
```

### Need to see what images are in the database?

```bash
ssh root@147.93.89.178
cd /var/www/biosearch2
source venv/bin/activate
python3 << EOF
from backend.app import app, db, SalonImage
with app.app_context():
    images = SalonImage.query.filter_by(salon_id=1).all()
    for img in images:
        print(f"ID: {img.id}, URL: {img.image_url}, Primary: {img.is_primary}")
EOF
```

## Prevention

To avoid this issue in the future:

1. Always test image display after nginx configuration changes
2. Keep the `nginx.conf` file in the repository for reference
3. Document any custom nginx configuration requirements
4. Include image serving tests in deployment checklist

## Related Files

- `nginx.conf` - Complete nginx configuration
- `scripts/fix_nginx_images.sh` - Automated fix script
- `backend/app.py` (line 1882) - Flask route serving uploaded images
- `frontend/src/utils/api.ts` (line 141) - `getImageUrl()` helper function

## Status

- ✅ Issue identified: Missing nginx `/uploads/` location block
- ✅ Solution created: New nginx.conf with proper configuration
- ✅ Deployment script created: scripts/fix_nginx_images.sh
- ⏳ Pending: Deployment to Hostinger server

## Next Steps

1. Run `./scripts/fix_nginx_images.sh` to apply the fix
2. Verify images appear on salon pages
3. Update deployment documentation to include this configuration
4. Consider setting up automated nginx config tests

