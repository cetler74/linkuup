from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import date

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.place_existing import Place, PlaceEmployee, PlaceEmployeeTimeOff
from models.user import User

router = APIRouter()

def _ensure_place_and_employee(place, employee, place_id):
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    if not employee or employee.place_id != place_id:
        raise HTTPException(status_code=404, detail="Employee not found in this place")

@router.get("/places/{place_id}/employees/{employee_id}/time-off")
async def list_place_employee_time_off(
    place_id: int,
    employee_id: int,
    status_filter: Optional[str] = Query(None, regex="^(pending|approved|rejected|cancelled)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    emp_res = await db.execute(select(PlaceEmployee).where(PlaceEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_place_and_employee(place, employee, place_id)

    query = select(PlaceEmployeeTimeOff).where(PlaceEmployeeTimeOff.employee_id == employee_id, PlaceEmployeeTimeOff.place_id == place_id)
    if status_filter:
        query = query.where(PlaceEmployeeTimeOff.status == status_filter)
    res = await db.execute(query)
    items = res.scalars().all()
    return [
        {
            "id": i.id,
            "employee_id": i.employee_id,
            "place_id": i.place_id,
            "time_off_type": i.time_off_type,
            "start_date": i.start_date,
            "end_date": i.end_date,
            "is_full_day": i.is_full_day,
            "half_day_period": i.half_day_period,
            "is_recurring": i.is_recurring,
            "recurrence_pattern": i.recurrence_pattern,
            "status": i.status,
            "notes": i.notes,
            "created_at": i.created_at,
            "updated_at": i.updated_at,
        }
        for i in items
    ]

@router.post("/places/{place_id}/employees/{employee_id}/time-off", status_code=status.HTTP_201_CREATED)
async def create_place_employee_time_off(
    place_id: int,
    employee_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    emp_res = await db.execute(select(PlaceEmployee).where(PlaceEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_place_and_employee(place, employee, place_id)

    try:
        start = date.fromisoformat(data["start_date"]) if isinstance(data.get("start_date"), str) else data.get("start_date")
        end = date.fromisoformat(data["end_date"]) if isinstance(data.get("end_date"), str) else data.get("end_date")
        if not start or not end:
            raise HTTPException(status_code=400, detail="start_date and end_date are required")
        if end < start:
            raise HTTPException(status_code=400, detail="end_date must be on/after start_date")

        is_full_day = bool(data.get("is_full_day", True))
        half_day_period = data.get("half_day_period")
        # Enforce DB constraint: when full day, half_day_period must be null
        if is_full_day:
            half_day_period = None

        item = PlaceEmployeeTimeOff(
            place_id=place_id,
            employee_id=employee_id,
            time_off_type=data.get("time_off_type"),
            start_date=start,
            end_date=end,
            is_full_day=is_full_day,
            half_day_period=half_day_period,
            is_recurring=bool(data.get("is_recurring", False)),
            recurrence_pattern=data.get("recurrence_pattern"),
            status=data.get("status", "approved"),
            notes=data.get("notes"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    try:
        db.add(item)
        await db.commit()
        await db.refresh(item)
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Constraint error: {str(e.orig)}")

    return {"id": item.id}

@router.put("/places/{place_id}/employees/{employee_id}/time-off/{time_off_id}")
async def update_place_employee_time_off(
    place_id: int,
    employee_id: int,
    time_off_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    emp_res = await db.execute(select(PlaceEmployee).where(PlaceEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_place_and_employee(place, employee, place_id)

    res = await db.execute(select(PlaceEmployeeTimeOff).where(PlaceEmployeeTimeOff.id == time_off_id, PlaceEmployeeTimeOff.employee_id == employee_id, PlaceEmployeeTimeOff.place_id == place_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Time-off not found")

    # Apply updates with normalization
    if "start_date" in data:
        item.start_date = date.fromisoformat(data["start_date"]) if isinstance(data["start_date"], str) else data["start_date"]
    if "end_date" in data:
        item.end_date = date.fromisoformat(data["end_date"]) if isinstance(data["end_date"], str) else data["end_date"]
    if item.end_date < item.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on/after start_date")

    if "time_off_type" in data:
        item.time_off_type = data["time_off_type"]
    if "is_full_day" in data:
        item.is_full_day = bool(data["is_full_day"])
    # Enforce half-day consistency
    if item.is_full_day:
        item.half_day_period = None
    else:
        if "half_day_period" in data:
            item.half_day_period = data["half_day_period"]
    if "is_recurring" in data:
        item.is_recurring = bool(data["is_recurring"])
    if "recurrence_pattern" in data:
        item.recurrence_pattern = data["recurrence_pattern"]
    if "status" in data:
        item.status = data["status"]
    if "notes" in data:
        item.notes = data["notes"]

    try:
        await db.commit()
        await db.refresh(item)
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Constraint error: {str(e.orig)}")

    return {"success": True}

@router.delete("/places/{place_id}/employees/{employee_id}/time-off/{time_off_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_place_employee_time_off(
    place_id: int,
    employee_id: int,
    time_off_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    emp_res = await db.execute(select(PlaceEmployee).where(PlaceEmployee.id == employee_id))
    employee = emp_res.scalar_one_or_none()
    _ensure_place_and_employee(place, employee, place_id)

    res = await db.execute(select(PlaceEmployeeTimeOff).where(PlaceEmployeeTimeOff.id == time_off_id, PlaceEmployeeTimeOff.employee_id == employee_id, PlaceEmployeeTimeOff.place_id == place_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Time-off not found")

    await db.delete(item)
    await db.commit()
    return


# List all time-off in a place (optional date range)
@router.get("/places/{place_id}/time-off")
async def list_place_time_off(
    place_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner),
):
    place_res = await db.execute(
        select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True)
    )
    place = place_res.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    filters = [PlaceEmployeeTimeOff.place_id == place_id]
    # Overlap logic: (start_date <= end) AND (end_date >= start)
    if start_date and end_date:
        filters.append(
            and_(PlaceEmployeeTimeOff.start_date <= end_date, PlaceEmployeeTimeOff.end_date >= start_date)
        )
    elif start_date:
        filters.append(PlaceEmployeeTimeOff.end_date >= start_date)
    elif end_date:
        filters.append(PlaceEmployeeTimeOff.start_date <= end_date)

    res = await db.execute(select(PlaceEmployeeTimeOff).where(*filters))
    items = res.scalars().all()
    return [
        {
            "id": i.id,
            "employee_id": i.employee_id,
            "place_id": i.place_id,
            "time_off_type": i.time_off_type,
            "start_date": i.start_date,
            "end_date": i.end_date,
            "is_full_day": i.is_full_day,
            "half_day_period": i.half_day_period,
            "is_recurring": i.is_recurring,
            "recurrence_pattern": i.recurrence_pattern,
            "status": i.status,
            "notes": i.notes,
            "created_at": i.created_at,
            "updated_at": i.updated_at,
        }
        for i in items
    ]


# Calendar view for a place between a date range
@router.get("/places/{place_id}/time-off/calendar")
async def get_place_time_off_calendar(
    place_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner),
):
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be on/after start_date")

    place_res = await db.execute(
        select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True)
    )
    place = place_res.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    # Fetch overlapping time-off in range
    overlap = and_(
        PlaceEmployeeTimeOff.start_date <= end_date,
        PlaceEmployeeTimeOff.end_date >= start_date,
    )
    res = await db.execute(
        select(PlaceEmployeeTimeOff, PlaceEmployee).join(PlaceEmployee, PlaceEmployee.id == PlaceEmployeeTimeOff.employee_id)
        .where(PlaceEmployeeTimeOff.place_id == place_id)
        .where(overlap)
    )
    rows = res.all()

    # Build calendar entries per date
    from datetime import timedelta

    calendar: dict[str, list[dict]] = {}
    for time_off, employee in rows:
        cur = max(time_off.start_date, start_date)
        last = min(time_off.end_date, end_date)
        while cur <= last:
            key = cur.isoformat()
            calendar.setdefault(key, []).append(
                {
                    "time_off_id": time_off.id,
                    "employee_id": time_off.employee_id,
                    "employee_name": getattr(employee, "name", None),
                    "time_off_type": time_off.time_off_type,
                    "is_full_day": time_off.is_full_day,
                    "half_day_period": time_off.half_day_period,
                    "status": time_off.status,
                }
            )
            cur += timedelta(days=1)

    # Return as array of { date, entries }
    return [
        {"date": d, "entries": calendar[d]} for d in sorted(calendar.keys())
    ]

