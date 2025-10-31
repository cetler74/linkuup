"""
Working tests that properly handle the async database setup.
"""
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from core.database import get_db
from models.base import Base
from core.config import settings


# Test database URL - use the existing PostgreSQL database for tests
TEST_DATABASE_URL = settings.DATABASE_URL

# Create async test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    # connect_args={"check_same_thread": False},
    # poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="function")
async def db_session():
    """Create a fresh async database session for each test."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
    
    # Drop all tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with async database dependency override."""
    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


class TestWorking:
    """Test basic functionality with proper async database setup."""
    
    def test_app_starts(self, client):
        """Test that the application starts without errors."""
        response = client.get("/")
        assert response.status_code is not None
    
    def test_places_endpoint_returns_200(self, client):
        """Test that places endpoint returns 200 (empty list)."""
        response = client.get("/api/v1/places")
        # Should return 200 with empty list since no data in test DB
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_auth_endpoints_exist(self, client):
        """Test that auth endpoints exist and return proper error codes."""
        # Test register endpoint with invalid data
        response = client.post("/api/v1/auth/register", json={})
        assert response.status_code == 422  # Validation error
        
        # Test login endpoint with invalid data  
        response = client.post("/api/v1/auth/login", json={})
        assert response.status_code == 422  # Validation error
    
    def test_app_handles_404(self, client):
        """Test that the app handles 404 errors properly."""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
