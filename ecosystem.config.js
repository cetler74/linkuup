module.exports = {
  apps: [{
    name: 'linkuup-backend',
    script: 'app.py',
    cwd: '/home/linkuup/LinkUup/backend',
    interpreter: '/home/linkuup/LinkUup/venv/bin/python',
    env: {
      DATABASE_URL: 'postgresql://linkuup_user:CHANGE_THIS_PASSWORD@localhost:5432/linkuup_db',
      FLASK_ENV: 'production',
      FLASK_DEBUG: 'False',
      SECRET_KEY: 'CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING',
      MAIL_SERVER: 'smtp.gmail.com',
      MAIL_PORT: '587',
      MAIL_USE_TLS: 'True',
      MAIL_USERNAME: 'your_email@gmail.com',
      MAIL_PASSWORD: 'your_gmail_app_password',
      MAIL_DEFAULT_SENDER: 'your_email@gmail.com',
      CORS_ORIGIN: 'https://your-domain.com,https://www.your-domain.com',
      APP_HOST: '0.0.0.0',
      APP_PORT: '5001'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/linkuup/error.log',
    out_file: '/var/log/linkuup/out.log',
    log_file: '/var/log/linkuup/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
