#!/bin/bash

# Quick Salon Cleanup Script
# Removes all salons that don't have assigned owners

echo "=========================================="
echo "Salon Database Cleanup"
echo "=========================================="

# Check if we're on the server or local
if [ -f "/var/www/biosearch2/backend/app.py" ]; then
    PROJECT_DIR="/var/www/biosearch2"
    echo "Running on server..."
else
    PROJECT_DIR="/Volumes/OWC Volume/Projects2025/BioSearch2"
    echo "Running locally..."
fi

cd "$PROJECT_DIR" || exit 1

echo ""
echo "Current database stats:"
psql linkuup_db -c "
SELECT 
    COUNT(*) as total_salons,
    COUNT(*) FILTER (WHERE owner_id IS NOT NULL) as salons_with_owners,
    COUNT(*) FILTER (WHERE booking_enabled = true) as booking_enabled,
    (SELECT COUNT(*) FROM salon_services) as total_services
FROM salons;"

echo ""
echo "Salons that will be KEPT (have owners):"
psql linkuup_db -c "
SELECT s.id, s.nome, s.cidade, u.email as owner_email
FROM salons s
JOIN users u ON s.owner_id = u.id
ORDER BY s.id;"

echo ""
echo "⚠️  WARNING: This will DELETE all salons WITHOUT owners!"
echo ""
read -p "Do you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled - no changes made"
    exit 0
fi

echo ""
echo "Creating backup..."
BACKUP_FILE="/tmp/linkuup_db_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump linkuup_db > "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

echo ""
echo "Starting cleanup..."

# Get IDs of salons with owners
SALON_IDS=$(psql linkuup_db -t -c "SELECT STRING_AGG(id::text, ',') FROM salons WHERE owner_id IS NOT NULL;")

if [ -z "$SALON_IDS" ]; then
    echo "❌ No salons with owners found! Aborting to be safe."
    exit 1
fi

echo "Keeping salon IDs: $SALON_IDS"

# Delete related records for salons without owners
psql linkuup_db << EOF
BEGIN;

-- Delete related records for salons without owners
DELETE FROM salon_images WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IS NULL);
DELETE FROM salon_services WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IS NULL);
DELETE FROM bookings WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IS NULL);
DELETE FROM time_slots WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IS NULL);
DELETE FROM reviews WHERE salon_id IN (SELECT id FROM salons WHERE owner_id IS NULL);

-- Delete salons without owners
DELETE FROM salons WHERE owner_id IS NULL;

COMMIT;
EOF

echo ""
echo "✅ Cleanup completed!"

echo ""
echo "New database stats:"
psql linkuup_db -c "
SELECT 
    COUNT(*) as total_salons,
    COUNT(*) FILTER (WHERE owner_id IS NOT NULL) as salons_with_owners,
    COUNT(*) FILTER (WHERE booking_enabled = true) as booking_enabled,
    (SELECT COUNT(*) FROM salon_services) as total_services
FROM salons;"

echo ""
echo "Remaining salons:"
psql linkuup_db -c "SELECT id, nome, cidade FROM salons ORDER BY id;"

echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "Backup: $BACKUP_FILE"
echo "=========================================="

