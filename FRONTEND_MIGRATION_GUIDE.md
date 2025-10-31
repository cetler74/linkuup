# Frontend Migration Guide: Flask to FastAPI

## Overview

This guide covers the necessary changes to update the frontend to work with the new FastAPI backend. The main changes involve URL structure updates, authentication flow modifications, and error handling adjustments.

## Key Changes Summary

### 1. API Base URL Changes
- **Old**: `/api/` or `/api/owner/`
- **New**: `/api/v1/` for all endpoints

### 2. Authentication Changes
- JWT tokens remain the same format
- New refresh token endpoint
- Enhanced GDPR compliance in registration

### 3. Response Format Changes
- Error responses now use `detail` instead of `error`/`message`
- Consistent JSON structure across all endpoints

## Detailed Migration Steps

### 1. Update API Base URLs

#### Old Flask API Calls
```javascript
// Old API calls
const API_BASE = '/api';
const OWNER_API_BASE = '/api/owner';

// Examples
fetch('/api/owner/places')
fetch('/api/v1/auth/login')
```

#### New FastAPI API Calls
```javascript
// New API calls
const API_BASE = '/api/v1';
const OWNER_API_BASE = '/api/v1/owner';

// Examples
fetch('/api/v1/owner/places')
fetch('/api/v1/auth/login')
```

### 2. Authentication Updates

#### Update API Client Configuration
```javascript
// api/client.js
class APIClient {
  constructor() {
    this.baseURL = '/api/v1';  // Updated from '/api'
    this.token = localStorage.getItem('access_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  }
}
```

#### Update Authentication Service
```javascript
// services/auth.js
class AuthService {
  constructor() {
    this.apiClient = new APIClient();
  }

  async register(userData) {
    // Updated registration with GDPR fields
    const response = await this.apiClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        customer_id: userData.customer_id,
        gdpr_data_processing_consent: true,  // Required
        gdpr_marketing_consent: userData.marketing_consent || false
      })
    });

    // Store tokens
    localStorage.setItem('access_token', response.tokens.access_token);
    localStorage.setItem('refresh_token', response.tokens.refresh_token);
    
    return response;
  }

  async login(email, password) {
    const response = await this.apiClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // Store tokens
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    
    return response;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await this.apiClient.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    localStorage.setItem('access_token', response.access_token);
    return response;
  }

  async logout() {
    await this.apiClient.request('/auth/logout', { method: 'POST' });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async getCurrentUser() {
    return await this.apiClient.request('/auth/me');
  }
}
```

### 3. Owner API Updates

#### Places Management
```javascript
// services/places.js
class PlacesService {
  constructor() {
    this.apiClient = new APIClient();
  }

  async getPlaces() {
    return await this.apiClient.request('/owner/places/');
  }

  async getPlace(placeId) {
    return await this.apiClient.request(`/owner/places/${placeId}`);
  }

  async createPlace(placeData) {
    return await this.apiClient.request('/owner/places/', {
      method: 'POST',
      body: JSON.stringify(placeData)
    });
  }

  async updatePlace(placeId, placeData) {
    return await this.apiClient.request(`/owner/places/${placeId}`, {
      method: 'PUT',
      body: JSON.stringify(placeData)
    });
  }

  async deletePlace(placeId) {
    return await this.apiClient.request(`/owner/places/${placeId}`, {
      method: 'DELETE'
    });
  }

  async updatePlaceLocation(placeId, locationData) {
    return await this.apiClient.request(`/owner/places/${placeId}/location`, {
      method: 'PUT',
      body: JSON.stringify(locationData)
    });
  }
}
```

#### Services Management
```javascript
// services/services.js
class ServicesService {
  constructor() {
    this.apiClient = new APIClient();
  }

  async getPlaceServices(placeId) {
    return await this.apiClient.request(`/owner/services/places/${placeId}/services`);
  }

  async createService(placeId, serviceData) {
    return await this.apiClient.request(`/owner/services/places/${placeId}/services`, {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
  }

  async getService(serviceId) {
    return await this.apiClient.request(`/owner/services/${serviceId}`);
  }

  async updateService(serviceId, serviceData) {
    return await this.apiClient.request(`/owner/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData)
    });
  }

  async deleteService(serviceId) {
    return await this.apiClient.request(`/owner/services/${serviceId}`, {
      method: 'DELETE'
    });
  }

  async assignEmployeeToService(serviceId, employeeId) {
    return await this.apiClient.request(`/owner/services/${serviceId}/employees`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId })
    });
  }

  async removeEmployeeFromService(serviceId, employeeId) {
    return await this.apiClient.request(`/owner/services/${serviceId}/employees/${employeeId}`, {
      method: 'DELETE'
    });
  }
}
```

#### Bookings Management
```javascript
// services/bookings.js
class BookingsService {
  constructor() {
    this.apiClient = new APIClient();
  }

  async getPlaceBookings(placeId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status_filter', filters.status);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    
    const queryString = params.toString();
    const endpoint = `/owner/bookings/places/${placeId}/bookings${queryString ? `?${queryString}` : ''}`;
    
    return await this.apiClient.request(endpoint);
  }

  async createBooking(placeId, bookingData) {
    return await this.apiClient.request(`/owner/bookings/places/${placeId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async getBooking(bookingId) {
    return await this.apiClient.request(`/owner/bookings/${bookingId}`);
  }

  async updateBooking(bookingId, bookingData) {
    return await this.apiClient.request(`/owner/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData)
    });
  }

  async cancelBooking(bookingId) {
    return await this.apiClient.request(`/owner/bookings/${bookingId}`, {
      method: 'DELETE'
    });
  }

  async acceptBooking(bookingId) {
    return await this.apiClient.request(`/owner/bookings/${bookingId}/accept`, {
      method: 'PUT'
    });
  }

  async assignEmployeeToBooking(bookingId, employeeId) {
    return await this.apiClient.request(`/owner/bookings/${bookingId}/assign-employee`, {
      method: 'PUT',
      body: JSON.stringify({ employee_id: employeeId })
    });
  }
}
```

### 4. Mobile API Updates

#### Mobile Salons
```javascript
// services/mobile/salons.js
class MobileSalonsService {
  constructor() {
    this.apiClient = new APIClient();
  }

  async getSalonsMinimal(filters = {}) {
    const params = new URLSearchParams();
    if (filters.sector) params.append('sector', filters.sector);
    if (filters.city) params.append('city', filters.city);
    
    const queryString = params.toString();
    const endpoint = `/mobile/salons/minimal${queryString ? `?${queryString}` : ''}`;
    
    return await this.apiClient.request(endpoint);
  }

  async getSalonDetails(salonId) {
    return await this.apiClient.request(`/mobile/salons/${salonId}/details`);
  }

  async searchSalons(query, filters = {}) {
    const params = new URLSearchParams({ q: query });
    if (filters.sector) params.append('sector', filters.sector);
    if (filters.city) params.append('city', filters.city);
    
    return await this.apiClient.request(`/mobile/salons/search?${params.toString()}`);
  }

  async getSalonServices(salonId) {
    return await this.apiClient.request(`/mobile/salons/${salonId}/services`);
  }

  async getSalonEmployees(salonId) {
    return await this.apiClient.request(`/mobile/salons/${salonId}/employees`);
  }

  async getNearbySalons(latitude, longitude, radius = 5.0, sector = null) {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString()
    });
    if (sector) params.append('sector', sector);
    
    return await this.apiClient.request(`/mobile/salons/nearby?${params.toString()}`);
  }
}
```

#### Mobile Bookings
```javascript
// services/mobile/bookings.js
class MobileBookingsService {
  constructor() {
    this.apiClient = new APIClient();
  }

  async createBooking(bookingData) {
    return await this.apiClient.request('/mobile/bookings/', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async getUserBookings(statusFilter = null) {
    const endpoint = statusFilter 
      ? `/mobile/bookings/user?status_filter=${statusFilter}`
      : '/mobile/bookings/user';
    
    return await this.apiClient.request(endpoint);
  }

  async getUserBooking(bookingId) {
    return await this.apiClient.request(`/mobile/bookings/${bookingId}`);
  }

  async cancelUserBooking(bookingId) {
    return await this.apiClient.request(`/mobile/bookings/${bookingId}/cancel`, {
      method: 'PUT'
    });
  }

  async getUpcomingBookings() {
    return await this.apiClient.request('/mobile/bookings/user/upcoming');
  }
}
```

### 5. Error Handling Updates

#### Update Error Handling
```javascript
// utils/errorHandler.js
class ErrorHandler {
  static handleAPIError(error) {
    if (error.response) {
      // API returned an error response
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return `Bad Request: ${data.detail}`;
        case 401:
          return 'Unauthorized. Please log in again.';
        case 403:
          return 'Access denied.';
        case 404:
          return 'Resource not found.';
        case 422:
          return `Validation Error: ${data.detail}`;
        case 429:
          return 'Rate limit exceeded. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return data.detail || 'An error occurred';
      }
    } else if (error.request) {
      return 'Network error. Please check your connection.';
    } else {
      return error.message || 'An unexpected error occurred';
    }
  }
}
```

### 6. Environment Configuration Updates

#### Update Environment Variables
```javascript
// config/environment.js
const config = {
  development: {
    API_BASE_URL: 'http://localhost:5001/api/v1',
    WS_BASE_URL: 'ws://localhost:5001'
  },
  production: {
    API_BASE_URL: 'https://your-domain.com/api/v1',
    WS_BASE_URL: 'wss://your-domain.com'
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

### 7. Component Updates

#### Update React Components
```jsx
// components/PlacesList.jsx
import React, { useState, useEffect } from 'react';
import { PlacesService } from '../services/places';

const PlacesList = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const placesService = new PlacesService();

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        const data = await placesService.getPlaces();
        setPlaces(data);
      } catch (err) {
        setError(ErrorHandler.handleAPIError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Places</h2>
      {places.map(place => (
        <div key={place.id}>
          <h3>{place.name}</h3>
          <p>{place.sector} - {place.city}</p>
          <p>Booking: {place.booking_enabled ? 'Enabled' : 'Disabled'}</p>
        </div>
      ))}
    </div>
  );
};

export default PlacesList;
```

### 8. Testing Updates

#### Update API Tests
```javascript
// tests/api.test.js
import { APIClient } from '../services/api/client';

describe('API Client', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new APIClient();
  });

  test('should handle authentication', async () => {
    const mockResponse = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await apiClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });

    expect(result).toEqual(mockResponse);
  });

  test('should handle API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Bad Request' })
    });

    await expect(apiClient.request('/invalid-endpoint')).rejects.toThrow('Bad Request');
  });
});
```

## Migration Checklist

### Frontend Updates Required

- [ ] Update all API base URLs from `/api/` to `/api/v1/`
- [ ] Update authentication service to handle new JWT flow
- [ ] Update error handling for new response format
- [ ] Update all service classes with new endpoint paths
- [ ] Update React components to use new service methods
- [ ] Update environment configuration
- [ ] Update API tests
- [ ] Test all frontend functionality with new backend
- [ ] Update documentation and README files

### Breaking Changes to Address

1. **URL Structure**: All endpoints now use `/api/v1/` prefix
2. **Error Format**: Errors now use `detail` field instead of `error`/`message`
3. **Authentication**: Enhanced registration with GDPR compliance
4. **Response Format**: Consistent JSON structure across all endpoints

### Testing Strategy

1. **Unit Tests**: Update all API service tests
2. **Integration Tests**: Test frontend-backend communication
3. **E2E Tests**: Test complete user workflows
4. **Performance Tests**: Verify async performance improvements

## Rollback Plan

If issues arise during frontend migration:

1. **Backend Rollback**: Switch back to Flask endpoints
2. **Frontend Rollback**: Revert to old API client configuration
3. **Database Rollback**: Restore from backup if needed
4. **Deployment Rollback**: Use previous deployment version

## Support

For migration issues:

1. Check FastAPI documentation at `/api/v1/docs`
2. Review error logs for detailed error messages
3. Test endpoints individually using Swagger UI
4. Verify environment configuration
5. Check network connectivity and CORS settings
