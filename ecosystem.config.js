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
