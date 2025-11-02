# Install PostgreSQL on Ubuntu 25.04

The `postgres` user doesn't exist because PostgreSQL isn't installed yet. Here's how to install it:

## Step 1: Install PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

## Step 2: Start and Enable PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

## Step 3: Set Up Database and User

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE linkuup_db;
CREATE USER linkuup_user WITH PASSWORD 'linkuup_secure_password_2024_change_this';
GRANT ALL PRIVILEGES ON DATABASE linkuup_db TO linkuup_user;
ALTER USER linkuup_user CREATEDB;
ALTER DATABASE linkuup_db OWNER TO linkuup_user;
\q
EOF
```

## Step 4: Verify Installation

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -d linkuup_db -c "SELECT version();"

# Test with your user
psql -U linkuup_user -d linkuup_db -h localhost -c "SELECT 1;"
```

## Troubleshooting

If you get authentication errors, update pg_hba.conf:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Change the line for local connections from `peer` to `md5`:

```
# Change this:
local   all             all                                     peer

# To this:
local   all             all                                     md5
```

Then restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

