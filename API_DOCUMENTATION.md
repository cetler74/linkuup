# LinkUup FastAPI Documentation

## Overview

LinkUup is a comprehensive business management platform built with FastAPI, providing APIs for business owners, mobile applications, and public access. The API is structured with version control and organized endpoints.

## Base URL

- **Development**: `http://localhost:5001`
- **Production**: `https://your-domain.com`

## API Versioning

All endpoints are under `/api/v1/` with the following structure:
- `/api/v1/auth/` - Authentication endpoints
- `/api/v1/owner/` - Business owner management endpoints
- `/api/v1/mobile/` - Mobile-optimized endpoints
- `/api/v1/places/` - Public places endpoints

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with the following flow:

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`
3. **Refresh Token**: `POST /api/v1/auth/refresh`
4. **Validate Token**: `GET /api/v1/auth/validate`
5. **Get User Info**: `GET /api/v1/auth/me`
6. **Logout**: `POST /api/v1/auth/logout`

### Authentication Headers

```http
Authorization: Bearer <access_token>
```

## Rate Limiting

The API implements rate limiting with the following limits:

- **Authentication**: 5 login attempts/minute, 3 registrations/hour
- **Mobile Read**: 500 requests/hour
- **Write Operations**: 100 requests/hour
- **Standard**: 300 requests/hour

## Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "customer_id": "optional_customer_id",
  "gdpr_data_processing_consent": true,
  "gdpr_marketing_consent": false
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "customer_id": "optional_customer_id",
    "is_admin": false,
    "is_business_owner": false,
    "user_type": "customer",
    "gdpr_data_processing_consent": true,
    "gdpr_marketing_consent": false
  },
  "tokens": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  },
  "gdpr": {
    "data_processing_consent": true,
    "marketing_consent": false
  }
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Owner Management Endpoints

#### Places Management

**Get All Places**
```http
GET /api/v1/owner/places/
Authorization: Bearer <access_token>
```

**Create Place**
```http
POST /api/v1/owner/places/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Salon",
  "sector": "beauty",
  "description": "Full-service beauty salon",
  "address": "123 Main St",
  "city": "New York",
  "postal_code": "10001",
  "phone": "+1234567890",
  "email": "contact@mysalon.com",
  "location_type": "fixed",
  "booking_enabled": true,
  "call_enabled": true,
  "message_enabled": true,
  "rewards_enabled": false,
  "reviews_enabled": true,
  "customers_enabled": false,
  "service_areas": null
}
```

**Get Specific Place**
```http
GET /api/v1/owner/places/{place_id}
Authorization: Bearer <access_token>
```

**Update Place**
```http
PUT /api/v1/owner/places/{place_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Salon Name",
  "description": "Updated description"
}
```

**Delete Place**
```http
DELETE /api/v1/owner/places/{place_id}
Authorization: Bearer <access_token>
```

**Update Place Location**
```http
PUT /api/v1/owner/places/{place_id}/location
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "location_type": "mobile",
  "service_areas": ["Area 1", "Area 2", "Area 3"]
}
```

#### Services Management

**Get Place Services**
```http
GET /api/v1/owner/services/places/{place_id}/services
Authorization: Bearer <access_token>
```

**Create Service**
```http
POST /api/v1/owner/services/places/{place_id}/services
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Haircut",
  "description": "Professional haircut service",
  "price": "25.00",
  "duration": 30,
  "is_bookable": true
}
```

**Get Service**
```http
GET /api/v1/owner/services/{service_id}
Authorization: Bearer <access_token>
```

**Update Service**
```http
PUT /api/v1/owner/services/{service_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Service Name",
  "price": "30.00"
}
```

**Delete Service**
```http
DELETE /api/v1/owner/services/{service_id}
Authorization: Bearer <access_token>
```

**Assign Employee to Service**
```http
POST /api/v1/owner/services/{service_id}/employees
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "employee_id": 1
}
```

**Remove Employee from Service**
```http
DELETE /api/v1/owner/services/{service_id}/employees/{employee_id}
Authorization: Bearer <access_token>
```

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message description"
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **429**: Rate Limit Exceeded
- **500**: Internal Server Error

### Rate Limiting Error

```json
{
  "detail": "Rate limit exceeded: 5 per 1 minute"
}
```

## GDPR Compliance

The API includes GDPR compliance features:

- **Data Processing Consent**: Required for registration
- **Marketing Consent**: Optional, defaults to false
- **Consent Tracking**: Timestamps and versions stored
- **User Rights**: Data access, modification, and deletion

## Database Schema

The API uses PostgreSQL with the following main tables:

- **users**: User accounts and authentication
- **businesses**: Business/place information
- **business_employees**: Employee management
- **business_services**: Service offerings
- **business_bookings**: Appointment scheduling
- **business_messages**: Customer communication
- **campaigns**: Marketing campaigns

## Development

### Running the API

```bash
# Development
./start.sh

# Production
./start_production.sh
```

### Environment Variables

See `env.example` for required environment variables.

### API Documentation

- **Swagger UI**: `http://localhost:5001/api/v1/docs`
- **ReDoc**: `http://localhost:5001/api/v1/redoc`
- **OpenAPI JSON**: `http://localhost:5001/api/v1/openapi.json`

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation with Pydantic
- SQL injection protection with SQLAlchemy ORM

## Performance Features

- Async/await for non-blocking operations
- Connection pooling
- Query optimization
- Caching support
- Mobile-optimized endpoints
