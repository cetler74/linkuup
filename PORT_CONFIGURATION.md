# Port Configuration Guide

This project now supports configurable ports through environment variables, eliminating hardcoded port dependencies.

## Backend Port Configuration

The backend port is configured in `backend/.env`:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=5002
```

### Default Values
- **HOST**: `0.0.0.0` (configurable in `backend/core/config.py`)
- **PORT**: `5001` (configurable in `backend/core/config.py`)

## Frontend Port Configuration

The frontend connects to the backend using the `VITE_API_BASE_URL` environment variable in `frontend/.env`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5002
```

## Quick Port Setup

Use the provided script to easily change ports:

```bash
# Set backend to port 5002 (frontend stays on 5173)
./scripts/set-port.sh 5002

# Set backend to port 3001 and frontend to port 3000
./scripts/set-port.sh 3001 3000
```

## Manual Configuration

### Backend
1. Edit `backend/.env`:
   ```bash
   PORT=5002
   ```

2. Restart the backend:
   ```bash
   cd backend
   python3 -m backend.main
   ```

### Frontend
1. Edit `frontend/.env`:
   ```bash
   VITE_API_BASE_URL=http://localhost:5002
   ```

2. Restart the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## Environment Variables

### Backend (`backend/.env`)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 5001)
- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: JWT secret key
- `BACKEND_CORS_ORIGINS`: CORS allowed origins

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:5001)
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key

## Production Deployment

For production, set the appropriate environment variables:

```bash
# Backend
HOST=0.0.0.0
PORT=8000
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
SECRET_KEY=your-production-secret-key

# Frontend
VITE_API_BASE_URL=https://your-backend-domain.com
```

## Troubleshooting

### Port Already in Use
If you get "address already in use" error:
1. Find the process using the port: `lsof -i :5001`
2. Kill the process: `kill -9 <PID>`
3. Or use a different port: `./scripts/set-port.sh 5002`

### Frontend Can't Connect to Backend
1. Check if backend is running: `curl http://localhost:5002/api/v1/health`
2. Verify `VITE_API_BASE_URL` in `frontend/.env`
3. Restart the frontend development server

### CORS Issues
Make sure the backend CORS origins include your frontend URL:
```bash
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```
