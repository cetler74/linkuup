#!/bin/bash

# Setup cron jobs for automated booking reminders
# This script sets up a cron job to run booking reminders every hour

echo "Setting up automated booking reminder cron job..."

# Get the current directory (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMINDER_SCRIPT="$PROJECT_ROOT/backend/cron/booking_reminders.py"

# Check if the reminder script exists
if [ ! -f "$REMINDER_SCRIPT" ]; then
    echo "Error: Reminder script not found at $REMINDER_SCRIPT"
    exit 1
fi

# Make the script executable
chmod +x "$REMINDER_SCRIPT"

# Create a temporary cron file
TEMP_CRON="/tmp/cron_jobs_$$"

# Get current cron jobs (excluding any existing booking reminder jobs)
crontab -l 2>/dev/null | grep -v "booking_reminders.py" > "$TEMP_CRON"

# Add the new cron job (run every hour at minute 0)
echo "0 * * * * cd $PROJECT_ROOT && python3 $REMINDER_SCRIPT >> $PROJECT_ROOT/logs/booking_reminders.log 2>&1" >> "$TEMP_CRON"

# Install the new cron jobs
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

echo "✅ Cron job setup complete!"
echo "📅 Booking reminders will run every hour"
echo "📝 Logs will be saved to: $PROJECT_ROOT/logs/booking_reminders.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -e (then delete the line)"
echo ""
echo "To test the reminder script manually:"
echo "cd $PROJECT_ROOT && python3 $REMINDER_SCRIPT"
