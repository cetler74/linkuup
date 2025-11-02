# Fix CORS and Rebuild Frontend

The frontend is calling localhost instead of production API. Fix this:

## Step 1: Update Backend CORS

SSH to server and update the `.env` file:

```bash
ssh linkuup@64.226.117.67
cd ~/Linkuup/backend
nano .env
```

Add or update the CORS origins line:

```env
BACKEND_CORS_ORIGINS=["http://64.226.117.67","http://localhost:5173","http://localhost:3000"]
```

Save and exit (Ctrl+X, Y, Enter)

## Step 2: Restart Backend

```bash
pm2 restart linkuup-backend
pm2 logs linkuup-backend --lines 20
```

## Step 3: Rebuild Frontend with Correct API URL

```bash
cd ~/Linkuup/frontend

# Update .env.production to use relative URL (so it works behind Nginx)
cat > .env.production << 'EOF'
VITE_API_BASE_URL=/api/v1
VITE_GOOGLE_MAPS_API_KEY=
VITE_REVENUECAT_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
EOF

# Rebuild frontend
npm run build
```

## Step 4: Verify Build

```bash
# Check the built files
ls -la ~/Linkuup/frontend/dist/
ls -la ~/Linkuup/frontend/dist/index.html
ls -la ~/Linkuup/frontend/dist/assets/
```

## Step 5: Test

Visit http://64.226.117.67 and check the browser console. It should now call `/api/v1/...` instead of `localhost:5001/api/v1/...`

