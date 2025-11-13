#!/bin/bash
# Script to view backend logs

echo "Backend Log Viewer for LinkUup"
echo "================================"
echo ""

# Check if running with systemd
if systemctl is-active --quiet linkuup-backend 2>/dev/null; then
    echo "📋 Viewing systemd service logs..."
    echo "   Command: sudo journalctl -u linkuup-backend -f"
    echo ""
    sudo journalctl -u linkuup-backend -f --no-pager
elif systemctl is-active --quiet linkuup* 2>/dev/null; then
    SERVICE_NAME=$(systemctl list-units --type=service | grep linkuup | awk '{print $1}' | head -1)
    echo "📋 Viewing systemd service logs for: $SERVICE_NAME"
    echo "   Command: sudo journalctl -u $SERVICE_NAME -f"
    echo ""
    sudo journalctl -u "$SERVICE_NAME" -f --no-pager
else
    # Check if running with PM2
    if command -v pm2 &> /dev/null && pm2 list | grep -q linkuup; then
        echo "📋 Viewing PM2 logs..."
        echo "   Command: pm2 logs linkuup-backend"
        echo ""
        pm2 logs linkuup-backend --lines 100
    else
        # Check for uvicorn process
        UVICORN_PID=$(ps aux | grep "[u]vicorn.*main:app" | awk '{print $2}' | head -1)
        if [ -n "$UVICORN_PID" ]; then
            echo "📋 Backend is running with uvicorn (PID: $UVICORN_PID)"
            echo ""
            echo "Options to view logs:"
            echo "1. If running in a terminal/screen/tmux, check that session"
            echo "2. Check if logs are redirected to a file:"
            echo "   - Check: /var/log/linkuup/"
            echo "   - Check: ~/linkuup/logs/"
            echo "   - Check: /opt/linkuup/logs/"
            echo ""
            echo "3. To see real-time logs, you can:"
            echo "   - Restart with logging: uvicorn main:app --host 0.0.0.0 --port 5001 --log-config logging.conf"
            echo "   - Or redirect output: uvicorn ... > /var/log/linkuup/backend.log 2>&1"
            echo ""
            echo "4. Check process stderr/stdout:"
            echo "   sudo ls -la /proc/$UVICORN_PID/fd/"
            echo ""
            echo "Current process info:"
            ps aux | grep "[u]vicorn.*main:app"
        else
            echo "❌ Backend process not found!"
            echo "   Make sure the backend is running"
        fi
    fi
fi

