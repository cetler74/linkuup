# Flask to FastAPI Migration Guide

## Overview

This guide documents the complete migration from Flask to FastAPI for the LinkUup project, including all API endpoints, database connections, and deployment configurations.

## Migration Summary

### What Changed

1. **Framework**: Flask → FastAPI
2. **Database**: Synchronous SQLAlchemy → Async SQLAlchemy with asyncpg
3. **Authentication**: Custom JWT → python-jose with FastAPI OAuth2
4. **Serialization**: Marshmallow → Pydantic (built-in)
5. **Documentation**: Flask-RESTX → Auto-generated OpenAPI/Swagger
6. **Server**: Gunicorn → Uvicorn
7. **Database Name**: linkuup_db

### What Stayed the Same

- PostgreSQL database structure
- Core business logic
- API endpoint functionality
- Rate limiting behavior
- CORS configuration

## API Endpoint Changes

### URL Structure Changes

| Old Flask Endpoint | New FastAPI Endpoint | Notes |
|-------------------|---------------------|-------|
| `/api/health` | `/api/v1/health` | Added versioning |
| `/api/owner/places` | `/api/v1/owner/places` | Added versioning |
| `/api/v1/auth/login` | `/api/v1/auth/login` | Same structure |
| `/api/v1/mobile/salons` | `/api/v1/mobile/salons` | Same structure |

### Authentication Changes

#### Old Flask Authentication
```python
# Flask with custom decorator
@require_auth
def protected_endpoint():
    user = get_current_user()
    # ...
```

#### New FastAPI Authentication
```python
# FastAPI with dependency injection
async def protected_endpoint(
    current_user: User = Depends(get_current_user)
):
    # current_user is automatically injected
    # ...
```

### Request/Response Changes

#### Old Flask Request Handling
```python
# Flask
@app.route('/api/owner/places', methods=['POST'])
@require_auth
def create_place():
    data = request.get_json()
    # Manual validation
    # ...
```

#### New FastAPI Request Handling
```python
# FastAPI
@router.post("/", response_model=BusinessResponse)
async def create_place(
    place_data: BusinessCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    # Automatic validation with Pydantic
    # Automatic serialization
    # ...
```

## Database Changes

### Connection String Changes

#### Old Flask Configuration
```python
# Flask
DATABASE_URL = "postgresql://user:pass@localhost:5432/linkuup_db"
```

#### New FastAPI Configuration
```python
# FastAPI
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/linkuup_db"
```

### Model Changes

#### Old Flask Models
```python
# Flask-SQLAlchemy
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    # ...
```

#### New FastAPI Models
```python
# Async SQLAlchemy
class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    # ...
```

### Query Changes

#### Old Flask Queries
```python
# Synchronous
user = User.query.filter_by(email=email).first()
```

#### New FastAPI Queries
```python
# Asynchronous
result = await db.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()
```

## Frontend Integration Changes

### API Client Updates

#### Old API Calls
```javascript
// Old Flask API calls
const response = await fetch('/api/owner/places', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

#### New API Calls
```javascript
// New FastAPI calls (same structure, but with /api/v1/ prefix)
const response = await fetch('/api/v1/owner/places', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

### Error Handling Changes

#### Old Flask Error Response
```json
{
  "error": "Validation failed",
  "message": "Email is required"
}
```

#### New FastAPI Error Response
```json
{
  "detail": "Email is required"
}
```

## Deployment Changes

### Server Configuration

#### Old Flask Deployment
```bash
# Gunicorn
gunicorn -c gunicorn.conf.py app:app
```

#### New FastAPI Deployment
```bash
# Uvicorn
uvicorn main:app --host 0.0.0.0 --port 5001 --workers 4
```

### Environment Variables

#### Old Flask Environment
```bash
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/linkuup_db
```

#### New FastAPI Environment
```bash
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/linkuup_db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

## Migration Steps

### 1. Update Dependencies

```bash
# Remove old Flask dependencies
pip uninstall flask flask-sqlalchemy flask-cors flask-mail flask-limiter flask-restx marshmallow gunicorn

# Install new FastAPI dependencies
pip install -r requirements.txt
```

### 2. Update Database Connection

1. Update `DATABASE_URL` in environment files
2. Database name is `linkuup_db`
3. Update connection string to use `postgresql+asyncpg://`

### 3. Update API Calls

1. Add `/api/v1/` prefix to all API calls
2. Update error handling for new response format
3. Test all endpoints with new authentication

### 4. Update Deployment

1. Replace Gunicorn with Uvicorn
2. Update process managers (PM2, systemd, etc.)
3. Update nginx configuration if needed

## Testing the Migration

### 1. Health Check
```bash
curl http://localhost:5001/api/v1/health
```

### 2. Authentication Test
```bash
# Register
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","name":"Test User","gdpr_data_processing_consent":true}'

# Login
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 3. Protected Endpoint Test
```bash
# Get user info
curl -X GET http://localhost:5001/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## Rollback Plan

If issues arise, you can rollback by:

1. **Database**: Database name is `linkuup_db`
2. **Code**: Restore Flask files from backup
3. **Dependencies**: Reinstall Flask stack
4. **Deployment**: Switch back to Gunicorn

## Performance Improvements

### Expected Benefits

1. **Async Operations**: 2-3x faster for I/O operations
2. **Auto Documentation**: Built-in Swagger/OpenAPI
3. **Type Safety**: Pydantic validation
4. **Better Error Handling**: Detailed validation errors
5. **Modern Python**: Async/await support

### Monitoring

Monitor these metrics after migration:

- Response times
- Memory usage
- Database connection pool
- Error rates
- Rate limiting effectiveness

## Support

For migration issues:

1. Check FastAPI documentation: https://fastapi.tiangolo.com/
2. Review async SQLAlchemy docs: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
3. Test with API documentation at `/api/v1/docs`
4. Check logs for detailed error messages
