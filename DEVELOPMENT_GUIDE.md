# LinkUup FastAPI Development Guide

## Getting Started

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Node.js 16+ (for frontend)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Linkuup
```

2. **Set up Python environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Set up database**
```bash
# Create database
createdb linkuup_db

# Run migrations (if available)
# alembic upgrade head
```

4. **Configure environment**
```bash
cp env.example .env
# Edit .env with your database credentials
```

5. **Start the development server**
```bash
./start.sh
```

The API will be available at `http://localhost:5001`

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── core/                   # Core application modules
│   ├── config.py          # Configuration settings
│   ├── database.py        # Database connection
│   ├── security.py        # Authentication utilities
│   └── dependencies.py    # FastAPI dependencies
├── models/                 # SQLAlchemy models
│   ├── base.py           # Base model class
│   ├── user.py           # User model
│   └── business.py       # Business models
├── schemas/               # Pydantic schemas
│   ├── user.py           # User schemas
│   ├── business.py       # Business schemas
│   └── auth.py           # Authentication schemas
├── api/                   # API endpoints
│   └── v1/               # API version 1
│       ├── auth.py       # Authentication endpoints
│       ├── owner/        # Owner management endpoints
│       │   ├── places.py
│       │   ├── services.py
│       │   ├── employees.py
│       │   ├── bookings.py
│       │   ├── campaigns.py
│       │   └── messages.py
│       ├── mobile/       # Mobile-optimized endpoints
│       │   ├── salons.py
│       │   ├── bookings.py
│       │   ├── sync.py
│       │   └── images.py
│       └── places.py     # Public places endpoints
├── services/             # Business logic services
├── tests/               # Test files
└── requirements.txt     # Python dependencies
```

## Development Workflow

### 1. Adding New Endpoints

#### Create a new router
```python
# api/v1/new_feature.py
from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from schemas.new_feature import NewFeatureCreate, NewFeatureResponse

router = APIRouter()

@router.post("/", response_model=NewFeatureResponse)
async def create_new_feature(
    feature_data: NewFeatureCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Implementation
    pass
```

#### Register the router in main.py
```python
# main.py
from api.v1 import new_feature

app.include_router(
    new_feature.router, 
    prefix=f"{settings.API_V1_STR}/new-feature", 
    tags=["New Feature"]
)
```

### 2. Adding New Models

#### Create the model
```python
# models/new_model.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .base import Base

class NewModel(Base):
    __tablename__ = 'new_models'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

#### Create the schema
```python
# schemas/new_model.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class NewModelBase(BaseModel):
    name: str

class NewModelCreate(NewModelBase):
    pass

class NewModelResponse(NewModelBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
```

### 3. Database Operations

#### Async Database Queries
```python
from sqlalchemy import select, insert, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

# Create
async def create_item(db: AsyncSession, item_data: ItemCreate):
    item = Item(**item_data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

# Read
async def get_item(db: AsyncSession, item_id: int):
    result = await db.execute(select(Item).where(Item.id == item_id))
    return result.scalar_one_or_none()

# Update
async def update_item(db: AsyncSession, item_id: int, item_data: ItemUpdate):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if item:
        update_data = item_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)
        await db.commit()
        await db.refresh(item)
    return item

# Delete
async def delete_item(db: AsyncSession, item_id: int):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
    return item
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=backend tests/

# Run with verbose output
pytest -v
```

### Writing Tests

#### Test Authentication
```python
# tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register_user():
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User",
        "gdpr_data_processing_consent": True
    })
    assert response.status_code == 201
    assert "access_token" in response.json()["tokens"]

def test_login_user():
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

#### Test Protected Endpoints
```python
# tests/test_owner_api.py
def test_get_places_with_auth():
    # First login to get token
    login_response = client.post("/api/v1/auth/login", json={
        "email": "owner@example.com",
        "password": "password123"
    })
    token = login_response.json()["access_token"]
    
    # Use token for protected endpoint
    response = client.get(
        "/api/v1/owner/places/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```

## API Documentation

### Automatic Documentation

FastAPI automatically generates API documentation:

- **Swagger UI**: `http://localhost:5001/api/v1/docs`
- **ReDoc**: `http://localhost:5001/api/v1/redoc`
- **OpenAPI JSON**: `http://localhost:5001/api/v1/openapi.json`

### Adding Documentation

#### Endpoint Documentation
```python
@router.post(
    "/",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new place",
    description="Create a new business place with the provided information",
    response_description="The created place information"
)
async def create_place(
    place_data: BusinessCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new place.
    
    - **name**: Place name (required)
    - **sector**: Business sector (required)
    - **description**: Place description (optional)
    - **address**: Physical address (optional)
    - **city**: City name (optional)
    - **postal_code**: Postal code (optional)
    - **phone**: Contact phone (optional)
    - **email**: Contact email (optional)
    - **location_type**: "fixed" or "mobile" (default: "fixed")
    - **booking_enabled**: Enable booking (default: true)
    - **call_enabled**: Enable call feature (default: true)
    - **message_enabled**: Enable messaging (default: true)
    - **rewards_enabled**: Enable rewards (default: false)
    - **reviews_enabled**: Enable reviews (default: true)
    - **customers_enabled**: Enable customer management (default: false)
    - **service_areas**: List of service areas for mobile places (optional)
    """
    # Implementation
    pass
```

## Environment Configuration

### Development Environment

```bash
# .env
DATABASE_URL=postgresql+asyncpg://carloslarramba@localhost:5432/linkuup_db
SECRET_KEY=your-development-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Production Environment

```bash
# .env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/linkuup_db
SECRET_KEY=your-production-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
BACKEND_CORS_ORIGINS=["https://yourdomain.com"]
```

## Debugging

### Logging

```python
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use in endpoints
@router.post("/")
async def create_item(item_data: ItemCreate):
    logger.info(f"Creating item: {item_data.name}")
    # Implementation
    pass
```

### Debug Mode

```python
# main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,  # Enable auto-reload
        log_level="debug"  # Enable debug logging
    )
```

## Performance Optimization

### Database Optimization

1. **Use indexes** on frequently queried columns
2. **Use select_related** for related data
3. **Implement pagination** for large datasets
4. **Use connection pooling**

### API Optimization

1. **Use async/await** for I/O operations
2. **Implement caching** for frequently accessed data
3. **Use compression** for large responses
4. **Implement rate limiting**

## Deployment

### Local Development

```bash
# Start development server
./start.sh

# Or manually
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

### Production Deployment

```bash
# Start production server
./start_production.sh

# Or manually
uvicorn main:app --host 0.0.0.0 --port 5001 --workers 4 --loop uvloop
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]
```

## Best Practices

### Code Organization

1. **Separate concerns**: Models, schemas, and endpoints in different files
2. **Use dependency injection**: Leverage FastAPI's dependency system
3. **Validate input**: Use Pydantic for automatic validation
4. **Handle errors gracefully**: Use proper HTTP status codes

### Security

1. **Validate all inputs**: Use Pydantic schemas
2. **Use HTTPS in production**: Always encrypt traffic
3. **Implement rate limiting**: Prevent abuse
4. **Sanitize database queries**: Use SQLAlchemy ORM

### Performance

1. **Use async/await**: For I/O operations
2. **Implement caching**: For frequently accessed data
3. **Optimize database queries**: Use proper indexes
4. **Monitor performance**: Use logging and metrics

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check DATABASE_URL format
2. **Import errors**: Ensure all dependencies are installed
3. **Authentication errors**: Verify JWT secret key
4. **CORS errors**: Check BACKEND_CORS_ORIGINS configuration

### Getting Help

1. **Check logs**: Look for error messages in console
2. **Use API docs**: Test endpoints with Swagger UI
3. **Check database**: Verify tables and data
4. **Review configuration**: Ensure all environment variables are set
