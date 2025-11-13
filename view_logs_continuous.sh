#!/bin/bash
# Script to continuously follow backend logs

echo "Backend Log Follower for LinkUup"
echo "================================="
echo ""
echo "Choose log type:"
echo "1. Output logs (out-0.log) - all application output"
echo "2. Error logs (error-0.log) - errors only"
echo "3. Both logs (split screen)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "Following output logs... (Press Ctrl+C to stop)"
        tail -f /var/log/linkuup/out-0.log
        ;;
    2)
        echo "Following error logs... (Press Ctrl+C to stop)"
        tail -f /var/log/linkuup/error-0.log
        ;;
    3)
        echo "Following both logs in split view... (Press Ctrl+C to stop)"
        # Use multitail if available, otherwise show both
        if command -v multitail &> /dev/null; then
            multitail /var/log/linkuup/out-0.log /var/log/linkuup/error-0.log
        else
            echo "multitail not installed. Showing both logs (may be mixed):"
            tail -f /var/log/linkuup/out-0.log /var/log/linkuup/error-0.log
        fi
        ;;
    *)
        echo "Invalid choice. Following output logs by default..."
        tail -f /var/log/linkuup/out-0.log
        ;;
esac
