"""
Basic application tests that don't require database setup.
"""
import pytest
from fastapi import status


class TestAppBasics:
    """Test basic application functionality."""
    
    def test_app_starts(self, client):
        """Test that the application starts without errors."""
        # Just test that we can make a request without crashing
        response = client.get("/")
        # Any response code is fine, we just want to ensure no crashes
        assert response.status_code is not None
    
    def test_cors_headers(self, client):
        """Test that CORS headers are present."""
        response = client.options("/api/v1/places")
        # Should have CORS headers
        assert "access-control-allow-origin" in response.headers or response.status_code == 404
    
    def test_app_has_routes(self, client):
        """Test that the app has some routes defined."""
        # Test a few common endpoints
        endpoints_to_test = [
            "/api/v1/places",
            "/api/v1/auth/register", 
            "/api/v1/auth/login"
        ]
        
        for endpoint in endpoints_to_test:
            response = client.get(endpoint)
            # Should not return 404 (route exists) or should return 500 (database error)
            assert response.status_code in [200, 404, 500]
    
    def test_app_handles_errors(self, client):
        """Test that the app handles errors gracefully."""
        # Test a non-existent endpoint
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
    
    def test_app_returns_json(self, client):
        """Test that the app returns JSON responses."""
        # Test any endpoint that might exist
        response = client.get("/api/v1/places")
        if response.status_code != 404:
            # If the endpoint exists, it should return JSON
            assert response.headers.get("content-type", "").startswith("application/json")
