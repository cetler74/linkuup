"""
Tests for the places API that works with the existing database schema.
Tests the /api/v1/places-existing endpoints.
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


class TestPlacesExistingAPI:
    """Test the places API that works with existing database schema."""
    
    def test_get_places_existing_endpoint(self, client):
        """Test the places-existing endpoint works with existing database."""
        response = client.get("/api/v1/places-existing/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return places from the existing database
    
    def test_get_places_with_filters(self, client):
        """Test places endpoint with filters using existing column names."""
        # Test with tipo filter
        response = client.get("/api/v1/places-existing/?tipo=salon")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Test with cidade filter
        response = client.get("/api/v1/places-existing/?cidade=Madrid")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Test with regiao filter
        response = client.get("/api/v1/places-existing/?regiao=Madrid")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_places_pagination(self, client):
        """Test places endpoint pagination."""
        response = client.get("/api/v1/places-existing/?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10
        
        response = client.get("/api/v1/places-existing/?limit=5&offset=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_search_places(self, client):
        """Test places search functionality."""
        response = client.get("/api/v1/places-existing/search?q=salon")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Test with minimum query length
        response = client.get("/api/v1/places-existing/search?q=a")
        assert response.status_code == 422  # Should fail validation
    
    def test_get_place_by_id(self, client):
        """Test getting a specific place by ID."""
        # First get all places to find a valid ID
        response = client.get("/api/v1/places-existing/")
        assert response.status_code == 200
        places = response.json()
        
        if places:
            place_id = places[0]["id"]
            response = client.get(f"/api/v1/places-existing/{place_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == place_id
            assert "nome" in data
            assert "tipo" in data
        else:
            # Test with non-existent ID
            response = client.get("/api/v1/places-existing/99999")
            assert response.status_code == 404
    
    def test_get_place_services(self, client):
        """Test getting services for a place."""
        # First get all places to find a valid ID
        response = client.get("/api/v1/places-existing/")
        assert response.status_code == 200
        places = response.json()
        
        if places:
            place_id = places[0]["id"]
            response = client.get(f"/api/v1/places-existing/{place_id}/services")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
        else:
            # Test with non-existent ID
            response = client.get("/api/v1/places-existing/99999/services")
            assert response.status_code == 404
    
    def test_get_place_images(self, client):
        """Test getting images for a place."""
        # First get all places to find a valid ID
        response = client.get("/api/v1/places-existing/")
        assert response.status_code == 200
        places = response.json()
        
        if places:
            place_id = places[0]["id"]
            response = client.get(f"/api/v1/places-existing/{place_id}/images")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
        else:
            # Test with non-existent ID
            response = client.get("/api/v1/places-existing/99999/images")
            assert response.status_code == 404
    
    def test_places_response_structure(self, client):
        """Test that places response has the correct structure."""
        response = client.get("/api/v1/places-existing/")
        assert response.status_code == 200
        places = response.json()
        
        if places:
            place = places[0]
            # Check that the response has the expected fields from existing schema
            expected_fields = [
                "id", "nome", "tipo", "cidade", "regiao", 
                "booking_enabled", "is_bio_diamond", "created_at"
            ]
            for field in expected_fields:
                assert field in place
    
    def test_places_filtering_combinations(self, client):
        """Test combinations of filters."""
        # Test multiple filters
        response = client.get("/api/v1/places-existing/?tipo=salon&booking_enabled=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Test bio diamond filter
        response = client.get("/api/v1/places-existing/?is_bio_diamond=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_database_connectivity_existing_schema(self, db_session):
        """Test that we can query the existing database schema."""
        # Test places table
        result = await db_session.execute(text("SELECT COUNT(*) FROM places"))
        places_count = result.scalar()
        assert places_count is not None
        assert places_count >= 0
        
        # Test services table
        result = await db_session.execute(text("SELECT COUNT(*) FROM services"))
        services_count = result.scalar()
        assert services_count is not None
        assert services_count >= 0
        
        # Test place_services table
        result = await db_session.execute(text("SELECT COUNT(*) FROM place_services"))
        place_services_count = result.scalar()
        assert place_services_count is not None
        assert place_services_count >= 0
    
    @pytest.mark.asyncio
    async def test_existing_schema_structure(self, db_session):
        """Test that the existing schema has the expected structure."""
        # Test places table structure
        result = await db_session.execute(text("SELECT id, nome, tipo, cidade FROM places LIMIT 1"))
        place = result.fetchone()
        if place:
            assert place[0] is not None  # id should not be null
            assert place[1] is not None  # nome should not be null
            assert place[2] is not None  # tipo should not be null
        
        # Test services table structure
        result = await db_session.execute(text("SELECT id, name, category FROM services LIMIT 1"))
        service = result.fetchone()
        if service:
            assert service[0] is not None  # id should not be null
            assert service[1] is not None  # name should not be null
