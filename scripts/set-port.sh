#!/bin/bash

# Script to set backend and frontend ports
# Usage: ./scripts/set-port.sh <backend_port> [frontend_port]

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backend_port> [frontend_port]"
    echo "Example: $0 5002 5173"
    exit 1
fi

BACKEND_PORT=$1
FRONTEND_PORT=${2:-5173}

echo "Setting backend port to $BACKEND_PORT and frontend port to $FRONTEND_PORT"

# Update backend .env
if [ -f "backend/.env" ]; then
    # Remove existing PORT line and add new one
    sed -i '' '/^PORT=/d' backend/.env
    echo "PORT=$BACKEND_PORT" >> backend/.env
    echo "Updated backend/.env with PORT=$BACKEND_PORT"
else
    echo "backend/.env not found, creating it..."
    echo "PORT=$BACKEND_PORT" > backend/.env
fi

# Update frontend .env
if [ -f "frontend/.env" ]; then
    # Update VITE_API_BASE_URL
    sed -i '' "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://localhost:$BACKEND_PORT|" frontend/.env
    echo "Updated frontend/.env with VITE_API_BASE_URL=http://localhost:$BACKEND_PORT"
else
    echo "frontend/.env not found, creating it..."
    echo "VITE_API_BASE_URL=http://localhost:$BACKEND_PORT" > frontend/.env
fi

echo "Port configuration updated successfully!"
echo "Backend will run on port $BACKEND_PORT"
echo "Frontend will connect to backend on port $BACKEND_PORT"
echo ""
echo "To start the servers:"
echo "  Backend: cd backend && python3 -m backend.main"
echo "  Frontend: cd frontend && npm run dev"
