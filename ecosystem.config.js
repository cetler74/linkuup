// Load environment variables from .env file
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex !== -1) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          // Remove quotes if present
          const unquotedValue = value.replace(/^["']|["']$/g, '');
          env[key] = unquotedValue;
        }
      }
    });
  }
  return env;
}

// Load .env file from backend directory
const envFile = path.join(__dirname, 'backend', '.env');
const envVars = loadEnvFile(envFile);

module.exports = {
  apps: [{
    name: 'linkuup-backend',
    script: '/opt/linkuup/venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 5001 --workers 2',
    cwd: '/opt/linkuup/backend',
    interpreter: '/opt/linkuup/venv/bin/python3',
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
      NODE_ENV: 'production',
      BASE_URL: 'https://linkuup.com',
      GOOGLE_CLIENT_ID: '445811034196-ebo079aj7teacpam5b87jqmqo6rg1c63.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: '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',
      // Merge environment variables from .env file
      ...envVars
    }
  }]
};
