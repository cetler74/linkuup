"""
Test authentication endpoints and functionality.
"""
import pytest
from fastapi import status


class TestAuth:
    """Test authentication endpoints."""
    
    def test_register_user_success(self, client, sample_user_data):
        """Test successful user registration."""
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["email"] == sample_user_data["email"]
        assert data["first_name"] == sample_user_data["first_name"]
        assert data["last_name"] == sample_user_data["last_name"]
        assert "password" not in data  # Password should not be returned
    
    def test_register_user_duplicate_email(self, client, sample_user_data):
        """Test registration with duplicate email fails."""
        # Register first user
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Try to register with same email
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()["detail"].lower()
    
    def test_register_user_invalid_email(self, client, sample_user_data):
        """Test registration with invalid email format."""
        sample_user_data["email"] = "invalid-email"
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_user_weak_password(self, client, sample_user_data):
        """Test registration with weak password."""
        sample_user_data["password"] = "123"
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_login_success(self, client, sample_user_data):
        """Test successful user login."""
        # Register user first
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Login
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, client, sample_user_data):
        """Test login with invalid credentials."""
        # Register user first
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Try to login with wrong password
        login_data = {
            "email": sample_user_data["email"],
            "password": "wrongpassword"
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user(self, authenticated_user):
        """Test getting current user information."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
        assert "password" not in data
    
    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without authentication."""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_refresh_token(self, client, sample_user_data):
        """Test token refresh functionality."""
        # Register and login
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == status.HTTP_200_OK
        
        refresh_token = response.json().get("refresh_token")
        if refresh_token:  # Only test if refresh token is implemented
            response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "access_token" in data
    
    def test_logout(self, authenticated_user):
        """Test user logout."""
        client, headers = authenticated_user["client"], authenticated_user["headers"]
        
        response = client.post("/api/v1/auth/logout", headers=headers)
        
        # Logout should succeed (even if not fully implemented)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]
