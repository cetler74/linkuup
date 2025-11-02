from logging.config import fileConfig
import os
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Try multiple paths for .env file
    env_paths = [
        Path(__file__).parent.parent / '.env',  # backend/.env
        Path(__file__).parent.parent.parent / '.env',  # project root/.env
        Path.cwd() / '.env',  # current directory
    ]
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            break
except ImportError:
    pass  # dotenv not installed, continue without it

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override sqlalchemy.url with DATABASE_URL from environment if available
database_url = os.getenv('DATABASE_URL')
if database_url:
    # Convert postgresql+asyncpg:// to postgresql:// for alembic (Alembic uses sync driver)
    database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')
    config.set_main_option('sqlalchemy.url', database_url)
    print(f"Using DATABASE_URL from environment: {database_url.split('@')[1] if '@' in database_url else 'configured'}")  # Don't print full password

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.place_existing import Base
from models.user import Base as UserBase
from models.base import Base as AppBase

# Combine all metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
