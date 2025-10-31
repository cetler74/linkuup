#!/bin/bash

# Script to run cleanup on server - keep only salons 1-5

SERVER="root@147.93.89.178"
DB_NAME="linkuup_db"

echo "=========================================="
echo "Database Cleanup - Keep Salons 1-5"
echo "=========================================="

echo ""
echo "Step 1: Creating backup on server..."
ssh $SERVER "sudo -u postgres pg_dump $DB_NAME > /tmp/linkuup_backup_before_cleanup_\$(date +%Y%m%d_%H%M%S).sql && echo 'Backup created successfully'"

echo ""
echo "Step 2: Checking current database state..."
ssh $SERVER "sudo -u postgres psql $DB_NAME -c \"SELECT COUNT(*) as current_salon_count FROM salons;\""

echo ""
echo "Step 3: Showing salons 1-5 (will be kept)..."
ssh $SERVER "sudo -u postgres psql $DB_NAME -c \"SELECT id, nome, cidade FROM salons WHERE id IN (1,2,3,4,5) ORDER BY id;\""

echo ""
echo "⚠️  About to delete all salons EXCEPT IDs 1-5"
read -p "Continue? (type 'yes'): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "Step 4: Running cleanup..."
ssh $SERVER "sudo -u postgres psql $DB_NAME" << 'EOF'
BEGIN;

-- Delete related records
DELETE FROM salon_images WHERE salon_id NOT IN (1,2,3,4,5);
DELETE FROM salon_services WHERE salon_id NOT IN (1,2,3,4,5);
DELETE FROM bookings WHERE salon_id NOT IN (1,2,3,4,5);
DELETE FROM time_slots WHERE salon_id NOT IN (1,2,3,4,5);
DELETE FROM reviews WHERE salon_id NOT IN (1,2,3,4,5);

-- Delete salons
DELETE FROM salons WHERE id NOT IN (1,2,3,4,5);

COMMIT;

-- Show results
SELECT 'Final salon count:' as result, COUNT(*) as total FROM salons;
SELECT 'Service count:' as result, COUNT(*) as total FROM salon_services;
EOF

echo ""
echo "Step 5: Verifying results..."
ssh $SERVER "sudo -u postgres psql $DB_NAME -c \"SELECT id, nome, cidade, booking_enabled FROM salons ORDER BY id;\""

echo ""
echo "=========================================="
echo "✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "Results:"
ssh $SERVER "sudo -u postgres psql $DB_NAME -c \"SELECT 
    (SELECT COUNT(*) FROM salons) as salons,
    (SELECT COUNT(*) FROM salon_services) as services,
    (SELECT COUNT(*) FROM bookings) as bookings
;\""

echo ""
echo "Backup location: /tmp/linkuup_backup_before_cleanup_*.sql on server"

