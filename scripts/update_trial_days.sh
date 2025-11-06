#!/bin/bash
# Update trial_days in plans table
# Usage: ./update_trial_days.sh [days]

TRIAL_DAYS=${1:-5}
DB_USER="linkuup_user"
DB_NAME="linkuup_db"
DB_PASSWORD="linkuup_secure_password_2024_change_this"

export PGPASSWORD="$DB_PASSWORD"

psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<EOF
UPDATE plans SET trial_days = $TRIAL_DAYS WHERE code IN ('basic', 'pro');
SELECT id, code, name, trial_days FROM plans WHERE code IN ('basic', 'pro') ORDER BY code;
EOF

unset PGPASSWORD

echo "✅ Updated trial_days to $TRIAL_DAYS for all plans"

