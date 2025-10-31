"""
Pytest configuration and fixtures for the LinkUup backend tests.
"""
import asyncio
import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from httpx import AsyncClient

from main import app
from core.database import get_db, Base
from core.config import settings
from models.user import User
from models.place_existing import Place, PlaceImage, Service, PlaceService
from models.base import Base
from ..models.booking import Booking
# from models.business import Business  # Commented out - using Place model instead


# Test database URL - use the existing PostgreSQL database for tests
TEST_DATABASE_URL = settings.DATABASE_URL

# Create async test engine
test_engine = create_async_engine(TEST_DATABASE_URL)

TestingSessionLocal = sessionmaker(
    class_=AsyncSession,
    bind=test_engine,
    expire_on_commit=False
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Set up and tear down the test database schema once per session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        for tbl in reversed(Base.metadata.sorted_tables):
            await conn.execute(tbl.delete())
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create a fresh database session for each test."""
    async with TestingSessionLocal() as session:
        yield session
        await session.close()


@pytest.fixture(scope="function")
def client():
    """Create a test client with database dependency override."""
    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def async_client():
    """Create an async test client."""
    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+1234567890"
    }


@pytest.fixture
def sample_place_data():
    """Sample place data for testing."""
    return {
        "name": "Test Salon",
        "description": "A test salon for testing purposes",
        "address": "123 Test Street",
        "city": "Test City",
        "postal_code": "12345",
        "phone": "+1234567890",
        "email": "salon@test.com",
        "website": "https://test-salon.com",
        "latitude": 40.7128,
        "longitude": -74.0060
    }


@pytest.fixture
def sample_service_data():
    """Sample service data for testing."""
    return {
        "name": "Test Service",
        "description": "A test service for testing purposes",
        "price": 50.00,
        "duration": 60,
        "category": "Nail Care"
    }


@pytest.fixture
def sample_booking_data():
    """Sample booking data for testing."""
    return {
        "customer_name": "Test Customer",
        "customer_email": "customer@test.com",
        "customer_phone": "+1234567890",
        "service_id": 1,
        "booking_date": "2024-12-25",
        "booking_time": "10:00:00",
        "notes": "Test booking"
    }


@pytest.fixture
def auth_headers(client, sample_user_data):
    """Create authentication headers for testing."""
    # Register user
    response = client.post("/api/v1/auth/register", json=sample_user_data)
    assert response.status_code == 201
    
    # Login user
    login_data = {
        "email": sample_user_data["email"],
        "password": sample_user_data["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def authenticated_user(client, auth_headers):
    """Create an authenticated user for testing."""
    return {
        "client": client,
        "headers": auth_headers,
        "user_id": 1  # Assuming first user gets ID 1
    }
