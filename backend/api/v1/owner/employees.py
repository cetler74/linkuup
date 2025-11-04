from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy import func
from typing import List
from PIL import Image
import io
import os
import time
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from services.feature_access import has_feature, get_limit
from models.user import User
from models.place_existing import Place, PlaceEmployee, PlaceService, Service, EmployeeService
from schemas.place_employee import PlaceEmployeeCreate, PlaceEmployeeUpdate, PlaceEmployeeResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@router.get("/places/{place_id}/employees", response_model=List[PlaceEmployeeResponse])
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_employees(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all employees for a specific place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get employees
    result = await db.execute(
        select(PlaceEmployee).where(
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True
        )
    )
    employees = result.scalars().all()
    
    return [
        PlaceEmployeeResponse(
            id=employee.id,
            place_id=employee.place_id,
            name=employee.name,
            email=employee.email,
            phone=employee.phone,
            role=employee.role,
            specialty=employee.specialty,
            color_code=employee.color_code,
            photo_url=employee.photo_url,
            is_active=employee.is_active,
            working_hours=employee.get_working_hours(),
            created_at=employee.created_at,
            updated_at=employee.updated_at
        )
        for employee in employees
    ]

@router.post("/places/{place_id}/employees", response_model=PlaceEmployeeResponse, status_code=status.HTTP_201_CREATED)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def create_employee(
    place_id: int,
    employee_data: PlaceEmployeeCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Create a new employee for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Feature gating: employees feature and limit
    # Employees is a basic feature - always available, but check for limits
    # Get limit from subscription, or use default "basic" plan limit if no subscription exists
    limit = await get_limit(db, current_user.id, place_id, "employees")
    
    # If no subscription exists, try to ensure one exists or use default basic plan limit
    if limit is None:
        from models.subscription import Plan, UserPlaceSubscription, SubscriptionStatusEnum
        from datetime import datetime, timedelta, timezone
        
        # Try to create a subscription with basic plan if it doesn't exist
        sub_result = await db.execute(
            select(UserPlaceSubscription).where(
                UserPlaceSubscription.user_id == current_user.id,
                UserPlaceSubscription.place_id == place_id,
                UserPlaceSubscription.status.in_([SubscriptionStatusEnum.TRIALING, SubscriptionStatusEnum.ACTIVE])
            )
        )
        existing_sub = sub_result.scalar_one_or_none()
        
        if not existing_sub:
            # Get basic plan
            plan_result = await db.execute(select(Plan).where(Plan.code == "basic", Plan.is_active == True))
            basic_plan = plan_result.scalar_one_or_none()
            
            if basic_plan:
                # Create subscription with basic plan
                now = datetime.now(timezone.utc)
                trial_end = now + timedelta(days=basic_plan.trial_days or 14)
                sub = UserPlaceSubscription(
                    user_id=current_user.id,
                    place_id=place_id,
                    plan_id=basic_plan.id,
                    status=SubscriptionStatusEnum.TRIALING,
                    trial_start_at=now,
                    trial_end_at=trial_end,
                    current_period_start=now,
                    current_period_end=trial_end,
                )
                db.add(sub)
                await db.commit()
                
                # Now get the limit again
                limit = await get_limit(db, current_user.id, place_id, "employees")
        
        # If still no limit, use default basic plan limit (2 employees)
        if limit is None:
            limit = 2  # Default basic plan limit
    
    # Enforce limit validation
    if limit is not None:
        # Count only active employees for limit validation
        count_res = await db.execute(
            select(func.count(PlaceEmployee.id)).where(
                PlaceEmployee.place_id == place_id,
                PlaceEmployee.is_active == True
            )
        )
        current_count = count_res.scalar() or 0
        if current_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"limit_reached: employees current={current_count} limit={limit}"
            )
    
    # Create new employee
    employee = PlaceEmployee(
        place_id=place_id,
        name=employee_data.name,
        email=employee_data.email,
        phone=employee_data.phone,
        role=employee_data.role,
        specialty=employee_data.specialty,
        color_code=employee_data.color_code,
        photo_url=employee_data.photo_url,
        is_active=True
    )
    
    # Set working hours - use provided hours or default
    if employee_data.working_hours:
        employee.set_working_hours(employee_data.working_hours)
    else:
        # Set default working hours: Monday to Friday 09:00 to 18:00
        default_hours = {
            "monday": {"available": True, "start": "09:00", "end": "18:00"},
            "tuesday": {"available": True, "start": "09:00", "end": "18:00"},
            "wednesday": {"available": True, "start": "09:00", "end": "18:00"},
            "thursday": {"available": True, "start": "09:00", "end": "18:00"},
            "friday": {"available": True, "start": "09:00", "end": "18:00"},
            "saturday": {"available": False},
            "sunday": {"available": False}
        }
        employee.set_working_hours(default_hours)
    
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    
    return PlaceEmployeeResponse(
        id=employee.id,
        place_id=employee.place_id,
        name=employee.name,
        email=employee.email,
        phone=employee.phone,
        role=employee.role,
        specialty=employee.specialty,
        color_code=employee.color_code,
        photo_url=employee.photo_url,
        is_active=employee.is_active,
        working_hours=employee.get_working_hours(),
        created_at=employee.created_at,
        updated_at=employee.updated_at
    )

@router.get("/{employee_id}", response_model=PlaceEmployeeResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific employee"""
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    return PlaceEmployeeResponse(
        id=employee.id,
        place_id=employee.place_id,
        name=employee.name,
        email=employee.email,
        phone=employee.phone,
        role=employee.role,
        specialty=employee.specialty,
        color_code=employee.color_code,
        photo_url=employee.photo_url,
        is_active=employee.is_active,
        working_hours=employee.get_working_hours(),
        created_at=employee.created_at,
        updated_at=employee.updated_at
    )

@router.put("/{employee_id}", response_model=PlaceEmployeeResponse)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def update_employee(
    employee_id: int,
    employee_data: PlaceEmployeeUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update an employee"""
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = employee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "working_hours" and value is not None:
            employee.set_working_hours(value)
        elif hasattr(employee, field):
            setattr(employee, field, value)
    
    await db.commit()
    await db.refresh(employee)
    
    return PlaceEmployeeResponse(
        id=employee.id,
        place_id=employee.place_id,
        name=employee.name,
        email=employee.email,
        phone=employee.phone,
        role=employee.role,
        specialty=employee.specialty,
        color_code=employee.color_code,
        photo_url=employee.photo_url,
        is_active=employee.is_active,
        working_hours=employee.get_working_hours(),
        created_at=employee.created_at,
        updated_at=employee.updated_at
    )

@router.delete("/{employee_id}")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def delete_employee(
    employee_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete an employee (soft delete by setting is_active=False)"""
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    employee.is_active = False
    await db.commit()
    
    return {"message": "Employee deleted successfully"}

@router.put("/{employee_id}/hours", response_model=PlaceEmployeeResponse)
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def update_employee_working_hours(
    employee_id: int,
    hours_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update employee working hours"""
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update working hours
    employee.set_working_hours(hours_data)
    await db.commit()
    await db.refresh(employee)
    
    return PlaceEmployeeResponse(
        id=employee.id,
        place_id=employee.place_id,
        name=employee.name,
        email=employee.email,
        phone=employee.phone,
        role=employee.role,
        specialty=employee.specialty,
        color_code=employee.color_code,
        photo_url=employee.photo_url,
        is_active=employee.is_active,
        working_hours=employee.get_working_hours(),
        created_at=employee.created_at,
        updated_at=employee.updated_at
    )

@router.get("/places/{place_id}/employees/schedule")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_place_employee_schedule(
    place_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all employees with their working hours for a place"""
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get employees with working hours
    result = await db.execute(
        select(PlaceEmployee).where(
            PlaceEmployee.place_id == place_id,
            PlaceEmployee.is_active == True
        )
    )
    employees = result.scalars().all()
    
    schedule_data = []
    for employee in employees:
        schedule_data.append({
            "employee_id": employee.id,
            "name": employee.name,
            "role": employee.role,
            "working_hours": employee.get_working_hours(),
            "is_active": employee.is_active
        })
    
    return {
        "place_id": place_id,
        "employees": schedule_data
    }

@router.post("/{employee_id}/services")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def assign_services_to_employee(
    employee_id: int,
    services_data: dict,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Assign services to an employee"""
    if "service_ids" not in services_data:
        raise HTTPException(status_code=400, detail="Service IDs are required")
    
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify that all services belong to the place
    service_ids = services_data["service_ids"]
    if service_ids:
        result = await db.execute(
            select(PlaceService).where(
                PlaceService.place_id == place.id,
                PlaceService.service_id.in_(service_ids)
            )
        )
        place_services = result.scalars().all()
        if len(place_services) != len(service_ids):
            raise HTTPException(status_code=400, detail="One or more services not found for this place")
    
    # Remove existing service assignments
    await db.execute(
        delete(EmployeeService).where(EmployeeService.employee_id == employee_id)
    )
    
    # Add new service assignments
    for service_id in service_ids:
        employee_service = EmployeeService(
            employee_id=employee_id,
            service_id=service_id
        )
        db.add(employee_service)
    
    await db.commit()
    
    return {"message": f"Services assigned to employee {employee_id} successfully", "services": service_ids}

@router.get("/{employee_id}/services")
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_employee_services(
    employee_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get services assigned to an employee"""
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get service details for assigned services using junction table
    result = await db.execute(
        select(Service, PlaceService, EmployeeService)
        .join(EmployeeService, Service.id == EmployeeService.service_id)
        .join(PlaceService, Service.id == PlaceService.service_id)
        .where(
            EmployeeService.employee_id == employee_id,
            PlaceService.place_id == place.id
        )
    )
    service_records = result.all()
    
    services = [
        {
            "id": service.id,
            "name": service.name,
            "category": service.category,
            "description": service.description,
            "price": place_service.price,
            "duration": place_service.duration,
            "is_bio_diamond": service.is_bio_diamond,
            "is_available": place_service.is_available
        }
        for service, place_service, employee_service in service_records
    ]
    
    return {"services": services}


@router.post("/{employee_id}/photo")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def upload_employee_photo(
    employee_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Upload photo for an employee"""
    
    # Get employee and verify ownership
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    try:
        # Open image with PIL
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        else:
            image = image.convert('RGB')
        
        # Resize image to optimal size for employee photos (300x300)
        image.thumbnail((300, 300), Image.Resampling.LANCZOS)
        
        # Save processed image
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='JPEG', quality=90, optimize=True)
        processed_content = output_buffer.getvalue()
        
        # Generate filename
        filename = f"employee_{employee_id}_{int(time.time())}.jpg"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(processed_content)
        
        # Update employee record with photo URL (use relative URL for frontend compatibility)
        photo_url = f"/api/v1/mobile/images/{filename}"
        employee.photo_url = photo_url
        # Bump updated_at so clients can cache-bust
        try:
            employee.updated_at = func.current_timestamp()
        except Exception:
            pass
        await db.commit()
        await db.refresh(employee)
        
        return {
            "message": "Photo uploaded successfully",
            "photo_url": photo_url,
            "filename": filename,
            "updated_at": str(employee.updated_at) if getattr(employee, 'updated_at', None) else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Photo upload failed: {str(e)}")


@router.delete("/{employee_id}/photo")
# @limiter.limit(settings.RATE_LIMIT_WRITE)
async def delete_employee_photo(
    employee_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete photo for an employee"""
    
    # Get employee and verify ownership
    result = await db.execute(
        select(PlaceEmployee).where(PlaceEmployee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify place ownership
    result = await db.execute(
        select(Place).where(
            Place.id == employee.place_id,
            Place.owner_id == current_user.id,
            Place.is_active == True
        )
    )
    place = result.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Remove photo URL from employee record
    employee.photo_url = None
    await db.commit()
    
    return {"message": "Photo deleted successfully"}
