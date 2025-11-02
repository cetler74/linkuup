# Fix PM2 Configuration

The error shows PM2 is looking for the wrong path. Fix it by updating the ecosystem.config.js on the server.

## On the Server

```bash
cd ~/Linkuup

# Update the ecosystem.config.js with correct paths
cat > ~/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'linkuup-backend',
    script: 'uvicorn',
    args: 'main:app --host 0.0.0.0 --port 5001 --workers 2',
    cwd: '/home/linkuup/Linkuup/backend',
    interpreter: '/home/linkuup/Linkuup/venv/bin/python3',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/linkuup/error.log',
    out_file: '/var/log/linkuup/out.log',
    log_file: '/var/log/linkuup/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '/home/linkuup/Linkuup/backend/.env'
  }]
};
EOF

# Verify the main.py file exists
ls -la ~/Linkuup/backend/main.py

# Start PM2 with the corrected config
pm2 delete all
pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup systemd -u linkuup --hp /home/linkuup
```

