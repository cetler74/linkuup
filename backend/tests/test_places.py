"""
Test places (salons) endpoints and functionality.
"""
import pytest
from fastapi import status


class TestPlaces:
    """Test places/salons endpoints."""
    
    def test_get_places_public(self, client):
        """Test getting places without authentication."""
        response = client.get("/api/v1/places")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_places_with_filters(self, client):
        """Test getting places with search filters."""
        params = {
            "search": "test",
            "city": "Test City",
            "limit": 10,
            "offset": 0
        }
        response = client.get("/api/v1/places", params=params)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_place_by_id(self, client, sample_place_data, authenticated_user):
        """Test getting a specific place by ID."""
        # Create a place first
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.post("/api/v1/owner/places", json=sample_place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        # Get the place
        response = client.get(f"/api/v1/places/{place_id}")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == place_id
        assert data["name"] == sample_place_data["name"]
    
    def test_get_place_not_found(self, client):
        """Test getting a non-existent place."""
        response = client.get("/api/v1/places/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_place_authenticated(self, authenticated_user, sample_place_data):
        """Test creating a place with authentication."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.post("/api/v1/owner/places", json=sample_place_data, headers=headers)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == sample_place_data["name"]
        assert data["address"] == sample_place_data["address"]
        assert "id" in data
    
    def test_create_place_unauthorized(self, client, sample_place_data):
        """Test creating a place without authentication."""
        response = client.post("/api/v1/owner/places", json=sample_place_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_place_invalid_data(self, authenticated_user):
        """Test creating a place with invalid data."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        invalid_data = {
            "name": "",  # Empty name should be invalid
            "address": "Test Address"
        }
        
        response = client.post("/api/v1/owner/places", json=invalid_data, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_update_place(self, authenticated_user, sample_place_data):
        """Test updating a place."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create a place first
        response = client.post("/api/v1/owner/places", json=sample_place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        # Update the place
        updated_data = sample_place_data.copy()
        updated_data["name"] = "Updated Salon Name"
        
        response = client.put(f"/api/v1/owner/places/{place_id}", json=updated_data, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == "Updated Salon Name"
    
    def test_update_place_not_found(self, authenticated_user, sample_place_data):
        """Test updating a non-existent place."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.put("/api/v1/owner/places/99999", json=sample_place_data, headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_place(self, authenticated_user, sample_place_data):
        """Test deleting a place."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create a place first
        response = client.post("/api/v1/owner/places", json=sample_place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        place_id = response.json()["id"]
        
        # Delete the place
        response = client.delete(f"/api/v1/owner/places/{place_id}", headers=headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify place is deleted
        response = client.get(f"/api/v1/places/{place_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_places_by_owner(self, authenticated_user, sample_place_data):
        """Test getting places owned by the authenticated user."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create a place
        response = client.post("/api/v1/owner/places", json=sample_place_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Get owner's places
        response = client.get("/api/v1/owner/places", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == sample_place_data["name"]
    
    def test_place_search_functionality(self, client):
        """Test place search functionality."""
        # Test search by name
        response = client.get("/api/v1/places", params={"search": "salon"})
        assert response.status_code == status.HTTP_200_OK
        
        # Test search by city
        response = client.get("/api/v1/places", params={"city": "Lisbon"})
        assert response.status_code == status.HTTP_200_OK
        
        # Test search by region
        response = client.get("/api/v1/places", params={"region": "Lisbon"})
        assert response.status_code == status.HTTP_200_OK
    
    def test_place_pagination(self, client):
        """Test place pagination."""
        # Test with limit
        response = client.get("/api/v1/places", params={"limit": 5})
        assert response.status_code == status.HTTP_200_OK
        
        # Test with offset
        response = client.get("/api/v1/places", params={"offset": 10, "limit": 5})
        assert response.status_code == status.HTTP_200_OK
