# Database Cleanup Guide

## Problem
You have **1166 salons** in the database when you should only have **5 salons**.

## Root Cause
The `scripts/import_data_postgres.py` script imported ALL active salons from `Clientes.xlsx` (your entire Bio Sculpture client list) instead of just the 5 salons you want for your directory.

## Solution Options

### Option 1: Keep Only Salons with Owners (Recommended)

This will delete all salons that don't have an assigned owner (most secure option).

**On Server:**
```bash
ssh root@147.93.89.178

cd /var/www/biosearch2

# Run cleanup - keep only salons with owners
python3 scripts/cleanup_database.py --auto-keep-owned
```

**Locally (for testing):**
```bash
cd "/Volumes/OWC Volume/Projects2025/BioSearch2"
python3 scripts/cleanup_database.py --auto-keep-owned
```

### Option 2: Interactive Cleanup

Choose specific salons to keep interactively:

```bash
# On server
ssh root@147.93.89.178
cd /var/www/biosearch2
python3 scripts/cleanup_database.py

# Choose option 3 and enter salon IDs like: 1,5,10,15,20
```

### Option 3: SQL Direct Cleanup (Fastest)

If you know exactly which 5 salons to keep:

```bash
# SSH to server
ssh root@147.93.89.178

# Connect to database
psql linkuup_db

-- First, see which salons have owners
SELECT id, nome, owner_id FROM salons WHERE owner_id IS NOT NULL ORDER BY id;

-- Then keep only those salons (replace X,Y,Z with your IDs)
BEGIN;

-- Delete related records first
DELETE FROM salon_images WHERE salon_id NOT IN (1,5,10,15,20);
DELETE FROM salon_services WHERE salon_id NOT IN (1,5,10,15,20);
DELETE FROM bookings WHERE salon_id NOT IN (1,5,10,15,20);
DELETE FROM time_slots WHERE salon_id NOT IN (1,5,10,15,20);
DELETE FROM reviews WHERE salon_id NOT IN (1,5,10,15,20);

-- Delete the salons
DELETE FROM salons WHERE id NOT IN (1,5,10,15,20);

COMMIT;

-- Verify
SELECT COUNT(*) as total_salons FROM salons;
SELECT id, nome FROM salons ORDER BY id;

\q
```

### Option 4: Start Fresh with Only 5 Salons

If you want to completely reset and manually add 5 salons:

```bash
# On server
ssh root@147.93.89.178
cd /var/www/biosearch2

# Backup first!
pg_dump linkuup_db > /tmp/linkuup_db_backup_$(date +%Y%m%d).sql

# Connect to database
psql linkuup_db

-- Clear all salons and related data
TRUNCATE salons, salon_services, bookings, time_slots, reviews, salon_images CASCADE;

\q
```

Then add your 5 salons through the admin interface or manager interface.

## Recommended Steps

### Step 1: Check Current State

```bash
# On server
ssh root@147.93.89.178
psql linkuup_db -c "
SELECT 
    COUNT(*) as total_salons,
    COUNT(*) FILTER (WHERE owner_id IS NOT NULL) as salons_with_owners,
    COUNT(*) FILTER (WHERE booking_enabled = true) as booking_enabled
FROM salons;"
```

### Step 2: Backup Database

```bash
# Create backup before cleanup
ssh root@147.93.89.178
pg_dump linkuup_db > /tmp/linkuup_db_backup_$(date +%Y%m%d_%H%M%S).sql
echo "Backup created successfully"
```

### Step 3: Identify Salons to Keep

```bash
# List salons with owners (these are likely your 5 salons)
ssh root@147.93.89.178
psql linkuup_db -c "
SELECT s.id, s.nome, s.cidade, u.email as owner_email, u.name as owner_name
FROM salons s
LEFT JOIN users u ON s.owner_id = u.id
WHERE s.owner_id IS NOT NULL
ORDER BY s.id;"
```

### Step 4: Run Cleanup

**If salons with owners are the ones you want to keep:**
```bash
ssh root@147.93.89.178
cd /var/www/biosearch2
python3 scripts/cleanup_database.py --auto-keep-owned
```

**If you need to specify IDs manually:**
```bash
ssh root@147.93.89.178
cd /var/www/biosearch2
python3 scripts/cleanup_database.py
# Choose option 3
# Enter IDs: 1,5,10,15,20 (your actual salon IDs)
```

### Step 5: Verify Results

```bash
ssh root@147.93.89.178
psql linkuup_db -c "
SELECT 
    COUNT(*) as total_salons,
    COUNT(*) FILTER (WHERE booking_enabled = true) as booking_enabled,
    (SELECT COUNT(*) FROM salon_services) as total_services
FROM salons;"

# List remaining salons
psql linkuup_db -c "SELECT id, nome, cidade FROM salons ORDER BY id;"
```

## What Gets Deleted

When you delete salons, the following related data is also deleted:

- ✓ Salon images
- ✓ Salon services
- ✓ Bookings
- ✓ Time slots
- ✓ Reviews

Users and base services are NOT deleted (they can be shared across salons).

## Expected Result

After cleanup:
- **Salons**: 5 (down from 1166)
- **Active**: 5
- **Booking enabled**: 0-5 (depending on your configuration)
- **Total services**: ~35 (7 services × 5 salons)

## Preventing This in the Future

To prevent importing all salons again:

### Option 1: Don't Use Import Scripts in Production

The import scripts are for initial setup only. After setup:
- Add new salons through the admin interface
- Or use the manager interface for salon owners

### Option 2: Create Limited Import Script

Create a script that imports only specific salons:

```python
# scripts/import_specific_salons.py
import pandas as pd
from backend.app import app, db, Salon

# List of salon names or codes to import
SALONS_TO_IMPORT = [
    'Salon Name 1',
    'Salon Name 2',
    'Salon Name 3',
    'Salon Name 4',
    'Salon Name 5'
]

with app.app_context():
    df = pd.read_excel('Clientes.xlsx')
    filtered = df[df['Nome'].isin(SALONS_TO_IMPORT)]
    # ... import only these salons
```

## Rollback

If something goes wrong:

```bash
# Restore from backup
ssh root@147.93.89.178
psql linkuup_db < /tmp/linkuup_db_backup_YYYYMMDD_HHMMSS.sql
```

## Quick Reference Commands

```bash
# Count salons
psql linkuup_db -c "SELECT COUNT(*) FROM salons;"

# List all salons with owners
psql linkuup_db -c "SELECT s.id, s.nome, u.email FROM salons s LEFT JOIN users u ON s.owner_id = u.id WHERE s.owner_id IS NOT NULL;"

# Delete all salons without owners (SQL)
psql linkuup_db -c "DELETE FROM salons WHERE owner_id IS NULL;"

# Show database size
psql linkuup_db -c "SELECT pg_size_pretty(pg_database_size('linkuup_db'));"
```

---

**Status**: Ready to clean up  
**Risk Level**: Medium (make backup first!)  
**Estimated Time**: 2-5 minutes  
**Recommended**: Option 1 (keep only salons with owners)

