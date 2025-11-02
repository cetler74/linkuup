# Set Up Nginx

If Nginx isn't installed or configured, follow these steps:

## Install Nginx (if not installed)

```bash
sudo apt update
sudo apt install -y nginx
```

## Create Directory Structure

```bash
# Create sites-available and sites-enabled if they don't exist
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

## Then Configure Nginx

After Nginx is installed, configure it:

```bash
sudo tee /etc/nginx/sites-available/linkuup > /dev/null << 'EOF'
server {
    listen 80;
    server_name 64.226.117.67;
    client_max_body_size 20M;
    
    location / {
        root /home/linkuup/Linkuup/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /uploads/ {
        alias /home/linkuup/Linkuup/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/linkuup /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

