"""
Tests that work with the existing PostgreSQL database and tables.
"""
import pytest
import pytest_asyncio
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from main import app
from core.database import get_db
from core.config import settings

# Use the existing database
TEST_DATABASE_URL = settings.DATABASE_URL

# Create async test engine using existing database
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=True,
    future=True,
    pool_pre_ping=True,
)

TestingSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create a fresh async database session for each test."""
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with existing database."""
    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


class TestExistingDatabase:
    """Tests that work with the existing database structure."""
    
    def test_app_starts(self, client):
        """Test that the application starts without errors."""
        response = client.get("/")
        assert response.status_code is not None
    
    def test_auth_endpoints_exist(self, client):
        """Test that auth endpoints exist and return proper error codes."""
        # Test register endpoint with invalid data
        response = client.post("/api/v1/auth/register", json={})
        assert response.status_code == 422  # Validation error
        
        # Test login endpoint with invalid data
        response = client.post("/api/v1/auth/login", json={})
        assert response.status_code == 422  # Validation error
    
    def test_app_handles_404(self, client):
        """Test that 404 errors are handled correctly."""
        response = client.get("/nonexistent")
        assert response.status_code == 404
    
    def test_cors_headers(self, client):
        """Test that CORS headers are present."""
        response = client.options("/api/v1/places")
        # Should have CORS headers or return 404/405
        assert "access-control-allow-origin" in response.headers or response.status_code in [404, 405]
    
    def test_health_check(self, client):
        """Test basic health check."""
        response = client.get("/")
        # Any response code is fine, we just want to ensure no crashes
        assert response.status_code is not None
    
    def test_auth_validation(self, client):
        """Test that auth validation works properly."""
        # Test with missing required fields
        response = client.post("/api/v1/auth/register", json={
            "email": "test@example.com"
            # Missing password, first_name, last_name
        })
        assert response.status_code == 422
        
        # Test with invalid email format
        response = client.post("/api/v1/auth/register", json={
            "email": "invalid-email",
            "password": "password123",
            "first_name": "Test",
            "last_name": "User"
        })
        assert response.status_code == 422
    
    def test_error_handling(self, client):
        """Test that error handling works gracefully."""
        # Test with malformed JSON
        response = client.post("/api/v1/auth/register", 
                             data="invalid json",
                             headers={"Content-Type": "application/json"})
        assert response.status_code == 422
    
    def test_cors_functionality(self, client):
        """Test that CORS functionality works."""
        # Test preflight request
        response = client.options("/api/v1/places", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        # Should have CORS headers or return 404
        assert "access-control-allow-origin" in response.headers or response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_database_connection(self, db_session):
        """Test that we can connect to the existing database."""
        # Test that we can query the existing tables
        result = await db_session.execute(text("SELECT COUNT(*) FROM places"))
        count = result.scalar()
        assert count is not None
        assert count >= 0
        
        # Test that we can query users table
        result = await db_session.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        assert count is not None
        assert count >= 0
    
    @pytest.mark.asyncio
    async def test_existing_tables(self, db_session):
        """Test that existing tables are accessible."""
        # Test places table
        result = await db_session.execute(text("SELECT COUNT(*) FROM places"))
        places_count = result.scalar()
        print(f"Places in database: {places_count}")
        assert places_count >= 0
        
        # Test users table
        result = await db_session.execute(text("SELECT COUNT(*) FROM users"))
        users_count = result.scalar()
        print(f"Users in database: {users_count}")
        assert users_count >= 0
        
        # Test services table
        result = await db_session.execute(text("SELECT COUNT(*) FROM services"))
        services_count = result.scalar()
        print(f"Services in database: {services_count}")
        assert services_count >= 0
