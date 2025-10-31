from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import date

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.place_existing import Place, PlaceClosedPeriod
from models.user import User

router = APIRouter()

@router.get("/places/{place_id}/closed-periods")
async def list_place_closed_periods(
    place_id: int,
    status_filter: Optional[str] = Query(None, regex="^(active|inactive)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    query = select(PlaceClosedPeriod).where(PlaceClosedPeriod.place_id == place_id)
    if status_filter:
        query = query.where(PlaceClosedPeriod.status == status_filter)
    res = await db.execute(query)
    items = res.scalars().all()
    return [
        {
            "id": i.id,
            "place_id": i.place_id,
            "name": i.name,
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

@router.post("/places/{place_id}/closed-periods", status_code=status.HTTP_201_CREATED)
async def create_place_closed_period(
    place_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    try:
        start = date.fromisoformat(data["start_date"]) if isinstance(data.get("start_date"), str) else data.get("start_date")
        end = date.fromisoformat(data["end_date"]) if isinstance(data.get("end_date"), str) else data.get("end_date")
        if not start or not end:
            raise HTTPException(status_code=400, detail="start_date and end_date are required")
        if end < start:
            raise HTTPException(status_code=400, detail="end_date must be on/after start_date")

        is_full_day = bool(data.get("is_full_day", True))
        half_day_period = data.get("half_day_period")
        if is_full_day:
            half_day_period = None

        item = PlaceClosedPeriod(
            place_id=place_id,
            name=data.get("name"),
            start_date=start,
            end_date=end,
            is_full_day=is_full_day,
            half_day_period=half_day_period,
            is_recurring=bool(data.get("is_recurring", False)),
            recurrence_pattern=data.get("recurrence_pattern"),
            status=data.get("status", "active"),
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

@router.put("/places/{place_id}/closed-periods/{closed_period_id}")
async def update_place_closed_period(
    place_id: int,
    closed_period_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    res = await db.execute(select(PlaceClosedPeriod).where(PlaceClosedPeriod.id == closed_period_id, PlaceClosedPeriod.place_id == place_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Closed period not found")

    if "start_date" in data:
        item.start_date = date.fromisoformat(data["start_date"]) if isinstance(data["start_date"], str) else data["start_date"]
    if "end_date" in data:
        item.end_date = date.fromisoformat(data["end_date"]) if isinstance(data["end_date"], str) else data["end_date"]
    if item.end_date < item.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on/after start_date")

    if "name" in data:
        item.name = data["name"]
    if "is_full_day" in data:
        item.is_full_day = bool(data["is_full_day"])
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

@router.delete("/places/{place_id}/closed-periods/{closed_period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_place_closed_period(
    place_id: int,
    closed_period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    place_res = await db.execute(select(Place).where(Place.id == place_id, Place.owner_id == current_user.id, Place.is_active == True))
    place = place_res.scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    res = await db.execute(select(PlaceClosedPeriod).where(PlaceClosedPeriod.id == closed_period_id, PlaceClosedPeriod.place_id == place_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Closed period not found")

    await db.delete(item)
    await db.commit()
    return


