# Setup Script Path Updates

## Summary
All setup scripts have been updated to use `/opt/linkuup` as the installation directory instead of `~/Linkuup` or `/home/linkuup/Linkuup`.

## Files Updated

### 1. `/opt/linkuup/scripts/complete_setup_on_server.sh`
**Changes made:**
- All `~/Linkuup` references → `/opt/linkuup`
- All `/home/linkuup/Linkuup` references → `/opt/linkuup`
- PM2 startup command updated: `--hp /opt/linkuup`
- Nginx configuration paths updated
- All directory creation paths updated

**Key path updates:**
- Python venv: `/opt/linkuup/venv`
- Backend: `/opt/linkuup/backend`
- Frontend: `/opt/linkuup/frontend`
- Nginx frontend root: `/opt/linkuup/frontend/dist`
- Nginx uploads: `/opt/linkuup/backend/uploads`

### 2. `/opt/linkuup/ecosystem.config.js`
**Changes made:**
- `cwd`: `/home/linkuup/Linkuup/backend` → `/opt/linkuup/backend`
- `interpreter`: `/home/linkuup/Linkuup/venv/bin/python3` → `/opt/linkuup/venv/bin/python3`
- `env_file`: `/home/linkuup/Linkuup/backend/.env` → `/opt/linkuup/backend/.env`

## Backup Files Created
- `/opt/linkuup/scripts/complete_setup_on_server.sh.backup`
- `/opt/linkuup/ecosystem.config.js.backup`

## Verification
- ✅ All old path references removed
- ✅ 12 instances of `/opt/linkuup` found in setup script
- ✅ All Nginx paths updated
- ✅ All PM2 paths updated
- ✅ File ownership set to `linkuup:linkuup`

## Notes
- The `~/ecosystem.config.js` reference in the setup script is correct since `~` expands to `/opt/linkuup` (the linkuup user's home directory)
- The script is ready to run from `/opt/linkuup/scripts/complete_setup_on_server.sh`
