from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import date

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.business import Business, BusinessEmployee, EmployeeTimeOff
from models.user import User

router = APIRouter()

def _ensure_business_and_employee(db_business, employee, business_id):
    if not db_business:
        raise HTTPException(status_code=404, detail="Business not found")
    if not employee or employee.business_id != business_id:
        raise HTTPException(status_code=404, detail="Employee not found in this business")

@router.get("/businesses/{business_id}/employees/{employee_id}/time-off")
async def list_time_off(
    business_id: int,
    employee_id: int,
    status_filter: Optional[str] = Query(None, regex="^(pending|approved|rejected|cancelled)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    db_business = result.scalar_one_or_none()
    emp_res = await db.execute(select(BusinessEmployee).where(BusinessEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_business_and_employee(db_business, employee, business_id)

    query = select(EmployeeTimeOff).where(EmployeeTimeOff.employee_id == employee_id, EmployeeTimeOff.business_id == business_id)
    if status_filter:
        query = query.where(EmployeeTimeOff.status == status_filter)
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "id": item.id,
            "employee_id": item.employee_id,
            "business_id": item.business_id,
            "time_off_type": item.time_off_type,
            "start_date": item.start_date,
            "end_date": item.end_date,
            "is_full_day": item.is_full_day,
            "half_day_period": item.half_day_period,
            "is_recurring": item.is_recurring,
            "recurrence_pattern": item.recurrence_pattern,
            "status": item.status,
            "notes": item.notes,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        for item in items
    ]

@router.post("/businesses/{business_id}/employees/{employee_id}/time-off", status_code=status.HTTP_201_CREATED)
async def create_time_off(
    business_id: int,
    employee_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    db_business = result.scalar_one_or_none()
    emp_res = await db.execute(select(BusinessEmployee).where(BusinessEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_business_and_employee(db_business, employee, business_id)

    try:
        item = EmployeeTimeOff(
            employee_id=employee_id,
            business_id=business_id,
            time_off_type=data.get("time_off_type"),
            start_date=date.fromisoformat(data["start_date"]) if isinstance(data.get("start_date"), str) else data.get("start_date"),
            end_date=date.fromisoformat(data["end_date"]) if isinstance(data.get("end_date"), str) else data.get("end_date"),
            is_full_day=bool(data.get("is_full_day", True)),
            half_day_period=data.get("half_day_period"),
            is_recurring=bool(data.get("is_recurring", False)),
            recurrence_pattern=data.get("recurrence_pattern"),
            status=data.get("status", "approved"),
            notes=data.get("notes"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id}

@router.put("/businesses/{business_id}/employees/{employee_id}/time-off/{time_off_id}")
async def update_time_off(
    business_id: int,
    employee_id: int,
    time_off_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    db_business = result.scalar_one_or_none()
    emp_res = await db.execute(select(BusinessEmployee).where(BusinessEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_business_and_employee(db_business, employee, business_id)

    res = await db.execute(select(EmployeeTimeOff).where(EmployeeTimeOff.id == time_off_id, EmployeeTimeOff.employee_id == employee_id, EmployeeTimeOff.business_id == business_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Time-off not found")

    for field in ["time_off_type", "is_full_day", "half_day_period", "is_recurring", "recurrence_pattern", "status", "notes"]:
        if field in data:
            setattr(item, field, data[field])
    if "start_date" in data:
        item.start_date = date.fromisoformat(data["start_date"]) if isinstance(data["start_date"], str) else data["start_date"]
    if "end_date" in data:
        item.end_date = date.fromisoformat(data["end_date"]) if isinstance(data["end_date"], str) else data["end_date"]

    await db.commit()
    await db.refresh(item)
    return {"success": True}

@router.delete("/businesses/{business_id}/employees/{employee_id}/time-off/{time_off_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_off(
    business_id: int,
    employee_id: int,
    time_off_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    db_business = result.scalar_one_or_none()
    emp_res = await db.execute(select(BusinessEmployee).where(BusinessEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_business_and_employee(db_business, employee, business_id)

    res = await db.execute(select(EmployeeTimeOff).where(EmployeeTimeOff.id == time_off_id, EmployeeTimeOff.employee_id == employee_id, EmployeeTimeOff.business_id == business_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Time-off not found")

    await db.delete(item)
    await db.commit()
    return


