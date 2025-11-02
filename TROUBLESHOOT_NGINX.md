# Troubleshoot Nginx 500 Error

When you get a 500 error, check:

## Check Nginx Error Logs

```bash
sudo tail -f /var/log/nginx/error.log
```

## Common Issues

### 1. Permission Issues

```bash
# Check file permissions
ls -la ~/Linkuup/frontend/dist/

# Fix permissions
sudo chown -R linkuup:linkuup ~/Linkuup/frontend/dist/
sudo chmod -R 755 ~/Linkuup/frontend/dist/
```

### 2. Wrong Path

```bash
# Verify the path exists
ls -la /home/linkuup/Linkuup/frontend/dist/index.html

# Check Nginx user can access it
sudo -u www-data ls -la /home/linkuup/Linkuup/frontend/dist/
```

### 3. SELinux (if enabled)

```bash
# Check if SELinux is the issue
sudo setenforce 0  # Temporarily disable
# Or set proper context
sudo chcon -R -t httpd_sys_content_t /home/linkuup/Linkuup/frontend/dist/
```

### 4. Check Nginx User

```bash
# See what user Nginx is running as
grep user /etc/nginx/nginx.conf

# Usually it's www-data
sudo -u www-data test -r /home/linkuup/Linkuup/frontend/dist/index.html
```

