from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import traceback

from core.config import settings
from models import *
from api.v1 import auth, bookings, campaigns, contact, contact_sales
from api.v1 import billing as billing_api
from api.v1 import stripe_webhook as stripe_webhook_api
from api.v1.owner import (
    places as owner_places, 
    services as owner_services, 
    employees as owner_employees,
    bookings as owner_bookings,
    campaigns as owner_campaigns,
    messages as owner_messages,
    # employee_time_off as owner_employee_time_off,  # Deprecated: replaced by place_employee_time_off
    employee_time_off_business as owner_employee_time_off_business,
    place_employee_time_off as owner_place_employee_time_off,
    closed_periods as owner_closed_periods,
    place_closed_periods as owner_place_closed_periods,
    dashboard as owner_dashboard,
    customers as owner_customers,
    settings as owner_settings,
    user_permissions as owner_user_permissions
)
from api.v1.mobile import (
    places as mobile_places,
    bookings as mobile_bookings,
    sync as mobile_sync,
    images as mobile_images
)
from api.v1.customer import (
    bookings as customer_bookings,
    rewards as customer_rewards
)
from api.v1.employee import time_off as employee_time_off
from api.v1 import places
from api.v1.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS - Must be added FIRST before other middleware
# Use settings from config file (loaded from .env)
cors_origins = settings.cors_origins
if cors_origins == ["*"]:
    # Allow all origins if configured as wildcard
    allow_origins = ["*"]
else:
    # Use specific origins from config
    allow_origins = cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Global exception handler to ensure CORS headers are always sent
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and ensure CORS headers are included"""
    print(f"🔥 Unhandled exception: {type(exc).__name__}: {str(exc)}")
    print(f"🔥 Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])

# Public booking endpoint (backwards compatible)
app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["Public - Bookings"])

# Public campaign endpoints
app.include_router(campaigns.router, prefix=f"{settings.API_V1_STR}/campaigns", tags=["Public - Campaigns"])

# Owner endpoints
app.include_router(owner_places.router, prefix=f"{settings.API_V1_STR}/owner/places", tags=["Owner - Places"])
app.include_router(owner_services.router, prefix=f"{settings.API_V1_STR}/owner/services", tags=["Owner - Services"])
app.include_router(owner_employees.router, prefix=f"{settings.API_V1_STR}/owner/employees", tags=["Owner - Employees"])
app.include_router(owner_bookings.router, prefix=f"{settings.API_V1_STR}/owner/bookings", tags=["Owner - Bookings"])
app.include_router(owner_campaigns.router, prefix=f"{settings.API_V1_STR}/owner/campaigns", tags=["Owner - Campaigns"])
app.include_router(owner_messages.router, prefix=f"{settings.API_V1_STR}/owner/messages", tags=["Owner - Messages"])
# Deprecated stub removed to avoid route conflicts with place-scoped implementation
app.include_router(owner_employee_time_off_business.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - Employee Time-off (Business)"])
app.include_router(owner_place_employee_time_off.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - Employee Time-off (Place)"])
app.include_router(owner_closed_periods.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - Closed Periods"])
app.include_router(owner_place_closed_periods.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - Closed Periods (Place)"])
app.include_router(owner_dashboard.router, prefix=f"{settings.API_V1_STR}/owner/dashboard", tags=["Owner - Dashboard"])
app.include_router(owner_customers.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - Customers"])
app.include_router(owner_settings.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - Settings"])
app.include_router(owner_user_permissions.router, prefix=f"{settings.API_V1_STR}/owner", tags=["Owner - User Permissions"])

# Mobile endpoints
app.include_router(mobile_places.router, prefix=f"{settings.API_V1_STR}/mobile/places", tags=["Mobile - Places"])
app.include_router(mobile_bookings.router, prefix=f"{settings.API_V1_STR}/mobile/bookings", tags=["Mobile - Bookings"])
app.include_router(mobile_sync.router, prefix=f"{settings.API_V1_STR}/mobile/sync", tags=["Mobile - Sync"])
app.include_router(mobile_images.router, prefix=f"{settings.API_V1_STR}/mobile/images", tags=["Mobile - Images"])

# Customer endpoints
app.include_router(customer_bookings.router, prefix=f"{settings.API_V1_STR}/customer/bookings", tags=["Customer - Bookings"])
app.include_router(customer_rewards.router, prefix=f"{settings.API_V1_STR}/customer/rewards", tags=["Customer - Rewards"])

# Employee endpoints
app.include_router(employee_time_off.router, prefix=f"{settings.API_V1_STR}/employee", tags=["Employee - Time-off"])

# Public endpoints
app.include_router(places.router, prefix=f"{settings.API_V1_STR}/places", tags=["Public - Places"])
app.include_router(contact.router, prefix=f"{settings.API_V1_STR}/contact", tags=["Public - Contact"])
app.include_router(contact_sales.router, prefix=f"{settings.API_V1_STR}/contact-sales", tags=["Public - Contact Sales"])

# Billing endpoints
app.include_router(billing_api.router, prefix=f"{settings.API_V1_STR}/billing", tags=["Billing"])

# Stripe webhook endpoint
app.include_router(stripe_webhook_api.router, prefix=f"{settings.API_V1_STR}/stripe", tags=["Stripe Webhook"])

# Admin endpoints
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin - Platform Management"])

# Subscription endpoints
from api.v1.subscriptions import router as subscriptions_router
app.include_router(subscriptions_router, prefix=f"{settings.API_V1_STR}/subscriptions", tags=["Subscriptions"])

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}

@app.get("/api/placeholder/{width}/{height}")
async def placeholder_image(width: int, height: int):
    """Generate a simple placeholder image"""
    from PIL import Image, ImageDraw
    import io
    
    # Create a simple placeholder image
    img = Image.new('RGB', (width, height), color='#f3f4f6')
    draw = ImageDraw.Draw(img)
    
    # Add some text
    text = f"{width}x{height}"
    # Calculate text position (centered)
    bbox = draw.textbbox((0, 0), text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    draw.text((x, y), text, fill='#9ca3af')
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    from fastapi.responses import Response
    return Response(content=img_bytes.getvalue(), media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
