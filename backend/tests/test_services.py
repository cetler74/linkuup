"""
Test services endpoints and functionality.
"""
import pytest
from fastapi import status


class TestServices:
    """Test services endpoints."""
    
    def test_get_services_public(self, client):
        """Test getting services without authentication."""
        response = client.get("/api/v1/services")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_services_by_place(self, client):
        """Test getting services for a specific place."""
        # This test assumes there's at least one place with services
        response = client.get("/api/v1/places/1/services")
        
        # Should return 200 even if place doesn't exist (empty list)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_service_authenticated(self, authenticated_user, sample_service_data):
        """Test creating a service with authentication."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # First create a place
        place_data = {
            "name": "Test Salon",
            "description": "A test salon",
            "address": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "phone": "+1234567890",
            "email": "salon@test.com",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = client.post("/api/v1/owner/places", json=place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        # Create service for the place
        service_data = sample_service_data.copy()
        service_data["place_id"] = place_id
        
        response = client.post("/api/v1/owner/services", json=service_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["name"] == sample_service_data["name"]
        assert data["price"] == sample_service_data["price"]
        assert data["duration"] == sample_service_data["duration"]
    
    def test_create_service_unauthorized(self, client, sample_service_data):
        """Test creating a service without authentication."""
        response = client.post("/api/v1/owner/services", json=sample_service_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_service_invalid_data(self, authenticated_user):
        """Test creating a service with invalid data."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        invalid_data = {
            "name": "",  # Empty name should be invalid
            "price": -10,  # Negative price should be invalid
            "duration": 0  # Zero duration should be invalid
        }
        
        response = client.post("/api/v1/owner/services", json=invalid_data, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_update_service(self, authenticated_user, sample_service_data):
        """Test updating a service."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create place and service first
        place_data = {
            "name": "Test Salon",
            "description": "A test salon",
            "address": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "phone": "+1234567890",
            "email": "salon@test.com",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = client.post("/api/v1/owner/places", json=place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        service_data = sample_service_data.copy()
        service_data["place_id"] = place_id
        
        response = client.post("/api/v1/owner/services", json=service_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        service_id = response.json()["id"]
        
        # Update the service
        updated_data = service_data.copy()
        updated_data["name"] = "Updated Service Name"
        updated_data["price"] = 75.00
        
        response = client.put(f"/api/v1/owner/services/{service_id}", json=updated_data, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == "Updated Service Name"
        assert data["price"] == 75.00
    
    def test_update_service_not_found(self, authenticated_user, sample_service_data):
        """Test updating a non-existent service."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.put("/api/v1/owner/services/99999", json=sample_service_data, headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_service(self, authenticated_user, sample_service_data):
        """Test deleting a service."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create place and service first
        place_data = {
            "name": "Test Salon",
            "description": "A test salon",
            "address": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "phone": "+1234567890",
            "email": "salon@test.com",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = client.post("/api/v1/owner/places", json=place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        service_data = sample_service_data.copy()
        service_data["place_id"] = place_id
        
        response = client.post("/api/v1/owner/services", json=service_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        service_id = response.json()["id"]
        
        # Delete the service
        response = client.delete(f"/api/v1/owner/services/{service_id}", headers=headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_get_services_by_owner(self, authenticated_user, sample_service_data):
        """Test getting services owned by the authenticated user."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create place and service
        place_data = {
            "name": "Test Salon",
            "description": "A test salon",
            "address": "123 Test Street",
            "city": "Test City",
            "postal_code": "12345",
            "phone": "+1234567890",
            "email": "salon@test.com",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = client.post("/api/v1/owner/places", json=place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        service_data = sample_service_data.copy()
        service_data["place_id"] = place_id
        
        response = client.post("/api/v1/owner/services", json=service_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Get owner's services
        response = client.get("/api/v1/owner/services", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == sample_service_data["name"]
    
    def test_service_categories(self, client):
        """Test getting services by category."""
        response = client.get("/api/v1/services", params={"category": "Nail Care"})
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_service_search(self, client):
        """Test searching services by name."""
        response = client.get("/api/v1/services", params={"search": "manicure"})
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
