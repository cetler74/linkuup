#!/bin/bash

# Run the campaign booking integration migration
# This script adds campaign-related fields to the bookings table

echo "Running campaign booking integration migration..."

# Get database connection details
DB_NAME="linkuup_db"
DB_USER="carloslarramba"
DB_HOST="localhost"
DB_PORT="5432"

# Run the migration SQL file
psql "postgresql://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}" -f "$(dirname "$0")/add_campaign_to_bookings.sql"

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

