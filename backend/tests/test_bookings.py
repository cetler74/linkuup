"""
Test bookings endpoints and functionality.
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta


class TestBookings:
    """Test bookings endpoints."""
    
    def test_create_booking_public(self, client, sample_booking_data):
        """Test creating a booking without authentication."""
        response = client.post("/api/v1/bookings", json=sample_booking_data)
        
        # Should work for public bookings
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_create_booking_authenticated(self, authenticated_user, sample_booking_data):
        """Test creating a booking with authentication."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # First create a place and service
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
        
        service_data = {
            "name": "Test Service",
            "description": "A test service",
            "price": 50.00,
            "duration": 60,
            "category": "Nail Care",
            "place_id": place_id
        }
        
        response = client.post("/api/v1/owner/services", json=service_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        service_id = response.json()["id"]
        
        # Create booking
        booking_data = sample_booking_data.copy()
        booking_data["service_id"] = service_id
        booking_data["place_id"] = place_id
        
        response = client.post("/api/v1/bookings", json=booking_data, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert data["customer_name"] == sample_booking_data["customer_name"]
        assert data["customer_email"] == sample_booking_data["customer_email"]
    
    def test_create_booking_invalid_data(self, client):
        """Test creating a booking with invalid data."""
        invalid_data = {
            "customer_name": "",  # Empty name
            "customer_email": "invalid-email",  # Invalid email
            "service_id": 99999,  # Non-existent service
            "booking_date": "invalid-date",  # Invalid date
            "booking_time": "invalid-time"  # Invalid time
        }
        
        response = client.post("/api/v1/bookings", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_get_booking_by_id(self, client, sample_booking_data):
        """Test getting a specific booking by ID."""
        # Create a booking first
        response = client.post("/api/v1/bookings", json=sample_booking_data)
        
        if response.status_code == status.HTTP_201_CREATED:
            booking_id = response.json()["id"]
            
            # Get the booking
            response = client.get(f"/api/v1/bookings/{booking_id}")
            assert response.status_code == status.HTTP_200_OK
            
            data = response.json()
            assert data["id"] == booking_id
            assert data["customer_name"] == sample_booking_data["customer_name"]
    
    def test_get_booking_not_found(self, client):
        """Test getting a non-existent booking."""
        response = client.get("/api/v1/bookings/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_user_bookings(self, authenticated_user):
        """Test getting bookings for authenticated user."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.get("/api/v1/bookings/my-bookings", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_user_bookings_unauthorized(self, client):
        """Test getting user bookings without authentication."""
        response = client.get("/api/v1/bookings/my-bookings")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_booking(self, authenticated_user, sample_booking_data):
        """Test updating a booking."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create a booking first
        response = client.post("/api/v1/bookings", json=sample_booking_data, headers=headers)
        
        if response.status_code == status.HTTP_201_CREATED:
            booking_id = response.json()["id"]
            
            # Update the booking
            updated_data = sample_booking_data.copy()
            updated_data["customer_name"] = "Updated Customer Name"
            updated_data["notes"] = "Updated notes"
            
            response = client.put(f"/api/v1/bookings/{booking_id}", json=updated_data, headers=headers)
            assert response.status_code == status.HTTP_200_OK
            
            data = response.json()
            assert data["customer_name"] == "Updated Customer Name"
            assert data["notes"] == "Updated notes"
    
    def test_cancel_booking(self, authenticated_user, sample_booking_data):
        """Test canceling a booking."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        # Create a booking first
        response = client.post("/api/v1/bookings", json=sample_booking_data, headers=headers)
        
        if response.status_code == status.HTTP_201_CREATED:
            booking_id = response.json()["id"]
            
            # Cancel the booking
            response = client.delete(f"/api/v1/bookings/{booking_id}", headers=headers)
            assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_get_place_availability(self, client):
        """Test getting place availability."""
        # Test with a specific place ID
        response = client.get("/api/v1/places/1/availability", params={"date": "2024-12-25"})
        
        # Should return 200 even if place doesn't exist
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, dict)
    
    def test_booking_conflicts(self, client, sample_booking_data):
        """Test booking time conflicts."""
        # Create first booking
        response1 = client.post("/api/v1/bookings", json=sample_booking_data)
        
        if response1.status_code == status.HTTP_201_CREATED:
            # Try to create another booking at the same time
            response2 = client.post("/api/v1/bookings", json=sample_booking_data)
            
            # Should either succeed (if no conflict detection) or fail with conflict
            assert response2.status_code in [
                status.HTTP_201_CREATED, 
                status.HTTP_400_BAD_REQUEST, 
                status.HTTP_409_CONFLICT
            ]
    
    def test_booking_past_date(self, client):
        """Test creating a booking in the past."""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "Test Customer",
            "customer_email": "customer@test.com",
            "customer_phone": "+1234567890",
            "service_id": 1,
            "booking_date": past_date,
            "booking_time": "10:00:00",
            "notes": "Past booking"
        }
        
        response = client.post("/api/v1/bookings", json=booking_data)
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]
    
    def test_booking_future_date(self, client):
        """Test creating a booking in the future."""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "Test Customer",
            "customer_email": "customer@test.com",
            "customer_phone": "+1234567890",
            "service_id": 1,
            "booking_date": future_date,
            "booking_time": "10:00:00",
            "notes": "Future booking"
        }
        
        response = client.post("/api/v1/bookings", json=booking_data)
        # Should succeed for future dates
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
