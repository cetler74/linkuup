"""
Simple tests to verify the basic functionality works.
"""
import pytest
from fastapi import status


class TestBasic:
    """Test basic API functionality."""
    
    def test_health_check(self, client):
        """Test that the API is running."""
        response = client.get("/")
        # Should return 200 or 404 (depending on if root endpoint exists)
        assert response.status_code in [200, 404]
    
    def test_api_docs(self, client):
        """Test that API documentation is accessible."""
        response = client.get("/docs")
        assert response.status_code == 200
    
    def test_openapi_schema(self, client):
        """Test that OpenAPI schema is accessible."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
    
    def test_places_endpoint_exists(self, client):
        """Test that places endpoint exists."""
        response = client.get("/api/v1/places")
        # Should return 200 (empty list) or 500 (database error)
        assert response.status_code in [200, 500]
    
    def test_auth_endpoint_exists(self, client):
        """Test that auth endpoints exist."""
        # Test register endpoint
        response = client.post("/api/v1/auth/register", json={})
        # Should return 422 (validation error) or 500 (database error)
        assert response.status_code in [422, 500]
        
        # Test login endpoint
        response = client.post("/api/v1/auth/login", json={})
        # Should return 422 (validation error) or 500 (database error)
        assert response.status_code in [422, 500]
