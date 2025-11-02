# Fix Multiple Alembic Heads

When you have multiple head revisions in Alembic, it means there are migration branches that haven't been merged.

## Check Current Heads

```bash
cd ~/Linkuup/backend
source ../venv/bin/activate
alembic heads
```

This will show you all the head revisions.

## Option 1: Upgrade to All Heads

If you want to apply all heads:

```bash
alembic upgrade heads
```

This will apply all head revisions.

## Option 2: Merge the Heads

If you want to create a merge migration:

```bash
# First, see what heads you have
alembic heads

# Merge them (replace HEAD1 and HEAD2 with actual revision IDs)
alembic merge -m "merge migration branches" HEAD1 HEAD2

# Then upgrade
alembic upgrade head
```

## Option 3: Check History and Merge

```bash
# Show the migration history
alembic history

# See current revision
alembic current

# Merge the heads
alembic heads  # See the revision IDs
alembic merge heads -m "merge multiple heads"
alembic upgrade head
```

