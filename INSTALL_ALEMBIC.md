# Install Alembic

Alembic is not in requirements.txt, so you need to install it manually.

## On the Server

Run this command (with virtual environment activated):

```bash
cd ~/Linkuup/backend
source ../venv/bin/activate
pip install alembic==1.13.2
```

Or install the latest version:

```bash
pip install alembic
```

## After Installing

Then run migrations:

```bash
alembic upgrade head
```

## Update requirements.txt

I've updated the requirements.txt file to include alembic, so future deployments will include it automatically.

